use anyhow::{anyhow, Result};
use log::{debug, error, info};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Manager, path::BaseDirectory, Emitter};

pub struct TtsManager {
    child: Arc<Mutex<Option<Child>>>,
    app_handle: AppHandle,
}

impl TtsManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        let manager = Self {
            child: Arc::new(Mutex::new(None)),
            app_handle: app_handle.clone(),
        };

        manager.start_service()?;
        manager.start_health_check();
        Ok(manager)
    }

    fn get_python_command() -> String {
        // Log current directory and executable path to help debug
        if let Ok(cwd) = std::env::current_dir() {
            info!("TTS Manager CWD: {:?}", cwd);
        }
        if let Ok(exe) = std::env::current_exe() {
            info!("TTS Manager Executable: {:?}", exe);
        }

        // Check for local venv (development) - try multiple common locations
        // We look for tts_env in:
        // 1. Current directory
        // 2. Parent directory (if running from src-tauri or target/debug)
        // 3. Two levels up
        // 4. Three levels up
        let possible_roots = vec![
            ".",
            "..",
            "../..",
            "../../..",
            "src-tauri",
            "../src-tauri",
        ];

        let env_dir = "tts_env";
        let bin_path = if cfg!(target_os = "windows") {
            "Scripts/python.exe"
        } else {
            "bin/python"
        };

        for root in possible_roots {
            let path = Path::new(root).join(env_dir).join(bin_path);
            if path.exists() {
                if let Ok(abs_path) = std::fs::canonicalize(&path) {
                    if let Some(p) = abs_path.to_str() {
                        info!("Found python at: {}", p);
                        return p.to_string();
                    }
                }
            }
        }

        info!("No local venv found in common locations, falling back to system python");

        // Fallback to system python
        if cfg!(target_os = "windows") {
            "python".to_string()
        } else {
            "python3".to_string()
        }
    }

    pub fn start_health_check(&self) {
        let app_handle = self.app_handle.clone();
        let child_arc = self.child.clone();
        let manager_clone = Arc::new(self.app_handle.clone()); // We only need app_handle for emitting

        thread::spawn(move || {
            loop {
                thread::sleep(std::time::Duration::from_secs(10));
                
                let mut needs_restart = false;
                {
                    let mut child_guard = child_arc.lock().unwrap();
                    if let Some(ref mut child) = *child_guard {
                        match child.try_wait() {
                            Ok(Some(status)) => {
                                error!("TTS service exited with status: {}. Attempting restart...", status);
                                needs_restart = true;
                                *child_guard = None;
                            }
                            Err(e) => {
                                error!("Error checking TTS service status: {}. Attempting restart...", e);
                                needs_restart = true;
                                *child_guard = None;
                            }
                            Ok(None) => {} // Still running
                        }
                    } else {
                        debug!("TTS service not running. Attempting startup...");
                        needs_restart = true;
                    }
                }

                if needs_restart {
                    let _ = app_handle.emit("tts-service-status", "restarting");
                    // We can't call self.start_service directly here easily without Arc self
                    // So we inline the logic or use a helper
                    let mut tts_path = match app_handle.path().resolve("tts/server.py", BaseDirectory::Resource) {
                        Ok(path) => path,
                        Err(e) => {
                            error!("Failed to resolve TTS path during health check: {}", e);
                            continue;
                        }
                    };

                    // In dev mode, the resource might not be copied to target, so check source
                    // In dev mode, the resource might not be copied to target, so check source
                    if !tts_path.exists() {
                        let possible_locations = vec![
                            "tts/server.py",
                            "../tts/server.py",
                            "../../tts/server.py",
                            "ids/tts/server.py"
                        ];
                        
                        for loc in possible_locations {
                            let path = Path::new(loc);
                            if path.exists() {
                                if let Ok(abs_path) = std::fs::canonicalize(path) {
                                    info!("Found TTS server script at: {:?}", abs_path);
                                    tts_path = abs_path;
                                    break;
                                }
                            }
                        }
                    }

                    info!("Health check: Restarting TTS service at {:?}", tts_path);
                    match Command::new(Self::get_python_command())
                        .arg(&tts_path)
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped())
                        .spawn()
                    {
                        Ok(mut child) => {
                            // Capture stdout for logging
                            if let Some(stdout) = child.stdout.take() {
                                thread::spawn(move || {
                                    use std::io::{BufRead, BufReader};
                                    let reader = BufReader::new(stdout);
                                    for line in reader.lines() {
                                        if let Ok(line) = line {
                                            info!("[TTS Service] {}", line);
                                        }
                                    }
                                });
                            }

                            // Capture stderr for logging errors
                            if let Some(stderr) = child.stderr.take() {
                                thread::spawn(move || {
                                    use std::io::{BufRead, BufReader};
                                    let reader = BufReader::new(stderr);
                                    for line in reader.lines() {
                                        if let Ok(line) = line {
                                            error!("[TTS Service Error] {}", line);
                                        }
                                    }
                                });
                            }

                            *child_arc.lock().unwrap() = Some(child);
                            info!("TTS service restarted successfully");
                            let _ = app_handle.emit("tts-service-status", "running");
                        }
                        Err(e) => {
                            error!("Failed to restart TTS service: {}", e);
                            let _ = app_handle.emit("tts-service-error", format!("Failed to restart: {}", e));
                        }
                    }
                }
            }
        });
    }

    pub fn start_service(&self) -> Result<()> {
        let app_handle = self.app_handle.clone();
        let child_arc = self.child.clone();

        // Check if service is already running
        if child_arc.lock().unwrap().is_some() {
            return Ok(());
        }

        thread::spawn(move || {
            let mut tts_path = match app_handle.path().resolve("tts/server.py", BaseDirectory::Resource) {
                Ok(path) => path,
                Err(e) => {
                    error!("Failed to resolve TTS path: {}", e);
                    return;
                }
            };

            // In dev mode, the resource might not be copied to target, so check source
            if !tts_path.exists() {
                 let possible_locations = vec![
                    "tts/server.py",
                    "../tts/server.py",
                    "../../tts/server.py",
                    "ids/tts/server.py"
                ];
                
                for loc in possible_locations {
                    let path = Path::new(loc);
                    if path.exists() {
                        if let Ok(abs_path) = std::fs::canonicalize(path) {
                            info!("Found TTS server script at: {:?}", abs_path);
                            tts_path = abs_path;
                            break;
                        }
                    }
                }
            }

            // In production, we might want to check for a bundled python or sidecar
            // For now, we assume python3 is in PATH
            info!("Starting TTS service at {:?}", tts_path);

            match Command::new(Self::get_python_command())
                .arg(&tts_path)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
            {
                Ok(child) => {
                    *child_arc.lock().unwrap() = Some(child);
                    info!("TTS service started successfully");
                }
                Err(e) => {
                    error!("Failed to spawn TTS service: {}", e);
                }
            }
        });

        Ok(())
    }

    pub fn stop_service(&self) {
        let mut child_guard = self.child.lock().unwrap();
        if let Some(mut child) = child_guard.take() {
            info!("Shutting down TTS service");
            let _ = child.kill();
        }
    }

    pub fn is_running(&self) -> bool {
        let mut child_guard = self.child.lock().unwrap();
        if let Some(ref mut child) = *child_guard {
            match child.try_wait() {
                Ok(None) => true, // Still running
                _ => {
                    *child_guard = None; // Process exited
                    false
                }
            }
        } else {
            false
        }
    }
}

impl Drop for TtsManager {
    fn drop(&mut self) {
        self.stop_service();
    }
}
