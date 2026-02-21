use crate::managers::tts::TtsManager;
use crate::settings::get_settings;
use std::sync::Arc;
use tauri::{AppHandle, State, Manager};
use serde::{Deserialize, Serialize};

#[tauri::command]
#[specta::specta]
pub async fn get_tts_status(tts_manager: State<'_, Arc<TtsManager>>) -> Result<bool, String> {
    Ok(tts_manager.is_running())
}

#[tauri::command]
#[specta::specta]
pub async fn get_tts_diagnostics(app: AppHandle) -> Result<crate::managers::tts::TtsDiagnostics, String> {
    Ok(TtsManager::get_python_diagnostics(&app))
}

#[derive(Serialize, Deserialize, specta::Type)]
pub struct TtsSpeakRequest {
    pub text: String,
}

#[tauri::command]
#[specta::specta]
pub async fn speak(
    app: AppHandle,
    tts_manager: State<'_, Arc<TtsManager>>,
    history_manager: State<'_, Arc<crate::managers::history::HistoryManager>>,
    request: TtsSpeakRequest,
) -> Result<Vec<u8>, String> {
    if !tts_manager.is_running() {
        return Err("TTS service is not running. Please restart TypeZero.".to_string());
    }

    let settings = get_settings(&app);
    let payload = serde_json::json!({
        "text": request.text,
        "voice": settings.tts_voice,
        "speed": settings.tts_speed,
        "model_id": settings.selected_tts_model,
    });

    let client = reqwest::Client::new();
    let response = client.post("http://127.0.0.1:5002/speak")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to call TTS service: {}", e))?;

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("TTS service error: {}", err_text));
    }

    let audio_data = response.bytes()
        .await
        .map_err(|e| format!("Failed to read audio data: {}", e))?;

    log::info!("Received {} bytes of audio data from TTS service", audio_data.len());
    
    // Save to history
    let timestamp = chrono::Utc::now().timestamp();
    let file_name = format!("tts-{}.wav", timestamp);
    let file_path = history_manager.get_audio_file_path(&file_name);
    
    match std::fs::write(&file_path, &audio_data) {
        Ok(_) => {
            if let Err(e) = history_manager.save_tts_entry(
                request.text.clone(),
                settings.tts_voice.clone(),
                file_name
            ) {
                log::error!("Failed to save TTS history entry: {}", e);
            }
        }
        Err(e) => {
            log::error!("Failed to save TTS audio file: {}", e);
        }
    }

    Ok(audio_data.to_vec())
}

#[tauri::command]
#[specta::specta]
pub async fn get_tts_voices(app: AppHandle) -> Result<Vec<String>, String> {
    let settings = get_settings(&app);
    let model_manager = app.state::<Arc<crate::managers::model::ModelManager>>();
    let mut voices = Vec::new();

    // If a Piper model is selected and downloaded, use it
    if !settings.selected_tts_model.is_empty() {
        if let Some(model) = model_manager.get_model_info(&settings.selected_tts_model) {
            if model.is_downloaded {
                voices.push(model.id.clone());
            }
        }
    }

    // Always include system default
    if voices.is_empty() {
        voices.push("system_default".to_string());
    }

    Ok(voices)
}
