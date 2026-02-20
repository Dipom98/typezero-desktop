use anyhow::Result;
use log::{debug, info};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};
use crate::managers::transcription::TranscriptionManager;
use crate::managers::tts::TtsManager;
use crate::managers::audio::AudioRecordingManager;

pub struct TranslationManager {
    app_handle: AppHandle,
    transcription_manager: Arc<TranscriptionManager>,
    tts_manager: Arc<TtsManager>,
    audio_manager: Arc<AudioRecordingManager>,
}

impl TranslationManager {
    pub fn new(
        app_handle: &AppHandle,
        transcription_manager: Arc<TranscriptionManager>,
        tts_manager: Arc<TtsManager>,
        audio_manager: Arc<AudioRecordingManager>,
    ) -> Result<Self> {
        Ok(Self {
            app_handle: app_handle.clone(),
            transcription_manager,
            tts_manager,
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
        
        // 2. Get translation to English (if target is English)
        let translated_text = if target_lang.to_lowercase() == "en" || target_lang.to_lowercase() == "english" {
             self.transcription_manager.transcribe_with_params(
                samples,
                Some(crate::managers::transcription::TranscribeParams {
                    language: None, // Auto detect
                    translate: Some(true),
                })
            )?
        } else {
             // For other languages, we currently return the original text 
             // (or would need an external translation service)
             // The user mainly wants "Voice Translator (Offline)" which usually implies Whisper's English translation capability.
             original_text.clone()
        };

        Ok((original_text, translated_text))
    }
}
