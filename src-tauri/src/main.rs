use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

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

#[tauri::command]
fn set_global_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    let shortcut = parse_shortcut(&shortcut)?;
    let manager = app.global_shortcut();

    manager
        .unregister_all()
        .map_err(|error| format!("Não foi possível atualizar os atalhos: {error}"))?;
    manager
        .register(shortcut)
        .map_err(|error| format!("Este atalho não está disponível: {error}"))
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

    let response = reqwest::Client::new()
        .post(endpoint)
        .json(&json!({
            "q": request.text,
            "source": request.source,
            "target": request.target,
            "format": "text"
        }))
        .send()
        .await
        .map_err(|error| format!("Não foi possível alcançar o serviço de tradução: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "O serviço de tradução retornou o status {}.",
            response.status()
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
            let initial_shortcut =
                parse_shortcut("Ctrl+Alt+T").map_err(std::io::Error::other)?;
            app.global_shortcut().register(initial_shortcut)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_global_shortcut,
            hide_main_window,
            translate
        ])
        .run(tauri::generate_context!())
        .expect("erro ao executar EarthTranslate");
}
