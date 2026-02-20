use anyhow::Result;
use tauri::{AppHandle, Manager};
use std::sync::Arc;
use chrono::Utc;
use crate::managers::history::HistoryManager;

#[tauri::command]
#[specta::specta]
pub async fn seed_demo_content(app: AppHandle) -> Result<(), String> {
    let history_manager = app.state::<Arc<HistoryManager>>();

    let now = Utc::now().timestamp();

    // 1. Seed Transcription History
    history_manager.save_to_database(
        "demo-dictation-1.wav".to_string(),
        now - 3600, // 1 hour ago
        "Project Brainstorming".to_string(),
        "We need to focus on local-first AI and ensuring that the latency for transcription is below 200 milliseconds. The goal is to make it feel like you are typing with your voice.".to_string(),
        Some("Focus on local-first AI and ensuring transcription latency is below 200ms. Goal: seamless voice-to-text experience.".to_string()),
        None,
    ).map_err(|e: anyhow::Error| e.to_string())?;

    history_manager.save_to_database(
        "demo-dictation-2.wav".to_string(),
        now - 86400, // 1 day ago
        "Grocery List".to_string(),
        "Milk eggs bread butter and some almond milk for the coffee also don't forget the organic honey from the farmers market.".to_string(),
        None,
        None,
    ).map_err(|e: anyhow::Error| e.to_string())?;

    // 2. Seed a Sample Meeting
    let (meeting_id, _) = history_manager.create_meeting(Some("Weekly Sync: TypeZero Dev".to_string()))
        .map_err(|e| e.to_string())?;

    history_manager.add_meeting_segment(
        meeting_id,
        "Speaker 1".to_string(),
        0.0,
        5.2,
        "Good morning everyone. Let's start with the status updates for the new diagnostics system.".to_string(),
    ).map_err(|e: anyhow::Error| e.to_string())?;

    history_manager.add_meeting_segment(
        meeting_id,
        "Speaker 2".to_string(),
        5.5,
        12.8,
        "I've finished the backend manager in Rust. It now collects CPU and memory usage data accurately.".to_string(),
    ).map_err(|e: anyhow::Error| e.to_string())?;

    history_manager.add_meeting_segment(
        meeting_id,
        "Speaker 1".to_string(),
        13.0,
        18.5,
        "Excellent. What about the frontend integration for the feedback modal?".to_string(),
    ).map_err(|e: anyhow::Error| e.to_string())?;

    history_manager.finalize_meeting(meeting_id, 240) // 4 minute meeting
        .map_err(|e: anyhow::Error| e.to_string())?;

    Ok(())
}
