declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

export const initializeGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId || measurementId === 'G-XXXXXXXXXX') {
    console.warn('Google Analytics Measurement ID not configured');
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId);
};

export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

export const trackGameEvent = {
  gameStart: (difficulty?: string) => {
    trackEvent('game_start', { difficulty });
  },

  gameComplete: (score: number, time: number, attempts: number) => {
    trackEvent('game_complete', {
      score,
      time_seconds: time,
      attempts,
    });
  },

  wordGuessed: (word: string, attempts: number, isCorrect: boolean) => {
    trackEvent('word_guessed', {
      word_length: word.length,
      attempts,
      is_correct: isCorrect,
    });
  },

  settingsChanged: (setting: string, value: unknown) => {
    trackEvent('settings_changed', {
      setting_name: setting,
      setting_value: value,
    });
  },

  shareScore: (platform?: string) => {
    trackEvent('share_score', { platform });
  },
};
