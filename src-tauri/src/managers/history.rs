use anyhow::Result;
use chrono::{DateTime, Local, Utc};
use log::{debug, error, info};
use rusqlite::{params, Connection, OptionalExtension};
use rusqlite_migration::{Migrations, M};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

use crate::audio_toolkit::save_wav_file;

/// Database migrations for transcription history.
/// Each migration is applied in order. The library tracks which migrations
/// have been applied using SQLite's user_version pragma.
///
/// Note: For users upgrading from tauri-plugin-sql, migrate_from_tauri_plugin_sql()
/// converts the old _sqlx_migrations table tracking to the user_version pragma,
/// ensuring migrations don't re-run on existing databases.
static MIGRATIONS: &[M] = &[
    M::up(
        "CREATE TABLE IF NOT EXISTS transcription_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            saved BOOLEAN NOT NULL DEFAULT 0,
            title TEXT NOT NULL,
            transcription_text TEXT NOT NULL
        );",
    ),
    M::up("ALTER TABLE transcription_history ADD COLUMN post_processed_text TEXT;"),
    M::up("ALTER TABLE transcription_history ADD COLUMN post_process_prompt TEXT;"),
    M::up(
        "CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            start_timestamp INTEGER NOT NULL,
            end_timestamp INTEGER,
            duration_seconds INTEGER DEFAULT 0,
            summary TEXT,
            is_pro BOOLEAN NOT NULL DEFAULT 0
        );",
    ),
    M::up(
        "CREATE TABLE IF NOT EXISTS meeting_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            speaker_id TEXT DEFAULT 'Unknown',
            start_time_offset REAL NOT NULL,
            end_time_offset REAL NOT NULL,
            text TEXT NOT NULL,
            FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
        );",
    ),
    M::up("ALTER TABLE meetings ADD COLUMN file_name TEXT;"),
    M::up("ALTER TABLE meetings ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT 0;"),
    M::up(
        "CREATE TABLE IF NOT EXISTS tts_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            voice_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            is_favorite BOOLEAN NOT NULL DEFAULT 0
        );",
    ),
];

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct TtsHistoryEntry {
    pub id: i64,
    pub text: String,
    pub voice_id: String,
    pub file_name: String,
    pub timestamp: i64,
    pub is_favorite: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct HistoryEntry {
    pub id: i64,
    pub file_name: String,
    pub timestamp: i64,
    pub saved: bool,
    pub title: String,
    pub transcription_text: String,
    pub post_processed_text: Option<String>,
    pub post_process_prompt: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct Meeting {
    pub id: i64,
    pub title: String,
    pub start_timestamp: i64,
    pub end_timestamp: Option<i64>,
    pub duration_seconds: i32,
    pub summary: Option<String>,
    pub is_pro: bool,
    pub file_name: Option<String>,
    #[serde(default)]
    pub is_favorite: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MeetingSegment {
    pub id: i64,
    pub meeting_id: i64,
    pub speaker_id: String,
    pub start_time_offset: f64,
    pub end_time_offset: f64,
    pub text: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MeetingDetails {
    pub meeting: Meeting,
    pub segments: Vec<MeetingSegment>,
    pub audio_path: Option<String>,
}

pub struct HistoryManager {
    app_handle: AppHandle,
    recordings_dir: PathBuf,
    db_path: PathBuf,
}

impl HistoryManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        // Create recordings directory in app data dir
        let app_data_dir = app_handle.path().app_data_dir()?;
        let recordings_dir = app_data_dir.join("recordings");
        let db_path = app_data_dir.join("history.db");

        // Ensure recordings directory exists
        if !recordings_dir.exists() {
            fs::create_dir_all(&recordings_dir)?;
            debug!("Created recordings directory: {:?}", recordings_dir);
        }

        let manager = Self {
            app_handle: app_handle.clone(),
            recordings_dir,
            db_path,
        };

        // Initialize database and run migrations synchronously
        manager.init_database()?;

        Ok(manager)
    }

    fn init_database(&self) -> Result<()> {
        info!("Initializing database at {:?}", self.db_path);

        let mut conn = Connection::open(&self.db_path)?;

        // Handle migration from tauri-plugin-sql to rusqlite_migration
        // tauri-plugin-sql used _sqlx_migrations table, rusqlite_migration uses user_version pragma
        self.migrate_from_tauri_plugin_sql(&conn)?;

        // Create migrations object and run to latest version
        let migrations = Migrations::new(MIGRATIONS.to_vec());

        // Validate migrations in debug builds
        #[cfg(debug_assertions)]
        migrations.validate().expect("Invalid migrations");

        // Get current version before migration
        let version_before: i32 =
            conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
        debug!("Database version before migration: {}", version_before);

        // Apply any pending migrations
        migrations.to_latest(&mut conn)?;

        // Get version after migration
        let version_after: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

        if version_after > version_before {
            info!(
                "Database migrated from version {} to {}",
                version_before, version_after
            );
        } else {
            debug!("Database already at latest version {}", version_after);
        }

        Ok(())
    }

    /// Migrate from tauri-plugin-sql's migration tracking to rusqlite_migration's.
    /// tauri-plugin-sql used a _sqlx_migrations table, while rusqlite_migration uses
    /// SQLite's user_version pragma. This function checks if the old system was in use
    /// and sets the user_version accordingly so migrations don't re-run.
    fn migrate_from_tauri_plugin_sql(&self, conn: &Connection) -> Result<()> {
        // Check if the old _sqlx_migrations table exists
        let has_sqlx_migrations: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !has_sqlx_migrations {
            return Ok(());
        }

        // Check current user_version
        let current_version: i32 =
            conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

        if current_version > 0 {
            // Already migrated to rusqlite_migration system
            return Ok(());
        }

        // Get the highest version from the old migrations table
        let old_version: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM _sqlx_migrations WHERE success = 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if old_version > 0 {
            info!(
                "Migrating from tauri-plugin-sql (version {}) to rusqlite_migration",
                old_version
            );

            // Set user_version to match the old migration state
            conn.pragma_update(None, "user_version", old_version)?;

            // Optionally drop the old migrations table (keeping it doesn't hurt)
            // conn.execute("DROP TABLE IF EXISTS _sqlx_migrations", [])?;

            info!(
                "Migration tracking converted: user_version set to {}",
                old_version
            );
        }

        Ok(())
    }

    fn get_connection(&self) -> Result<Connection> {
        Ok(Connection::open(&self.db_path)?)
    }

    /// Save a transcription to history (both database and WAV file)
    pub async fn save_transcription(
        &self,
        audio_samples: Vec<f32>,
        transcription_text: String,
        post_processed_text: Option<String>,
        post_process_prompt: Option<String>,
    ) -> Result<()> {
        let timestamp = Utc::now().timestamp();
        let file_name = format!("typezero-{}.wav", timestamp);
        let title = self.format_timestamp_title(timestamp);

        // Save WAV file
        let file_path = self.recordings_dir.join(&file_name);
        save_wav_file(file_path, &audio_samples).await?;

        // Save to database
        self.save_to_database(
            file_name,
            timestamp,
            title,
            transcription_text,
            post_processed_text,
            post_process_prompt,
        )?;

        // Clean up old entries
        self.cleanup_old_entries()?;

        // Emit history updated event
        if let Err(e) = self.app_handle.emit("history-updated", ()) {
            error!("Failed to emit history-updated event: {}", e);
        }

        Ok(())
    }

    pub fn save_to_database(
        &self,
        file_name: String,
        timestamp: i64,
        title: String,
        transcription_text: String,
        post_processed_text: Option<String>,
        post_process_prompt: Option<String>,
    ) -> Result<()> {
        let conn = self.get_connection()?;
        conn.execute(
            "INSERT INTO transcription_history (file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![file_name, timestamp, false, title, transcription_text, post_processed_text, post_process_prompt],
        )?;

        debug!("Saved transcription to database");
        Ok(())
    }

    pub fn cleanup_old_entries(&self) -> Result<()> {
        let retention_period = crate::settings::get_recording_retention_period(&self.app_handle);

        match retention_period {
            crate::settings::RecordingRetentionPeriod::Never => {
                // Don't delete anything
                return Ok(());
            }
            crate::settings::RecordingRetentionPeriod::PreserveLimit => {
                // Use the old count-based logic with history_limit
                let limit = crate::settings::get_history_limit(&self.app_handle);
                return self.cleanup_by_count(limit);
            }
            _ => {
                // Use time-based logic
                return self.cleanup_by_time(retention_period);
            }
        }
    }

    fn delete_entries_and_files(&self, entries: &[(i64, String)]) -> Result<usize> {
        if entries.is_empty() {
            return Ok(0);
        }

        let conn = self.get_connection()?;
        let mut deleted_count = 0;

        for (id, file_name) in entries {
            // Delete database entry
            conn.execute(
                "DELETE FROM transcription_history WHERE id = ?1",
                params![id],
            )?;

            // Delete WAV file
            let file_path = self.recordings_dir.join(file_name);
            if file_path.exists() {
                if let Err(e) = fs::remove_file(&file_path) {
                    error!("Failed to delete WAV file {}: {}", file_name, e);
                } else {
                    debug!("Deleted old WAV file: {}", file_name);
                    deleted_count += 1;
                }
            }
        }

        Ok(deleted_count)
    }

    fn cleanup_by_count(&self, limit: usize) -> Result<()> {
        let conn = self.get_connection()?;

        // Get all entries that are not saved, ordered by timestamp desc
        let mut stmt = conn.prepare(
            "SELECT id, file_name FROM transcription_history WHERE saved = 0 ORDER BY timestamp DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, i64>("id")?, row.get::<_, String>("file_name")?))
        })?;

        let mut entries: Vec<(i64, String)> = Vec::new();
        for row in rows {
            entries.push(row?);
        }

        if entries.len() > limit {
            let entries_to_delete = &entries[limit..];
            let deleted_count = self.delete_entries_and_files(entries_to_delete)?;

            if deleted_count > 0 {
                debug!("Cleaned up {} old history entries by count", deleted_count);
            }
        }

        Ok(())
    }

    fn cleanup_by_time(
        &self,
        retention_period: crate::settings::RecordingRetentionPeriod,
    ) -> Result<()> {
        let conn = self.get_connection()?;

        // Calculate cutoff timestamp (current time minus retention period)
        let now = Utc::now().timestamp();
        let cutoff_timestamp = match retention_period {
            crate::settings::RecordingRetentionPeriod::Days3 => now - (3 * 24 * 60 * 60), // 3 days in seconds
            crate::settings::RecordingRetentionPeriod::Weeks2 => now - (2 * 7 * 24 * 60 * 60), // 2 weeks in seconds
            crate::settings::RecordingRetentionPeriod::Months3 => now - (3 * 30 * 24 * 60 * 60), // 3 months in seconds (approximate)
            _ => unreachable!("Should not reach here"),
        };

        // Get all unsaved entries older than the cutoff timestamp
        let mut stmt = conn.prepare(
            "SELECT id, file_name FROM transcription_history WHERE saved = 0 AND timestamp < ?1",
        )?;

        let rows = stmt.query_map(params![cutoff_timestamp], |row| {
            Ok((row.get::<_, i64>("id")?, row.get::<_, String>("file_name")?))
        })?;

        let mut entries_to_delete: Vec<(i64, String)> = Vec::new();
        for row in rows {
            entries_to_delete.push(row?);
        }

        let deleted_count = self.delete_entries_and_files(&entries_to_delete)?;

        if deleted_count > 0 {
            debug!(
                "Cleaned up {} old history entries based on retention period",
                deleted_count
            );
        }

        Ok(())
    }

    pub async fn get_history_entries(&self) -> Result<Vec<HistoryEntry>> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt FROM transcription_history ORDER BY timestamp DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(HistoryEntry {
                id: row.get("id")?,
                file_name: row.get("file_name")?,
                timestamp: row.get("timestamp")?,
                saved: row.get("saved")?,
                title: row.get("title")?,
                transcription_text: row.get("transcription_text")?,
                post_processed_text: row.get("post_processed_text")?,
                post_process_prompt: row.get("post_process_prompt")?,
            })
        })?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row?);
        }

        Ok(entries)
    }

    pub fn get_latest_entry(&self) -> Result<Option<HistoryEntry>> {
        let conn = self.get_connection()?;
        Self::get_latest_entry_with_conn(&conn)
    }

    fn get_latest_entry_with_conn(conn: &Connection) -> Result<Option<HistoryEntry>> {
        let mut stmt = conn.prepare(
            "SELECT id, file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt
             FROM transcription_history
             ORDER BY timestamp DESC
             LIMIT 1",
        )?;

        let entry = stmt
            .query_row([], |row| {
                Ok(HistoryEntry {
                    id: row.get("id")?,
                    file_name: row.get("file_name")?,
                    timestamp: row.get("timestamp")?,
                    saved: row.get("saved")?,
                    title: row.get("title")?,
                    transcription_text: row.get("transcription_text")?,
                    post_processed_text: row.get("post_processed_text")?,
                    post_process_prompt: row.get("post_process_prompt")?,
                })
            })
            .optional()?;

        Ok(entry)
    }

    pub async fn toggle_saved_status(&self, id: i64) -> Result<()> {
        let conn = self.get_connection()?;

        // Get current saved status
        let current_saved: bool = conn.query_row(
            "SELECT saved FROM transcription_history WHERE id = ?1",
            params![id],
            |row| row.get("saved"),
        )?;

        let new_saved = !current_saved;

        conn.execute(
            "UPDATE transcription_history SET saved = ?1 WHERE id = ?2",
            params![new_saved, id],
        )?;

        debug!("Toggled saved status for entry {}: {}", id, new_saved);

        // Emit history updated event
        if let Err(e) = self.app_handle.emit("history-updated", ()) {
            error!("Failed to emit history-updated event: {}", e);
        }

        Ok(())
    }

    pub fn get_audio_file_path(&self, file_name: &str) -> PathBuf {
        self.recordings_dir.join(file_name)
    }

    pub async fn get_entry_by_id(&self, id: i64) -> Result<Option<HistoryEntry>> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt
             FROM transcription_history WHERE id = ?1",
        )?;

        let entry = stmt
            .query_row([id], |row| {
                Ok(HistoryEntry {
                    id: row.get("id")?,
                    file_name: row.get("file_name")?,
                    timestamp: row.get("timestamp")?,
                    saved: row.get("saved")?,
                    title: row.get("title")?,
                    transcription_text: row.get("transcription_text")?,
                    post_processed_text: row.get("post_processed_text")?,
                    post_process_prompt: row.get("post_process_prompt")?,
                })
            })
            .optional()?;

        Ok(entry)
    }

    pub async fn delete_entry(&self, id: i64) -> Result<()> {
        let conn = self.get_connection()?;

        // Get the entry to find the file name
        if let Some(entry) = self.get_entry_by_id(id).await? {
            // Delete the audio file first
            let file_path = self.get_audio_file_path(&entry.file_name);
            if file_path.exists() {
                if let Err(e) = fs::remove_file(&file_path) {
                    error!("Failed to delete audio file {}: {}", entry.file_name, e);
                    // Continue with database deletion even if file deletion fails
                }
            }
        }

        // Delete from database
        conn.execute(
            "DELETE FROM transcription_history WHERE id = ?1",
            params![id],
        )?;

        debug!("Deleted history entry with id: {}", id);

        // Emit history updated event
        if let Err(e) = self.app_handle.emit("history-updated", ()) {
            error!("Failed to emit history-updated event: {}", e);
        }

        Ok(())
    }

    fn format_timestamp_title(&self, timestamp: i64) -> String {
        if let Some(utc_datetime) = DateTime::from_timestamp(timestamp, 0) {
            // Convert UTC to local timezone
            let local_datetime = utc_datetime.with_timezone(&Local);
            local_datetime.format("%B %e, %Y - %l:%M%p").to_string()
        } else {
            format!("Recording {}", timestamp)
        }
    }

    // --- Meetings Support ---

    pub fn create_meeting(&self, title: Option<String>) -> Result<(i64, PathBuf)> {
        let timestamp = Utc::now().timestamp();
        let title = title.unwrap_or_else(|| self.format_timestamp_title(timestamp));
        let file_name = format!("meeting-{}.wav", timestamp);
        
        let conn = self.get_connection()?;
        conn.execute(
            "INSERT INTO meetings (title, start_timestamp, is_pro, file_name) VALUES (?1, ?2, ?3, ?4)",
            params![title, timestamp, false, file_name],
        )?;
        
        let id = conn.last_insert_rowid();
        let file_path = self.recordings_dir.join(&file_name);
        
        Ok((id, file_path))
    }

    pub fn add_meeting_segment(
        &self,
        meeting_id: i64,
        speaker_id: String,
        start_offset: f64,
        end_offset: f64,
        text: String,
    ) -> Result<()> {
        let conn = self.get_connection()?;
        conn.execute(
            "INSERT INTO meeting_segments (meeting_id, speaker_id, start_time_offset, end_time_offset, text) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![meeting_id, speaker_id, start_offset, end_offset, text],
        )?;
        Ok(())
    }

    pub fn finalize_meeting(&self, meeting_id: i64, duration: i32) -> Result<()> {
        let timestamp = Utc::now().timestamp();
        let conn = self.get_connection()?;
        conn.execute(
            "UPDATE meetings SET end_timestamp = ?1, duration_seconds = ?2 WHERE id = ?3",
            params![timestamp, duration, meeting_id],
        )?;
        Ok(())
    }

    pub fn save_tts_entry(&self, text: String, voice_id: String, file_name: String) -> Result<i64> {
        let timestamp = Utc::now().timestamp();
        let conn = self.get_connection()?;
        conn.execute(
            "INSERT INTO tts_history (text, voice_id, file_name, timestamp, is_favorite) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![text, voice_id, file_name, timestamp, false],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_tts_history(&self) -> Result<Vec<TtsHistoryEntry>> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, text, voice_id, file_name, timestamp, is_favorite FROM tts_history ORDER BY timestamp DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(TtsHistoryEntry {
                id: row.get(0)?,
                text: row.get(1)?,
                voice_id: row.get(2)?,
                file_name: row.get(3)?,
                timestamp: row.get(4)?,
                is_favorite: row.get(5)?,
            })
        })?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row?);
        }
        Ok(entries)
    }

    pub fn toggle_tts_favorite(&self, id: i64) -> Result<()> {
        let conn = self.get_connection()?;
        conn.execute(
            "UPDATE tts_history SET is_favorite = NOT is_favorite WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn delete_tts_entry(&self, id: i64) -> Result<()> {
        let conn = self.get_connection()?;
        
        // Get file name first to delete it
        let file_name: String = conn.query_row(
            "SELECT file_name FROM tts_history WHERE id = ?1",
            [id],
            |row| row.get(0),
        )?;

        let file_path = self.recordings_dir.join(&file_name);
        if file_path.exists() {
            let _ = fs::remove_file(file_path);
        }

        conn.execute("DELETE FROM tts_history WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_meetings(&self) -> Result<Vec<Meeting>> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, title, start_timestamp, end_timestamp, duration_seconds, summary, is_pro, file_name, is_favorite 
             FROM meetings ORDER BY start_timestamp DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(Meeting {
                id: row.get(0)?,
                title: row.get(1)?,
                start_timestamp: row.get(2)?,
                end_timestamp: row.get(3)?,
                duration_seconds: row.get(4)?,
                summary: row.get(5)?,
                is_pro: row.get(6)?,
                file_name: row.get(7)?,
                is_favorite: row.get(8).unwrap_or(false),
            })
        })?;

        let mut meetings = Vec::new();
        for row in rows {
            meetings.push(row?);
        }
        Ok(meetings)
    }

    pub fn get_meeting_by_id(&self, id: i64) -> Result<Option<Meeting>> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, title, start_timestamp, end_timestamp, duration_seconds, summary, is_pro, file_name, is_favorite 
             FROM meetings WHERE id = ?1",
        )?;

        let meeting = stmt.query_row([id], |row| {
            Ok(Meeting {
                id: row.get(0)?,
                title: row.get(1)?,
                start_timestamp: row.get(2)?,
                end_timestamp: row.get(3)?,
                duration_seconds: row.get(4)?,
                summary: row.get(5)?,
                is_pro: row.get(6)?,
                file_name: row.get(7)?,
                is_favorite: row.get(8).unwrap_or(false),
            })
        }).optional()?;

        Ok(meeting)
    }

    pub fn toggle_meeting_favorite(&self, id: i64) -> Result<()> {
        let conn = self.get_connection()?;
        
        let current_favorite: bool = conn.query_row(
            "SELECT is_favorite FROM meetings WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).unwrap_or(false);

        let new_favorite = !current_favorite;

        conn.execute(
            "UPDATE meetings SET is_favorite = ?1 WHERE id = ?2",
            params![new_favorite, id],
        )?;

        Ok(())
    }

    pub fn get_meeting_segments(&self, meeting_id: i64) -> Result<Vec<MeetingSegment>> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, meeting_id, speaker_id, start_time_offset, end_time_offset, text 
             FROM meeting_segments WHERE meeting_id = ?1 ORDER BY start_time_offset ASC",
        )?;

        let rows = stmt.query_map([meeting_id], |row| {
            Ok(MeetingSegment {
                id: row.get(0)?,
                meeting_id: row.get(1)?,
                speaker_id: row.get(2)?,
                start_time_offset: row.get(3)?,
                end_time_offset: row.get(4)?,
                text: row.get(5)?,
            })
        })?;

        let mut segments = Vec::new();
        for row in rows {
            segments.push(row?);
        }
        Ok(segments)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{params, Connection};

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        conn.execute_batch(
            "CREATE TABLE transcription_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                saved BOOLEAN NOT NULL DEFAULT 0,
                title TEXT NOT NULL,
                transcription_text TEXT NOT NULL,
                post_processed_text TEXT,
                post_process_prompt TEXT
            );",
        )
        .expect("create transcription_history table");
        conn
    }

    fn insert_entry(conn: &Connection, timestamp: i64, text: &str, post_processed: Option<&str>) {
        conn.execute(
            "INSERT INTO transcription_history (file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                format!("typezero-{}.wav", timestamp),
                timestamp,
                false,
                format!("Recording {}", timestamp),
                text,
                post_processed,
                Option::<String>::None
            ],
        )
        .expect("insert history entry");
    }

    #[test]
    fn get_latest_entry_returns_none_when_empty() {
        let conn = setup_conn();
        let entry = HistoryManager::get_latest_entry_with_conn(&conn).expect("fetch latest entry");
        assert!(entry.is_none());
    }

    #[test]
    fn get_latest_entry_returns_newest_entry() {
        let conn = setup_conn();
        insert_entry(&conn, 100, "first", None);
        insert_entry(&conn, 200, "second", Some("processed"));

        let entry = HistoryManager::get_latest_entry_with_conn(&conn)
            .expect("fetch latest entry")
            .expect("entry exists");

        assert_eq!(entry.timestamp, 200);
        assert_eq!(entry.transcription_text, "second");
        assert_eq!(entry.post_processed_text.as_deref(), Some("processed"));
    }
}
