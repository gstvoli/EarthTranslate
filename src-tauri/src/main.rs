#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::PathBuf, sync::Mutex};

use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, Size, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const DEFAULT_GLOBAL_SHORTCUT: &str = "Ctrl+Alt+T";
const DEFAULT_QUICK_TRANSLATE_SHORTCUT: &str = "Ctrl+Alt+Q";
const CREDENTIAL_SERVICE: &str = "EarthTranslate";
const CREDENTIAL_USER: &str = "translation-api-key";

struct AppState {
    shortcuts: Mutex<NativeSettings>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeSettings {
    global_shortcut: String,
    #[serde(default = "default_quick_translate_shortcut")]
    quick_translate_shortcut: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranslationRequest {
    text: String,
    source: String,
    target: String,
    provider: String,
    endpoint: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderResponse {
    translated_text: String,
    detected_language: Option<DetectedLanguage>,
}

#[derive(Deserialize)]
struct DetectedLanguage {
    language: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MyMemoryResponse {
    response_data: MyMemoryData,
    response_status: u16,
    response_details: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MyMemoryData {
    translated_text: String,
    detected_language: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TranslationResponse {
    translated_text: String,
    detected_language: Option<String>,
}

fn toggle_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        open_standard_window(app);
    }
}

fn open_standard_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let _ = window.set_resizable(true);
    let _ = window.set_size(Size::Logical(LogicalSize::new(960.0, 590.0)));
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit("earthtranslate:open-standard", ());
}

fn open_quick_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let _ = window.set_size(Size::Logical(LogicalSize::new(420.0, 350.0)));
    let _ = window.set_resizable(false);
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit("earthtranslate:open-quick", ());
}

fn default_quick_translate_shortcut() -> String {
    DEFAULT_QUICK_TRANSLATE_SHORTCUT.into()
}

fn parse_shortcut(value: &str) -> Result<Shortcut, String> {
    if !value.contains('+') {
        return Err("O atalho global precisa conter Ctrl, Alt, Shift ou Meta.".into());
    }

    value
        .parse::<Shortcut>()
        .map_err(|_| "Combinação de teclas inválida ou não suportada.".into())
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Não foi possível localizar as configurações: {error}"))?;
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Não foi possível criar a pasta de configurações: {error}"))?;
    Ok(directory.join("settings.json"))
}

fn default_shortcut_settings() -> NativeSettings {
    NativeSettings {
        global_shortcut: DEFAULT_GLOBAL_SHORTCUT.into(),
        quick_translate_shortcut: DEFAULT_QUICK_TRANSLATE_SHORTCUT.into(),
    }
}

fn read_shortcut_settings(app: &AppHandle) -> Result<NativeSettings, String> {
    let path = settings_path(app)?;
    match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str::<NativeSettings>(&contents)
            .map_err(|error| format!("Não foi possível ler as configurações: {error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(default_shortcut_settings()),
        Err(error) => Err(format!("Não foi possível ler as configurações: {error}")),
    }
}

fn save_shortcut_settings(app: &AppHandle, shortcuts: &NativeSettings) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(shortcuts)
        .map_err(|error| format!("Não foi possível preparar as configurações: {error}"))?;
    fs::write(settings_path(app)?, contents)
        .map_err(|error| format!("Não foi possível salvar as configurações: {error}"))
}

fn validate_shortcuts(shortcuts: &NativeSettings) -> Result<(), String> {
    if shortcuts
        .global_shortcut
        .eq_ignore_ascii_case(&shortcuts.quick_translate_shortcut)
    {
        return Err("Use combinações diferentes para os atalhos globais.".into());
    }

    parse_shortcut(&shortcuts.global_shortcut)?;
    parse_shortcut(&shortcuts.quick_translate_shortcut)?;
    Ok(())
}

fn register_shortcuts(app: &AppHandle, shortcuts: &NativeSettings) -> Result<(), String> {
    let manager = app.global_shortcut();
    manager
        .register(parse_shortcut(&shortcuts.global_shortcut)?)
        .map_err(|error| format!("O atalho principal não está disponível: {error}"))?;
    manager
        .register(parse_shortcut(&shortcuts.quick_translate_shortcut)?)
        .map_err(|error| format!("O atalho rápido não está disponível: {error}"))
}

fn translation_api_key() -> Option<String> {
    Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_USER)
        .ok()
        .and_then(|entry| entry.get_password().ok())
        .filter(|key| !key.trim().is_empty())
}

#[tauri::command]
fn save_translation_api_key(api_key: String) -> Result<(), String> {
    if api_key.trim().is_empty() {
        return Err("Informe uma chave de API para salvá-la.".into());
    }

    let entry = Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_USER)
        .map_err(|error| format!("Não foi possível abrir o cofre de credenciais: {error}"))?;
    entry
        .set_password(api_key.trim())
        .map_err(|error| format!("Não foi possível salvar a chave de API: {error}"))
}

#[tauri::command]
fn get_shortcut_settings(state: State<AppState>) -> Result<NativeSettings, String> {
    state
        .shortcuts
        .lock()
        .map(|shortcuts| shortcuts.clone())
        .map_err(|_| "Não foi possível acessar as configurações de atalho.".into())
}

