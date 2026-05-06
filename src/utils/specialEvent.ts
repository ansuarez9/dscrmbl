const SPECIAL_EVENT_EMOJI: Record<string, string> = {
  'Apollo 11 Anniversary': '🚀',
  'Bastille Day': '🇫🇷',
  'Canada Day': '🇨🇦',
  'Cinco de Mayo': '🇲🇽',
  'D-Day Anniversary': '🎖️',
  "Father's Day": '👔',
  'FIFA World Cup 2026 Opens': '⚽',
  'FIFA World Cup Final': '🏆',
  'Flag Day': '🚩',
  'Independence Day': '🎆',
  'Juneteenth': '✊',
  'Memorial Day': '🎗️',
  "Mother's Day": '💐',
  'Star Wars Day': '⭐',
  "Women's Equality Day": '♀️',
};

export function getSpecialEventEmoji(event: string): string {
  return SPECIAL_EVENT_EMOJI[event] ?? '★';
}
