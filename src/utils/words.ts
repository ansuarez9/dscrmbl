export const words = [
  'hello', 'blue', 'estelle', 'anniversary', 'ring', 'wedding', 'honey', 'john', 'horse', 'mouse', 'house',
  'train', 'appropriate', 'architecture', 'world', 'moon', 'poetry', 'microsoft', 'apple', 'saving', 'document',
  'output', 'listening', 'created', 'soccer', 'jamestown', 'district', 'rivalry', 'arlington', 'california',
  'handle', 'situation', 'price', 'grimace', 'submitted', 'university', 'brain', 'power', 'wisely', 'proud',
  'tortoise', 'turkish', 'cloudy', 'zebra', 'zombie', 'kansas', 'mathematical', 'typewriter', 'sprout', 'traveling',
  'alive', 'alien', 'toils', 'cranes', 'bratty', 'childish', 'orange', 'steelblue', 'jupiter', 'graciously', 'feverishly',
  'brackets', 'transitioning', 'incorrect', 'weeding', 'string', 'marissa', 'roberto', 'football', 'baseball', 'tennis',
  'hockey', 'basketball', 'elements', 'agriculture', 'keyboard', 'guitar', 'classical', 'theft', 'washington', 'amsterdam',
  'europe', 'saturn', 'submit', 'zoology', 'theoretical', 'spices', 'traitor', 'privately', 'scrabble', 'drafts', 'hamster',
  'hipster', 'finish', 'guessing', 'username', 'password', 'middle', 'large', 'extras', 'smaller', 'stratosphere', 'grounded',
  'mustache', 'corollary', 'ivory', 'scanners', 'scalpers', 'ticketmaster', 'immunodeficiency', 'scientology', 'grove', 'path',
  'shooters', 'spaniards', 'wordle', 'descramble', 'decoding', 'jeremiah', 'alice', 'andrew', 'javier', 'greenery',
  'rejuvenation', 'prisoners'
];

export interface WordsByLength {
  short: string[];
  medium: string[];
  mediumLong: string[];
  long: string[];
  veryLong: string[];
}

export function categorizeWordsByLength(wordList: string[]): WordsByLength {
  return {
    short: wordList.filter(w => w.length >= 4 && w.length <= 5),
    medium: wordList.filter(w => w.length >= 5 && w.length <= 6),
    mediumLong: wordList.filter(w => w.length >= 6 && w.length <= 7),
    long: wordList.filter(w => w.length >= 7 && w.length <= 8),
    veryLong: wordList.filter(w => w.length >= 8)
  };
}
