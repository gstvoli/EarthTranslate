export type Settings = {
  globalShortcut: string;
  translateShortcut: string;
  copyShortcut: string;
  hideShortcut: string;
  targetLanguage: string;
  endpoint: string;
};

export type TranslationResponse = {
  translatedText: string;
  detectedLanguage?: string;
};

export const defaultSettings: Settings = {
  globalShortcut: "Ctrl+Alt+T",
  translateShortcut: "Ctrl+Enter",
  copyShortcut: "Ctrl+Shift+C",
  hideShortcut: "Escape",
  targetLanguage: "pt",
  endpoint: "https://libretranslate.com/translate",
};
