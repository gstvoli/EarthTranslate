#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::PathBuf, sync::Mutex};

use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const DEFAULT_GLOBAL_SHORTCUT: &str = "Ctrl+Alt+T";
const CREDENTIAL_SERVICE: &str = "EarthTranslate";
const CREDENTIAL_USER: &str = "translation-api-key";

struct AppState {
    global_shortcut: Mutex<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeSettings {
    global_shortcut: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranslationRequest {
    text: String,
    source: String,
    target: String,
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
        let _ = window.show();
        let _ = window.set_focus();
    }
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

fn read_global_shortcut(app: &AppHandle) -> Result<String, String> {
    let path = settings_path(app)?;
    match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str::<NativeSettings>(&contents)
            .map(|settings| settings.global_shortcut)
            .map_err(|error| format!("Não foi possível ler as configurações: {error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            Ok(DEFAULT_GLOBAL_SHORTCUT.into())
        }
        Err(error) => Err(format!("Não foi possível ler as configurações: {error}")),
    }
}

fn save_global_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let contents = serde_json::to_string_pretty(&NativeSettings {
        global_shortcut: shortcut.into(),
    })
    .map_err(|error| format!("Não foi possível preparar as configurações: {error}"))?;
    fs::write(settings_path(app)?, contents)
        .map_err(|error| format!("Não foi possível salvar as configurações: {error}"))
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
fn get_global_shortcut(state: State<AppState>) -> Result<String, String> {
    state
        .global_shortcut
        .lock()
        .map(|shortcut| shortcut.clone())
        .map_err(|_| "Não foi possível acessar as configurações de atalho.".into())
}

#[tauri::command]
fn set_global_shortcut(
    app: AppHandle,
    state: State<AppState>,
    shortcut: String,
) -> Result<(), String> {
    let requested_shortcut = shortcut.trim().to_string();
    let shortcut = parse_shortcut(&requested_shortcut)?;
    let mut active_shortcut = state
        .global_shortcut
        .lock()
        .map_err(|_| "Não foi possível acessar as configurações de atalho.".to_string())?;

    if active_shortcut.eq_ignore_ascii_case(&requested_shortcut) {
        return Ok(());
    }

    let manager = app.global_shortcut();
    manager
        .unregister_all()
        .map_err(|error| format!("Não foi possível atualizar os atalhos: {error}"))?;

    if let Err(error) = manager.register(shortcut) {
        let previous = parse_shortcut(&active_shortcut)?;
        let _ = manager.register(previous);
        return Err(format!("Este atalho não está disponível: {error}"));
    }

    if let Err(error) = save_global_shortcut(&app, &requested_shortcut) {
        let _ = manager.unregister_all();
        let previous = parse_shortcut(&active_shortcut)?;
        let _ = manager.register(previous);
        return Err(error);
    }

    *active_shortcut = requested_shortcut;
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
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let saved_shortcut = read_global_shortcut(app.handle())
                .unwrap_or_else(|_| DEFAULT_GLOBAL_SHORTCUT.into());
            let global_shortcut = if parse_shortcut(&saved_shortcut).is_ok() {
                saved_shortcut
            } else {
                DEFAULT_GLOBAL_SHORTCUT.into()
            };
            let initial_shortcut =
                parse_shortcut(&global_shortcut).map_err(std::io::Error::other)?;
            app.global_shortcut().register(initial_shortcut)?;
            app.manage(AppState {
                global_shortcut: Mutex::new(global_shortcut),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_global_shortcut,
            set_global_shortcut,
            save_translation_api_key,
            hide_main_window,
            translate
        ])
        .run(tauri::generate_context!())
        .expect("erro ao executar EarthTranslate");
}