#[tauri::command]
fn set_global_shortcuts(
    app: AppHandle,
    state: State<AppState>,
    global_shortcut: String,
    quick_translate_shortcut: String,
) -> Result<(), String> {
    let requested_shortcuts = NativeSettings {
        global_shortcut: global_shortcut.trim().to_string(),
        quick_translate_shortcut: quick_translate_shortcut.trim().to_string(),
    };
    validate_shortcuts(&requested_shortcuts)?;

    let mut active_shortcuts = state
        .shortcuts
        .lock()
        .map_err(|_| "Não foi possível acessar as configurações de atalho.".to_string())?;

    if active_shortcuts
        .global_shortcut
        .eq_ignore_ascii_case(&requested_shortcuts.global_shortcut)
        && active_shortcuts
            .quick_translate_shortcut
            .eq_ignore_ascii_case(&requested_shortcuts.quick_translate_shortcut)
    {
        return Ok(());
    }

    let manager = app.global_shortcut();
    manager
        .unregister_all()
        .map_err(|error| format!("Não foi possível atualizar os atalhos: {error}"))?;

    if let Err(error) = register_shortcuts(&app, &requested_shortcuts) {
        let _ = manager.unregister_all();
        let _ = register_shortcuts(&app, &active_shortcuts);
        return Err(error);
    }

    if let Err(error) = save_shortcut_settings(&app, &requested_shortcuts) {
        let _ = manager.unregister_all();
        let _ = register_shortcuts(&app, &active_shortcuts);
        return Err(error);
    }

    *active_shortcuts = requested_shortcuts;
    Ok(())
}

#[tauri::command]
fn hide_main_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
async fn translate(request: TranslationRequest) -> Result<TranslationResponse, String> {
    if request.text.trim().is_empty() {
        return Err("Digite algum texto antes de traduzir.".into());
    }

    match request.provider.as_str() {
        "mymemory" => translate_with_mymemory(&request).await,
        "libretranslate" => translate_with_libretranslate(&request).await,
        _ => Err("O provedor de tradução selecionado não é suportado.".into()),
    }
}

async fn translate_with_mymemory(
    request: &TranslationRequest,
) -> Result<TranslationResponse, String> {
    if request.text.as_bytes().len() > 500 {
        return Err(
            "O MyMemory aceita até 500 bytes por tradução. Divida o texto em partes menores."
                .into(),
        );
    }

    let endpoint = if request.endpoint.trim().is_empty() {
        "https://api.mymemory.translated.net/get"
    } else {
        request.endpoint.trim()
    };
    let source = if request.source == "auto" {
        "autodetect"
    } else {
        request.source.as_str()
    };
    let langpair = format!("{source}|{}", request.target);

    let response = reqwest::Client::new()
        .get(endpoint)
        .query(&[("q", request.text.as_str()), ("langpair", langpair.as_str())])
        .send()
        .await
        .map_err(|error| format!("Não foi possível alcançar o serviço de tradução: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let details = response.text().await.unwrap_or_default();
        return Err(format!(
            "O serviço de tradução retornou o status {status}. {details}",
        ));
    }

    let payload = response
        .json::<MyMemoryResponse>()
        .await
        .map_err(|error| format!("Resposta inválida do MyMemory: {error}"))?;

    if payload.response_status != 200 {
        return Err(format!("O MyMemory recusou a tradução. {}", payload.response_details));
    }

    Ok(TranslationResponse {
        translated_text: payload.response_data.translated_text,
        detected_language: payload.response_data.detected_language,
    })
}

async fn translate_with_libretranslate(
    request: &TranslationRequest,
) -> Result<TranslationResponse, String> {
    let endpoint = if request.endpoint.trim().is_empty() {
        "https://libretranslate.com/translate"
    } else {
        request.endpoint.trim()
    };
    let mut body = json!({
        "q": request.text,
        "source": request.source,
        "target": request.target,
        "format": "text"
    });
    if let Some(api_key) = translation_api_key() {
        body["api_key"] = json!(api_key);
    }

    let response = reqwest::Client::new()
        .post(endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Não foi possível alcançar o serviço de tradução: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let details = response.text().await.unwrap_or_default();
        return Err(format!(
            "O serviço de tradução retornou o status {status}. {details}",
        ));
    }

    let payload = response
        .json::<ProviderResponse>()
        .await
        .map_err(|error| format!("Resposta inválida do serviço de tradução: {error}"))?;

    Ok(TranslationResponse {
        translated_text: payload.translated_text,
        detected_language: payload.detected_language.map(|language| language.language),
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let is_quick_shortcut = app
                            .state::<AppState>()
                            .shortcuts
                            .lock()
                            .ok()
                            .and_then(|shortcuts| {
                                parse_shortcut(&shortcuts.quick_translate_shortcut).ok()
                            })
                            .is_some_and(|configured| shortcut == &configured);

                        if is_quick_shortcut {
                            open_quick_window(app);
                        } else {
                            toggle_main_window(app);
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let saved_shortcuts =
                read_shortcut_settings(app.handle()).unwrap_or_else(|_| default_shortcut_settings());
            let shortcuts = if validate_shortcuts(&saved_shortcuts).is_ok() {
                saved_shortcuts
            } else {
                default_shortcut_settings()
            };
            register_shortcuts(app.handle(), &shortcuts).map_err(std::io::Error::other)?;
            app.manage(AppState {
                shortcuts: Mutex::new(shortcuts),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_shortcut_settings,
            set_global_shortcuts,
            save_translation_api_key,
            hide_main_window,
            translate
        ])
        .run(tauri::generate_context!())
        .expect("erro ao executar EarthTranslate");
}
