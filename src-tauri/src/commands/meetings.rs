use tauri::{AppHandle, State};
use crate::managers::meetings::MeetingManager;
use std::sync::Arc;

#[tauri::command]
#[specta::specta]
pub async fn start_meeting(
    app: AppHandle,
    state: State<'_, Arc<MeetingManager>>,
    title: Option<String>,
    save_to_history: Option<bool>,
) -> Result<i64, String> {
    let id = state.start_meeting(title, save_to_history.unwrap_or(false)).map_err(|e| e.to_string())?;
    crate::overlay::show_recording_overlay(&app);
    Ok(id)
}

#[tauri::command]
#[specta::specta]
pub async fn stop_meeting(
    app: AppHandle,
    state: State<'_, Arc<MeetingManager>>,
) -> Result<(), String> {
    state.stop_meeting().map_err(|e| e.to_string())?;
    crate::overlay::hide_recording_overlay(&app);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn is_meeting_active(
    state: State<'_, Arc<MeetingManager>>,
) -> Result<bool, String> {
    Ok(state.is_meeting_active())
}

#[tauri::command]
#[specta::specta]
pub async fn get_meetings(
    state: State<'_, Arc<MeetingManager>>,
) -> Result<Vec<crate::managers::history::Meeting>, String> {
    state.get_meetings().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_meeting_details(
    state: State<'_, Arc<MeetingManager>>,
    id: i64,
) -> Result<crate::managers::history::MeetingDetails, String> {

    state.get_meeting_details(id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn toggle_meeting_favorite(
    state: State<'_, Arc<crate::managers::history::HistoryManager>>,
    id: i64,
) -> Result<(), String> {
    state.toggle_meeting_favorite(id).map_err(|e| e.to_string())
}

