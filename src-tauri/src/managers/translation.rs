use anyhow::Result;
use log::{info, warn};
use std::sync::Arc;
use tauri::AppHandle;
use crate::managers::transcription::TranscriptionManager;
use crate::managers::audio::AudioRecordingManager;

pub struct TranslationManager {
    app_handle: AppHandle,
    transcription_manager: Arc<TranscriptionManager>,
    audio_manager: Arc<AudioRecordingManager>,
}

impl TranslationManager {
    pub fn new(
        app_handle: &AppHandle,
        transcription_manager: Arc<TranscriptionManager>,
        audio_manager: Arc<AudioRecordingManager>,
    ) -> Result<Self> {
        Ok(Self {
            app_handle: app_handle.clone(),
            transcription_manager,
            audio_manager,
        })
    }

    pub fn start_capture(&self) -> Result<()> {
        info!("Starting translation capture");
        // Ensure model is loaded before we need it
        self.transcription_manager.initiate_model_load();
        
        if self.audio_manager.try_start_recording("translation") {
            Ok(())
        } else {
            Err(anyhow::anyhow!("Failed to start recording for translation"))
        }
    }

    pub async fn stop_capture_and_translate(&self, target_lang: String) -> Result<(String, String)> {
        info!("Stopping translation capture and translating to {}", target_lang);
        
        let samples = self.audio_manager.stop_recording("translation")
            .ok_or_else(|| anyhow::anyhow!("No audio samples captured for translation"))?;

        if samples.is_empty() {
             return Err(anyhow::anyhow!("Empty audio captured"));
        }

        // 1. Get original transcription (Source Language)
        // Force translate=false to get the original text
        let original_text = self.transcription_manager.transcribe_with_params(
            samples.clone(),
            Some(crate::managers::transcription::TranscribeParams {
                language: None, // Auto detect
                translate: Some(false),
            })
        )?;
        
        // 2. Get translation
        let translated_text = if target_lang.to_lowercase() == "en" || target_lang.to_lowercase() == "english" {
             // Use Whisper's native translation to English
             self.transcription_manager.transcribe_with_params(
                samples,
                Some(crate::managers::transcription::TranscribeParams {
                    language: None, // Auto detect
                    translate: Some(true),
                })
            )?
        } else {
             // For other languages, try to use a local LLM if available
             let settings = crate::settings::get_settings(&self.app_handle);
             let provider_id = &settings.post_process_provider_id;
             let provider = settings.post_process_providers.iter().find(|p| &p.id == provider_id);
             
             if let Some(p) = provider {
                 // If it's a local-compatible provider (Ollama) or if the user has a key, try to translate
                 let api_key = settings.post_process_api_keys.get(provider_id).cloned().unwrap_or_default();
                 let model = settings.post_process_models.get(provider_id).cloned().unwrap_or_else(|| "llama3".to_string());
                 
                 let prompt = format!(
                     "Translate to {}. Return ONLY translation: {}",
                     target_lang, original_text
                 );
                 
                 let start = std::time::Instant::now();
                 let result = crate::llm_client::send_chat_completion(p, api_key, &model, prompt).await;
                 let duration = start.elapsed();

                 match result {
                     Ok(Some(translated)) => {
                         info!("LLM translation completed in {}ms", duration.as_millis());
                         translated
                     },
                     _ => {
                         warn!("Local LLM translation failed or returned no result after {}ms, falling back", duration.as_millis());
                         original_text.clone()
                     }
                 }
             } else {
                 warn!("No translation provider found, falling back to original text");
                 original_text.clone()
             }
        };

        Ok((original_text, translated_text))
    }
}
