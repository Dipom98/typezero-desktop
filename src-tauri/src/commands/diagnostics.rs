use tauri::{AppHandle, Manager};
use std::sync::Arc;
use crate::managers::diagnostics::{DiagnosticManager, SystemInfo};

#[tauri::command]
#[specta::specta]
pub fn get_system_info(app: AppHandle) -> Result<SystemInfo, String> {
    let manager = app.state::<Arc<DiagnosticManager>>();
    Ok(manager.get_system_info())
}

#[tauri::command]
#[specta::specta]
pub fn generate_diagnostic_report(app: AppHandle) -> Result<String, String> {
    let manager = app.state::<Arc<DiagnosticManager>>();
    Ok(manager.generate_report())
}
