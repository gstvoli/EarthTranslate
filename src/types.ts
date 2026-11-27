export type TranslationProvider = "mymemory" | "libretranslate" | "googlecloud";

export const providerDefaultEndpoints: Record<TranslationProvider, string> = {
  mymemory: "https://api.mymemory.translated.net/get",
  libretranslate: "https://libretranslate.com/translate",
  googlecloud: "https://translation.googleapis.com/language/translate/v2",
};

export type Settings = {
  globalShortcut: string;
  quickTranslateShortcut: string;
  translateShortcut: string;
  copyShortcut: string;
  hideShortcut: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: TranslationProvider;
  endpoint: string;
};

export type TranslationResponse = {
  translatedText: string;
  detectedLanguage?: string;
  alternativeTranslations: string[];
  moreTranslations: string[];
};

export type AppMetadata = {
  version: string;
  commit: string;
  commitDate: string;
  installedOnWindows: boolean;
};

export const defaultSettings: Settings = {
  globalShortcut: "Ctrl+Alt+T",
  quickTranslateShortcut: "Ctrl+Alt+Q",
  translateShortcut: "Ctrl+Enter",
  copyShortcut: "Ctrl+Shift+C",
  hideShortcut: "Escape",
  sourceLanguage: "auto",
  targetLanguage: "pt",
  provider: "mymemory",
  endpoint: providerDefaultEndpoints.mymemory,
};
