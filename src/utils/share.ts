import type { WordResult } from '../types/game';

export function generateShareText(
  dailyNumber: number,
  score: number,
  wordResults: WordResult[],
  streakBonus: number,
  themeName?: string
): string {
  let shareText = `DSCRMBL Daily #${dailyNumber}\n`;

  // Add theme name on its own line if provided
  if (themeName) {
    shareText += `${themeName}\n`;
  }

  shareText += `Score: ${score}\n`;

  // Generate emoji row for word results
  let emojiRow = '';
  for (let i = 0; i < 5; i++) {
    const result = wordResults[i];
    if (result?.solved) {
      emojiRow += String.fromCodePoint(0x1F7E9); // green square
    } else {
      emojiRow += String.fromCodePoint(0x1F7E5); // red square
    }
  }
  shareText += emojiRow + '\n';

  // Add streak bonus if applicable
  if (streakBonus > 0) {
    shareText += `${String.fromCodePoint(0x1F525)} Best Streak Bonus: +${streakBonus}\n`;
  }

  return shareText;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    console.error('Failed to copy to clipboard');
    return false;
  }
}

export function isMobileDevice(): boolean {
  // Check if device is mobile based on user agent and touch support
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return isMobileUA || (hasTouchScreen && window.innerWidth < 1024);
}

export function canUseWebShare(): boolean {
  return !!navigator.share && isMobileDevice();
}

export async function shareViaWeb(text: string, title?: string): Promise<boolean> {
  try {
    if (!navigator.share) {
      return false;
    }

    // Include title in text content for consistency across platforms/apps
    const fullText = title ? `${title}\n${text}` : text;

    await navigator.share({
      title: title,
      text: fullText
    });

    return true;
  } catch (err) {
    // User cancelled the share or error occurred
    if (err instanceof Error && err.name === 'AbortError') {
      // User cancelled - this is not an error
      return false;
    }
    console.error('Failed to share:', err);
    return false;
  }
}
