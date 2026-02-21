use anyhow::Result;
use log::{debug, error, info};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use crate::managers::transcription::TranscriptionManager;
use crate::managers::history::{HistoryManager, MeetingSegment};
use crate::managers::audio::AudioRecordingManager;

use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use hound::{WavSpec, WavWriter};

pub struct MeetingSession {
    pub id: i64,
    pub start_time: std::time::Instant,
    pub segments: Vec<MeetingSegment>,
    pub stop_signal: Arc<AtomicBool>,
    pub handle: Option<thread::JoinHandle<()>>,
    pub save_to_history: bool,
}

#[derive(Clone)]
pub struct MeetingManager {
    app_handle: AppHandle,
    active_meeting: Arc<Mutex<Option<MeetingSession>>>,
    transcription_manager: Arc<TranscriptionManager>,
    history_manager: Arc<HistoryManager>,
    recording_manager: Arc<AudioRecordingManager>,
}

impl MeetingManager {
    pub fn new(
        app_handle: &AppHandle,
        transcription_manager: Arc<TranscriptionManager>,
        history_manager: Arc<HistoryManager>,
        recording_manager: Arc<AudioRecordingManager>,
    ) -> Result<Self> {
        Ok(Self {
            app_handle: app_handle.clone(),
            active_meeting: Arc::new(Mutex::new(None)),
            transcription_manager,
            history_manager,
            recording_manager,
        })
    }

    pub fn start_meeting(&self, title: Option<String>, save_to_history: bool) -> Result<i64> {
        let is_active = self.active_meeting.lock().unwrap().is_some();
        if is_active {
            return Err(anyhow::anyhow!("Meeting already in progress"));
        }

        info!("Starting new meeting: {:?} (save_to_history: {})", title, save_to_history);
        
        let (meeting_id, file_path) = self.history_manager.create_meeting(title)?;
        
        // Ensure microphone stream is active
        self.recording_manager.start_microphone_stream()?;
        
        // Ensure transcription model is loaded
        self.transcription_manager.initiate_model_load();

        // Begin internal recorder collection
        self.recording_manager.try_start_recording("meetings");

        // Create WAV writer
        let spec = WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let mut writer = WavWriter::create(file_path, spec)
            .map_err(|e| anyhow::anyhow!("Failed to create WAV writer: {}", e))?;

        let stop_signal = Arc::new(AtomicBool::new(false));
        let stop_signal_cloned = stop_signal.clone();
        let self_cloned = self.clone();
        
        // Use a Mutex for thread-safe segments collection inside the thread if needed,
        // but here we just process chunk and save to DB directly in process_chunk_internal.
        // We accumulate segments in `session.segments` on the MAIN thread via events or queries if needed,
        // but `MeetingSession` struct stores them?
        // Ah, `segments: Vec<MeetingSegment>` in `MeetingSession` is initialized as empty.
        // But `process_chunk_internal` saves to DB. It doesn't update the `session.segments` in the MAIN thread's Mutex.
        // The `MeetingSession` inside `active_meeting` is guarded by Mutex.
        // The thread has `self_cloned` (MeetingManager), which has `active_meeting`.
        // So the thread COULD lock active_meeting and update segments.
        // But `process_chunk_internal` implementation (below) just emits events and saves to DB.
        // It DOES NOT update `session.segments`.
        // So when we stop, `session.segments` is empty?
        // Let's check `process_chunk_internal`.
        
        let handle = thread::spawn(move || {
            let mut elapsed_seconds = 0.0;
            while !stop_signal_cloned.load(Ordering::Relaxed) {
                thread::sleep(Duration::from_secs(5));
                if stop_signal_cloned.load(Ordering::Relaxed) {
                    break;
                }

                let chunk_start = elapsed_seconds;
                if let Some(audio) = self_cloned.recording_manager.yield_samples() {
                    // Write to WAV file
                    for sample in &audio {
                        let sample_i16 = (sample * i16::MAX as f32) as i16;
                        if let Err(e) = writer.write_sample(sample_i16) {
                            error!("Failed to write sample to WAV: {}", e);
                        }
                    }

                    let chunk_duration = (audio.len() as f64) / 16000.0; // Assuming 16k sample rate
                    let chunk_end = chunk_start + chunk_duration;
                    
                    if let Err(e) = self_cloned.process_chunk_internal(meeting_id, audio, chunk_start, chunk_end) {
                        error!("Failed to process meeting chunk: {}", e);
                    }
                    elapsed_seconds = chunk_end;
                }
            }
            // Finalize writer when thread exits (dropped)
            match writer.finalize() {
                Ok(_) => debug!("WAV writer finalized successfully"),
                Err(e) => error!("Failed to finalize WAV writer: {}", e),
            }
            debug!("Meeting chunking loop exiting");
        });

        let mut active = self.active_meeting.lock().unwrap();
        *active = Some(MeetingSession {
            id: meeting_id,
            start_time: std::time::Instant::now(),
            segments: Vec::new(),
            stop_signal,
            handle: Some(handle),
            save_to_history,
        });

        // Emit event to frontend
        let _ = self.app_handle.emit("meeting-started", meeting_id);
        
        Ok(meeting_id)
    }

