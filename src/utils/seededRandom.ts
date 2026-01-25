import { words, categorizeWordsByLength } from './words';

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getDailyNumber(): number {
  const startDate = new Date('2024-01-01');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getDailyWords(): string[] {
  const today = new Date().toDateString();
  const seed = hashCode(today);
  const wordsByLength = categorizeWordsByLength([...words]);
  const dailyWords: string[] = [];

  const categories = [
    wordsByLength.short,
    wordsByLength.medium,
    wordsByLength.mediumLong,
    wordsByLength.long,
    wordsByLength.veryLong
  ];

  for (let i = 0; i < 5; i++) {
    const category = categories[i];
    if (category.length > 0) {
      const idx = Math.floor(seededRandom(seed + i) * category.length);
      dailyWords.push(category[idx]);
    } else {
      const idx = Math.floor(seededRandom(seed + i) * words.length);
      dailyWords.push(words[idx]);
    }
  }

  return dailyWords;
}

export function getTimeUntilNextDay(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diff = tomorrow.getTime() - now.getTime();

  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  };
}
