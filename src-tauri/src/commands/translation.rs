use tauri::State;
use crate::managers::translation::TranslationManager;
use std::sync::Arc;
use log::{error, info};

#[tauri::command]
#[specta::specta]
pub async fn start_translation_capture(
    state: State<'_, Arc<TranslationManager>>,
) -> Result<(), String> {
    state.start_capture().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_translation_capture(
    state: State<'_, Arc<TranslationManager>>,
    target_lang: String,
) -> Result<(String, String), String> {
    state.stop_capture_and_translate(target_lang).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn translate_text(
    app: tauri::AppHandle,
    text: String,
    source_lang: String,
    target_lang: String,
) -> Result<String, String> {
    use crate::settings::get_settings;

    let settings = get_settings(&app);
    let provider_id = settings.post_process_provider_id;
    
    let provider = settings
        .post_process_providers
        .iter()
        .find(|p| p.id == provider_id)
        .ok_or_else(|| "Provider not found".to_string())?;

    let api_key = settings
        .post_process_api_keys
        .get(&provider_id)
        .cloned()
        .unwrap_or_default();

    let model = settings
        .post_process_models
        .get(&provider_id)
        .cloned()
        .unwrap_or_else(|| "gpt-3.5-turbo".to_string());

    let prompt = format!(
        "Translate the following from {} to {}. Return ONLY the translation.\n\nText: {}",
        source_lang, target_lang, text
    );

    let start = std::time::Instant::now();
    let result = crate::llm_client::send_chat_completion(
        provider,
        api_key,
        &model,
        prompt
    ).await;
    let duration = start.elapsed();

    match result {
        Ok(Some(text)) => {
            info!("LLM translation completed in {}ms", duration.as_millis());
            Ok(text)
        },
        Ok(None) => Err("No translation returned from provider".to_string()),
        Err(e) => {
            // Log if we failed and it was intended to be local
            if provider.id == "ollama" {
                error!("Local translation (Ollama) failed ({}ms): {}", duration.as_millis(), e);
            }
            Err(format!("Translation failed: {}", e))
        }
    }
}
