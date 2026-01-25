import type { WordResult } from '../types/game';
import { getDailyNumber } from './seededRandom';

export function generateShareText(
  score: number,
  wordResults: WordResult[],
  streakBonus: number,
  themeName?: string
): string {
  const dailyNum = getDailyNumber();
  let shareText = `DSCRMBL Daily #${dailyNum}\n`;

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

  shareText += `\nPlay at: ${window.location.href}`;

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
