import words from 'an-array-of-english-words';

const dictionary: Set<string> = new Set(words);

export function isValidWord(word: string): boolean {
  return dictionary.has(word.toLowerCase());
}

export function isDictionaryLoaded(): boolean {
  return dictionary.size > 0;
}
