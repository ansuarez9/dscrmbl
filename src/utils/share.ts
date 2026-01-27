import type { WordResult } from '../types/game';

export function generateShareText(
  score: number,
  wordResults: WordResult[],
  streakBonus: number,
  themeName?: string
): string {
  let shareText = '';

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

export async function copyToClipboard(text: string, title: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(title + '\n' + text);
    return true;
  } catch {
    console.error('Failed to copy to clipboard');
    return false;
  }
}

export function canUseWebShare(): boolean {
  return !!navigator.share;
}

export async function shareViaWeb(text: string, title?: string): Promise<boolean> {
  try {
    if (!navigator.share) {
      return false;
    }

    await navigator.share({
      title: title,
      text: text
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
