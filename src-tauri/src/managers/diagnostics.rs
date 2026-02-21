use sysinfo::{System, Disks};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct SystemInfo {
    pub os: String,
    pub os_version: String,
    pub arch: String,
    pub app_version: String,
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub memory_total_gb: f64,
    pub memory_used_gb: f64,
    pub disk_free_gb: f64,
}

pub struct DiagnosticManager {
    app_handle: AppHandle,
    sys: Mutex<System>,
}

impl DiagnosticManager {
    pub fn new(app_handle: &AppHandle) -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        
        Self {
            app_handle: app_handle.clone(),
            sys: Mutex::new(sys),
        }
    }

    pub fn get_system_info(&self) -> SystemInfo {
        let mut sys = self.sys.lock().unwrap();
        sys.refresh_all();

        let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
        let arch = System::cpu_arch();
        
        let cpu_brand = sys.cpus().first()
            .map(|cpu| cpu.brand().to_string())
            .unwrap_or_else(|| "Unknown".to_string());
            
        let memory_total_gb = sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
        let memory_used_gb = sys.used_memory() as f64 / 1024.0 / 1024.0 / 1024.0;

        let disks = Disks::new_with_refreshed_list();
        let disk_free_gb = disks.iter()
            .map(|disk| disk.available_space() as f64)
            .sum::<f64>() / 1024.0 / 1024.0 / 1024.0;

        SystemInfo {
            os: std::env::consts::OS.to_string(),
            os_version,
            arch,
            app_version: self.app_handle.package_info().version.to_string(),
            cpu_brand,
            cpu_cores: sys.cpus().len(),
            memory_total_gb,
            memory_used_gb,
            disk_free_gb,
        }
    }

    pub fn generate_report(&self) -> String {
        let info = self.get_system_info();
        serde_json::to_string_pretty(&info).unwrap_or_else(|_| "Error generating report".to_string())
    }
}
