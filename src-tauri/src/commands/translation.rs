use tauri::State;
use crate::managers::translation::TranslationManager;
use std::sync::Arc;

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
        "Translate the following text from {} to {}.\n\nText:\n{}\n\nReturn ONLY the translated text, nothing else.",
        source_lang, target_lang, text
    );

    let result = crate::llm_client::send_chat_completion(
        provider,
        api_key,
        &model,
        prompt
    ).await?;

    result.ok_or_else(|| "No translation returned".to_string())
}
