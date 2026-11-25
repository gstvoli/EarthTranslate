import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  matchesShortcut,
  shortcutFromEvent,
  validateShortcutConfiguration,
} from "./lib/shortcuts";
import {
  defaultSettings,
  providerDefaultEndpoints,
  Settings,
  TranslationProvider,
  TranslationResponse,
} from "./types";

const settingsKey = "earthtranslate.settings";
type Layout = "standard" | "compact";

function loadSettings(): Settings {
  try {
    const storedSettings = JSON.parse(localStorage.getItem(settingsKey) ?? "{}") as Partial<Settings>;
    if (!storedSettings.provider) {
      return {
        ...defaultSettings,
        ...storedSettings,
        provider: "mymemory",
        endpoint: providerDefaultEndpoints.mymemory,
      };
    }
    return { ...defaultSettings, ...storedSettings };
  } catch {
    return defaultSettings;
  }
}

function ShortcutInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (shortcut: string) => void;
  label: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="shortcut-input"
        value={value}
        readOnly
        aria-label={label}
        onKeyDown={(event) => {
          event.preventDefault();
          const shortcut = shortcutFromEvent(event);
          if (shortcut && shortcut !== "Escape") onChange(shortcut);
        }}
      />
    </label>
  );
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [draftSettings, setDraftSettings] = useState<Settings>(settings);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string>();
  const [alternativeTranslations, setAlternativeTranslations] = useState<string[]>([]);
  const [moreTranslations, setMoreTranslations] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [layout, setLayout] = useState<Layout>("standard");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void invoke<Pick<Settings, "globalShortcut" | "quickTranslateShortcut">>("get_shortcut_settings")
      .then((shortcuts) => {
        setSettings((current) => ({ ...current, ...shortcuts }));
      })
      .catch((reason) => {
        setError(`Não foi possível carregar os atalhos globais: ${String(reason)}`);
      });
  }, []);

  useEffect(() => {
    const focusInput = () => {
      if (layout === "compact") {
        quickInputRef.current?.focus();
      } else {
        textAreaRef.current?.focus();
      }
    };
    window.addEventListener("focus", focusInput);
    focusInput();
    return () => window.removeEventListener("focus", focusInput);
  }, [layout]);

  useEffect(() => {
    const unregisterQuick = listen("earthtranslate:open-quick", () => {
      setLayout("compact");
      setText("");
      setTranslation("");
      setDetectedLanguage(undefined);
      setAlternativeTranslations([]);
      setMoreTranslations([]);
      setError("");
    });
    const unregisterStandard = listen("earthtranslate:open-standard", () => {
      setLayout("standard");
    });

    return () => {
      void unregisterQuick.then((unlisten) => unlisten());
      void unregisterStandard.then((unlisten) => unlisten());
    };
  }, []);

  async function translate(event?: FormEvent) {
    event?.preventDefault();
    const content = text.trim();
    if (!content || isTranslating) return;

    setIsTranslating(true);
    setError("");
    setCopyFeedback("");
    try {
      const result = await invoke<TranslationResponse>("translate", {
        request: {
          text: content,
          source: "auto",
          target: settings.targetLanguage,
          provider: settings.provider,
          endpoint: settings.endpoint,
        },
      });
      setTranslation(result.translatedText);
      setDetectedLanguage(result.detectedLanguage);
      setAlternativeTranslations(result.alternativeTranslations);
      setMoreTranslations(result.moreTranslations);
    } catch (reason) {
      setError(`Não foi possível traduzir o texto. ${String(reason)}`);
    } finally {
      setIsTranslating(false);
    }
  }

  async function copyTranslation() {
    if (!translation) return;
    await navigator.clipboard.writeText(translation);
    setCopyFeedback("Tradução copiada.");
  }

  async function hideApplication() {
    await invoke("hide_main_window");
  }

  async function saveSettings() {
    const shortcuts = [
      draftSettings.globalShortcut,
      draftSettings.quickTranslateShortcut,
      draftSettings.translateShortcut,
      draftSettings.copyShortcut,
      draftSettings.hideShortcut,
    ];
    const validationError = validateShortcutConfiguration(shortcuts);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await invoke("set_global_shortcuts", {
        globalShortcut: draftSettings.globalShortcut,
        quickTranslateShortcut: draftSettings.quickTranslateShortcut,
      });
      if (apiKeyInput.trim()) {
        await invoke("save_translation_api_key", { apiKey: apiKeyInput.trim() });
      }
      localStorage.setItem(settingsKey, JSON.stringify(draftSettings));
      setSettings(draftSettings);
      setApiKeyInput("");
      setShowSettings(false);
      setError("");
    } catch (reason) {
      setError(`Os atalhos globais não puderam ser salvos: ${String(reason)}`);
    }
  }

  function updateTargetLanguage(targetLanguage: string) {
    const nextSettings = { ...settings, targetLanguage };
    setSettings(nextSettings);
    localStorage.setItem(settingsKey, JSON.stringify(nextSettings));
  }

  function updateProvider(provider: TranslationProvider) {
    setDraftSettings({
      ...draftSettings,
      provider,
      endpoint: providerDefaultEndpoints[provider],
    });
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (matchesShortcut(event, settings.translateShortcut)) {
      event.preventDefault();
      void translate();
    }
    if (matchesShortcut(event, settings.hideShortcut)) {
      event.preventDefault();
      void hideApplication();
    }
  }

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      const keyboardEvent = event as unknown as KeyboardEvent;
      if (matchesShortcut(keyboardEvent, settings.copyShortcut) && translation) {
        event.preventDefault();
        void copyTranslation();
      }
      if (matchesShortcut(keyboardEvent, settings.hideShortcut)) {
        event.preventDefault();
        void hideApplication();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function openSettings() {
    setDraftSettings(settings);
    setApiKeyInput("");
    setShowSettings(true);
  }

  return (
    <main className={`app-shell ${layout === "compact" ? "compact-mode" : ""}`}>
      {layout === "compact" ? (
        <section className="compact-translator">
          <header className="compact-topbar">
            <p className="eyebrow">TRADUÇÃO RÁPIDA</p>
            <button className="icon-button" type="button" aria-label="Abrir configurações" onClick={openSettings}>⚙</button>
          </header>
          <form onSubmit={translate}>
            <div className="compact-entry">
              <input
                ref={quickInputRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleEditorKeyDown}
                placeholder="Digite uma palavra..."
                aria-label="Texto para traduzir"
              />
              <button className="primary-button" type="submit" disabled={!text.trim() || isTranslating}>
                {isTranslating ? "..." : "Traduzir"}
              </button>
            </div>
          </form>
          <div className="compact-result">
            <output>{translation || error || "A tradução aparecerá aqui."}</output>
            {alternativeTranslations.length > 0 && (
              <p className="compact-alternatives">Também: {alternativeTranslations.join(" · ")}</p>
            )}
            {translation && (
              <button className="text-button" type="button" onClick={() => void copyTranslation()}>
                Copiar
              </button>
            )}
          </div>
          <footer className="compact-footer">
            <span>{settings.quickTranslateShortcut}</span>
            <button className="link-button" type="button" onClick={() => void hideApplication()}>Ocultar</button>
          </footer>
        </section>
      ) : (
        <>
          <header className="topbar">
            <div>
              <p className="eyebrow">EARTHTRANSLATE</p>
              <h1>Tradução rápida, sem sair do ritmo.</h1>
            </div>
            <button className="icon-button" type="button" aria-label="Abrir configurações" onClick={openSettings}>⚙</button>
          </header>

          <form onSubmit={translate} className="translator">
            <section className="panel input-panel">
              <div className="panel-heading">
                <label htmlFor="source-text">Texto original</label>
                <span>Detectar idioma</span>
              </div>
              <textarea
                id="source-text"
                ref={textAreaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleEditorKeyDown}
                placeholder="Digite ou cole algo para traduzir..."
                spellCheck
              />
              <div className="panel-footer">
                <span>{text.length} caracteres</span>
                <button className="primary-button" type="submit" disabled={!text.trim() || isTranslating}>
                  {isTranslating ? "Traduzindo..." : `Traduzir · ${settings.translateShortcut}`}
                </button>
              </div>
            </section>

            <section className="panel result-panel">
              <div className="panel-heading">
                <span>Tradução</span>
                <select
                  aria-label="Idioma de destino"
                  value={settings.targetLanguage}
                  onChange={(event) => updateTargetLanguage(event.target.value)}
                >
                  <option value="pt">Português</option>
                  <option value="en">Inglês</option>
                  <option value="es">Espanhol</option>
                  <option value="fr">Francês</option>
                  <option value="de">Alemão</option>
                  <option value="it">Italiano</option>
                  <option value="ja">Japonês</option>
                </select>
              </div>
              <div className={`translation-details ${moreTranslations.length > 0 ? "has-more" : ""}`}>
                <div className="translation-main">
                  <output className="translation-output">
                    {translation || "A tradução aparecerá aqui."}
                  </output>
                  {alternativeTranslations.length > 0 && (
                    <section className="alternative-translations" aria-label="Outras traduções e expressões">
                      <p>Outras traduções e expressões</p>
                      <div>
                        {alternativeTranslations.map((alternative) => (
                          <span key={alternative}>{alternative}</span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
                {moreTranslations.length > 0 && (
                  <aside className="more-translations">
                    <p>Mais</p>
                    <ul>
                      {moreTranslations.map((alternative) => (
                        <li key={alternative}>{alternative}</li>
                      ))}
                    </ul>
                  </aside>
                )}
              </div>
              <div className="panel-footer">
                <span>{detectedLanguage ? `Idioma detectado: ${detectedLanguage}` : ""}</span>
                <button className="secondary-button" type="button" onClick={copyTranslation} disabled={!translation}>
                  Copiar · {settings.copyShortcut}
                </button>
              </div>
            </section>
          </form>

          <footer className="statusbar">
            <span>{error || copyFeedback || `Mostrar/ocultar: ${settings.globalShortcut}`}</span>
            <button className="link-button" type="button" onClick={() => void hideApplication()}>
              Ocultar · {settings.hideShortcut}
            </button>
          </footer>
        </>
      )}

      {showSettings && (
        <div className="modal-backdrop" role="presentation">
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">PREFERÊNCIAS</p>
                <h2 id="settings-title">Configurações</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Fechar configurações" onClick={() => setShowSettings(false)}>
                ×
              </button>
            </div>

            <div className="settings-grid">
              <ShortcutInput label="Mostrar ou ocultar o app (global)" value={draftSettings.globalShortcut} onChange={(globalShortcut) => setDraftSettings({ ...draftSettings, globalShortcut })} />
              <ShortcutInput label="Abrir tradução rápida (global)" value={draftSettings.quickTranslateShortcut} onChange={(quickTranslateShortcut) => setDraftSettings({ ...draftSettings, quickTranslateShortcut })} />
              <ShortcutInput label="Traduzir" value={draftSettings.translateShortcut} onChange={(translateShortcut) => setDraftSettings({ ...draftSettings, translateShortcut })} />
              <ShortcutInput label="Copiar resultado" value={draftSettings.copyShortcut} onChange={(copyShortcut) => setDraftSettings({ ...draftSettings, copyShortcut })} />
              <ShortcutInput label="Ocultar janela" value={draftSettings.hideShortcut} onChange={(hideShortcut) => setDraftSettings({ ...draftSettings, hideShortcut })} />
              <label className="field">
                <span>Idioma de destino padrão</span>
                <select value={draftSettings.targetLanguage} onChange={(event) => setDraftSettings({ ...draftSettings, targetLanguage: event.target.value })}>
                  <option value="pt">Português</option>
                  <option value="en">Inglês</option>
                  <option value="es">Espanhol</option>
                  <option value="fr">Francês</option>
                  <option value="de">Alemão</option>
                </select>
              </label>
              <label className="field">
                <span>Provedor de tradução</span>
                <select
                  value={draftSettings.provider}
                  onChange={(event) => updateProvider(event.target.value as TranslationProvider)}
                >
                  <option value="mymemory">MyMemory — gratuito</option>
                  <option value="libretranslate">LibreTranslate — requer chave</option>
                </select>
              </label>
              <label className="field field-wide">
                <span>Endpoint do provedor</span>
                <input value={draftSettings.endpoint} onChange={(event) => setDraftSettings({ ...draftSettings, endpoint: event.target.value })} />
              </label>
              {draftSettings.provider === "libretranslate" && (
                <label className="field field-wide">
                  <span>Chave de API LibreTranslate</span>
                  <input
                    type="password"
                    value={apiKeyInput}
                    autoComplete="off"
                    placeholder="Deixe vazio para manter a chave já salva"
                    onChange={(event) => setApiKeyInput(event.target.value)}
                  />
                </label>
              )}
            </div>
            <p className="settings-note">Clique em um campo de atalho e pressione a nova combinação. Os dois atalhos globais precisam conter ao menos um modificador. MyMemory é gratuito, com limite de 5.000 caracteres por dia e 500 bytes por chamada. A chave do LibreTranslate é armazenada no Gerenciador de Credenciais do Windows, não no navegador local.</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setDraftSettings(defaultSettings)}>
                Restaurar padrões
              </button>
              <div>
                <button className="text-button" type="button" onClick={() => setShowSettings(false)}>Cancelar</button>
                <button className="primary-button" type="button" onClick={() => void saveSettings()}>Salvar</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