    fn process_chunk_internal(&self, meeting_id: i64, audio: Vec<f32>, start_offset: f64, end_offset: f64) -> Result<()> {
        if audio.is_empty() {
            return Ok(());
        }

        // Perform transcription
        let text = self.transcription_manager.transcribe(audio)?;
        
        if text.trim().is_empty() {
            return Ok(());
        }

        // TODO: Diarization logic here (Pro feature)
        let speaker_id = "Speaker 1".to_string();

        // Save segment to DB
        self.history_manager.add_meeting_segment(
            meeting_id,
            speaker_id.clone(),
            start_offset,
            end_offset,
            text.clone(),
        )?;
        
        // Also update the active session segments if possible
        if let Ok(mut active_lock) = self.active_meeting.lock() {
            if let Some(session) = active_lock.as_mut() {
                if session.id == meeting_id {
                    session.segments.push(MeetingSegment {
                        id: 0, // Placeholder
                        meeting_id,
                        speaker_id: speaker_id.clone(),
                        start_time_offset: start_offset,
                        end_time_offset: end_offset,
                        text: text.clone(),
                    });
                }
            }
        }

        // Emit live segment to frontend
        let _ = self.app_handle.emit("meeting-segment-added", MeetingSegment {
            id: 0, 
            meeting_id,
            speaker_id,
            start_time_offset: start_offset,
            end_time_offset: end_offset,
            text,
        });

        Ok(())
    }

    pub fn stop_meeting(&self) -> Result<()> {
        let mut active_guard = self.active_meeting.lock().unwrap();
        if let Some(mut session) = active_guard.take() {
            // Signal loop to stop
            session.stop_signal.store(true, Ordering::Relaxed);
            
            // Join thread
            if let Some(handle) = session.handle.take() {
                let _ = handle.join();
            }

            // Final pull of samples
            if let Some(_audio) = self.recording_manager.stop_recording("meetings") {
                 // Process final chunk if needed. 
                 // For now we assume the loop captured most relevant audio.
            }

            let duration = session.start_time.elapsed().as_secs() as i32;
            self.history_manager.finalize_meeting(session.id, duration)?;
            
            info!("Meeting {} stopped after {}s", session.id, duration);
            let _ = self.app_handle.emit("meeting-stopped", session.id);
            
            // Handle save_to_history
            if session.save_to_history {
                let history_manager = self.history_manager.clone();
                let session_segments = session.segments.clone();
                let session_id = session.id;

                tauri::async_runtime::spawn(async move {
                    info!("Saving meeting {} to history...", session_id);
                    
                    let full_text = session_segments.iter()
                        .map(|s| s.text.clone())
                        .collect::<Vec<String>>()
                        .join(" ");
                    
                    if !full_text.trim().is_empty() {
                         if let Ok(Some(meeting)) = history_manager.get_meeting_by_id(session_id) {
                             if let Some(filename) = meeting.file_name {
                                 let meeting_wav_path = history_manager.get_audio_file_path(&filename);
                                 if let Ok(mut reader) = hound::WavReader::open(&meeting_wav_path) {
                                     let samples: Vec<f32> = reader.samples::<i16>()
                                        .filter_map(Result::ok)
                                        .map(|s| s as f32 / i16::MAX as f32)
                                        .collect();
                                     
                                     match history_manager.save_transcription(
                                         samples,
                                         full_text,
                                         None,
                                         None
                                     ).await {
                                         Ok(_) => info!("Successfully saved meeting {} to history", session_id),
                                         Err(e) => error!("Failed to save meeting to history: {}", e),
                                     }
                                 } else {
                                     error!("Failed to open WAV file for meeting {}", session_id);
                                 }
                             }
                         }
                    }
                });
            }
        }
        Ok(())
    }

    pub fn get_meetings(&self) -> Result<Vec<crate::managers::history::Meeting>> {
        self.history_manager.get_meetings()
    }

    pub fn is_meeting_active(&self) -> bool {
        self.active_meeting.lock().unwrap().is_some()
    }
    
    pub fn get_meeting_details(&self, id: i64) -> Result<crate::managers::history::MeetingDetails> {
        let meeting = self.history_manager.get_meeting_by_id(id)?
            .ok_or_else(|| anyhow::anyhow!("Meeting not found"))?;
            
        let segments = self.history_manager.get_meeting_segments(id)?;
        
        let audio_path = if let Some(filename) = &meeting.file_name {
             Some(self.history_manager.get_audio_file_path(filename).to_string_lossy().to_string())
        } else {
             None
        };
        
        Ok(crate::managers::history::MeetingDetails {
            meeting,
            segments,
            audio_path,
        })
    }
}
