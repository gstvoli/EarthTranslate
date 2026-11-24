import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { defaultSettings, Settings, TranslationResponse } from "./types";

const settingsKey = "earthtranslate.settings";

function loadSettings(): Settings {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(settingsKey) ?? "{}") };
  } catch {
    return defaultSettings;
  }
}

function shortcutFromEvent(event: KeyboardEvent): string {
  const key = event.key === " " ? "Space" : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const parts = [
    event.ctrlKey && "Ctrl",
    event.altKey && "Alt",
    event.shiftKey && "Shift",
    event.metaKey && "Meta",
    !["Control", "Alt", "Shift", "Meta"].includes(event.key) && key,
  ].filter(Boolean);
  return parts.join("+");
}

function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  return shortcutFromEvent(event).toLowerCase() === shortcut.toLowerCase();
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
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string>();
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void invoke<string>("get_global_shortcut")
      .then((globalShortcut) => {
        setSettings((current) => ({ ...current, globalShortcut }));
      })
      .catch((reason) => {
        setError(`Não foi possível carregar o atalho global: ${String(reason)}`);
      });
  }, []);

  useEffect(() => {
    const focusInput = () => textAreaRef.current?.focus();
    window.addEventListener("focus", focusInput);
    focusInput();
    return () => window.removeEventListener("focus", focusInput);
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
          endpoint: settings.endpoint,
        },
      });
      setTranslation(result.translatedText);
      setDetectedLanguage(result.detectedLanguage);
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
      draftSettings.translateShortcut,
      draftSettings.copyShortcut,
      draftSettings.hideShortcut,
    ];
    if (shortcuts.some((shortcut) => !shortcut.trim())) {
      setError("Todos os atalhos precisam ter uma combinação.");
      return;
    }
    if (new Set(shortcuts.map((shortcut) => shortcut.toLowerCase())).size !== shortcuts.length) {
      setError("Use combinações diferentes para cada atalho.");
      return;
    }

    try {
      await invoke("set_global_shortcut", { shortcut: draftSettings.globalShortcut });
      localStorage.setItem(settingsKey, JSON.stringify(draftSettings));
      setSettings(draftSettings);
      setShowSettings(false);
      setError("");
    } catch (reason) {
      setError(`O atalho global não pôde ser salvo: ${String(reason)}`);
    }
  }

  function updateTargetLanguage(targetLanguage: string) {
    const nextSettings = { ...settings, targetLanguage };
    setSettings(nextSettings);
    localStorage.setItem(settingsKey, JSON.stringify(nextSettings));
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">EARTHTRANSLATE</p>
          <h1>Tradução rápida, sem sair do ritmo.</h1>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Abrir configurações"
          onClick={() => {
            setDraftSettings(settings);
            setShowSettings(true);
          }}
        >
          ⚙
        </button>
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
          <output className="translation-output">
            {translation || "A tradução aparecerá aqui."}
          </output>
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
              <label className="field field-wide">
                <span>Endpoint LibreTranslate</span>
                <input value={draftSettings.endpoint} onChange={(event) => setDraftSettings({ ...draftSettings, endpoint: event.target.value })} />
              </label>
            </div>
            <p className="settings-note">Clique em um campo de atalho e pressione a nova combinação. O atalho global precisa conter ao menos um modificador.</p>
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
