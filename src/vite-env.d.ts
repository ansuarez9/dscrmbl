/// <reference types="vite/client" />

declare module 'an-array-of-english-words' {
  const words: string[];
  export default words;
}

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
