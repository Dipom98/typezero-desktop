import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AudioPlayer } from "../../ui/AudioPlayer";
import {
  Copy,
  Star,
  Check,
  Trash2,
  FolderOpen,
  Loader2,
  Search,
  Clock,
  ExternalLink,
  History,
  Volume2
} from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readFile } from "@tauri-apps/plugin-fs";
import { commands, type HistoryEntry } from "@/bindings";
import { formatDateTime } from "@/utils/dateFormat";
import { useOsType } from "@/hooks/useOsType";

export const HistorySettings: React.FC = () => {
  const { t } = useTranslation();
  const osType = useOsType();
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [viewMode, setViewMode] = useState<"all" | "favorites">("all");

  const loadHistoryEntries = useCallback(async () => {
    try {
      const result = await commands.getHistoryEntries();
      if (result.status === "ok") {
        setHistoryEntries(result.data);
      }
    } catch (error) {
      console.error("Failed to load history entries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryEntries();
    const setupListener = async () => {
      const unlisten = await listen("history-updated", () => {
        loadHistoryEntries();
      });
      return unlisten;
    };
    let unlistenPromise = setupListener();
    return () => {
      unlistenPromise.then((unlisten) => {
        if (unlisten) unlisten();
      });
    };
  }, [loadHistoryEntries]);

  const filteredEntries = useMemo(() => {
    return historyEntries.filter(entry => {
      const matchesSearch = (entry.transcription_text || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = viewMode === "all" || (viewMode === "favorites" && entry.saved);
      return matchesSearch && matchesFilter;
    });
  }, [historyEntries, searchQuery, viewMode]);

  const toggleSaved = async (id: number) => {
    try {
      await commands.toggleHistoryEntrySaved(id);
      // Optimistically update or wait for reload? 
      // toggleHistoryEntrySaved emits "history-updated", so reload should happen.
    } catch (error) {
      console.error("Failed to toggle saved status:", error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getAudioUrl = useCallback(
    async (fileName: string) => {
      try {
        const result = await commands.getAudioFilePath(fileName);
        if (result.status === "ok") {
          if (osType === "linux") {
            const fileData = await readFile(result.data);
            const blob = new Blob([fileData], { type: "audio/wav" });
            return URL.createObjectURL(blob);
          }
          return convertFileSrc(result.data, "asset");
        }
        return null;
      } catch (error) {
        console.error("Failed to get audio file path:", error);
        return null;
      }
    },
    [osType],
  );

  const deleteAudioEntry = async (id: number) => {
    try {
      await commands.deleteHistoryEntry(id);
    } catch (error) {
      console.error("Failed to delete audio entry:", error);
      throw error;
    }
  };

  const openRecordingsFolder = async () => {
    try {
      await commands.openRecordingsFolder();
    } catch (error) {
      console.error("Failed to open recordings folder:", error);
    }
  };

  return (
    <div className="w-full space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="mac-title text-3xl">Transcription History</h1>
          <p className="mac-muted text-sm">Review your past recordings and transcriptions.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "all" ? "bg-accent text-white shadow-sm" : "text-text-muted hover:text-text"}`}
            >
              All
            </button>
            <button
              onClick={() => setViewMode("favorites")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "favorites" ? "bg-accent text-white shadow-sm" : "text-text-muted hover:text-text"}`}
            >
              Favorites
            </button>
          </div>
          <button
            onClick={openRecordingsFolder}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-[13px] font-bold"
          >
            <FolderOpen size={16} />
            Reveal in Finder
          </button>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-colors group-focus-within:text-accent">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search transcriptions..."
          className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-black dark:text-text rounded-2xl py-3.5 pl-12 pr-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-gray-500 dark:placeholder:text-text-muted/40 backdrop-blur-xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="mac-muted text-sm font-medium">Fetching history...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="mac-card flex flex-col items-center justify-center py-20 text-center bg-white/[0.02]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <History size={32} className="text-text-muted opacity-20" />
            </div>
            <p className="mac-title text-xl mb-2">No results found</p>
            <p className="mac-muted text-sm">Your transcription history is currently empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredEntries.map((entry) => (
              <HistoryEntryComponent
                key={entry.id}
                entry={entry}
                onToggleSaved={() => toggleSaved(entry.id)}
                onCopyText={() => copyToClipboard(entry.transcription_text)}
                getAudioUrl={getAudioUrl}
                deleteAudio={deleteAudioEntry}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface HistoryEntryProps {
  entry: HistoryEntry;
  onToggleSaved: () => void;
  onCopyText: () => void;
  getAudioUrl: (fileName: string) => Promise<string | null>;
  deleteAudio: (id: number) => Promise<void>;
}

const HistoryEntryComponent: React.FC<HistoryEntryProps> = ({
  entry,
  onToggleSaved,
  onCopyText,
  getAudioUrl,
  deleteAudio,
}) => {
  const { i18n } = useTranslation();
  const [showCopied, setShowCopied] = useState(false);

  const formattedDate = formatDateTime(String(entry.timestamp), i18n.language);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopyText = () => {
    onCopyText();
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleSpeak = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const result = await commands.speak({ text: entry.transcription_text });
      if (result.status === "ok") {
        const blob = new Blob([new Uint8Array(result.data)], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => setIsSpeaking(false);
      } else {
        setIsSpeaking(false);
      }
    } catch (e) {
      console.error(e);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="group mac-card p-6 flex flex-col gap-6 hover:bg-white/[0.04] transition-all duration-300">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-accent">
            <Clock size={14} />
            <span className="text-[13px] font-bold tracking-tight">{formattedDate}</span>
          </div>
          <h3 className="text-lg font-bold line-clamp-1">{entry.title || "Untitled Recording"}</h3>
        </div>

        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleSpeak}
            disabled={isSpeaking}
            className={`p-2.5 rounded-xl hover:bg-accent/10 hover:text-accent transition-all ${isSpeaking ? "text-accent bg-accent/10 animate-pulse" : ""}`}
            title="Read Aloud"
          >
            <Volume2 size={18} />
          </button>
          <button
            onClick={handleCopyText}
            className="p-2.5 rounded-xl hover:bg-accent/10 hover:text-accent transition-all"
            title="Copy Text"
          >
            {showCopied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button
            onClick={onToggleSaved}
            className={`p-2.5 rounded-xl transition-all ${entry.saved ? "text-amber-500 bg-amber-500/10" : "hover:bg-amber-500/10 hover:text-amber-500"}`}
            title={entry.saved ? "Unsave" : "Save"}
          >
            <Star size={18} fill={entry.saved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => deleteAudio(entry.id)}
            className="p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl p-5 border border-white/5 group-hover:border-white/10 transition-all">
        <p className="text-[15px] leading-relaxed text-text/90 select-text selection:bg-accent/30 tracking-tight">
          {entry.transcription_text}
        </p>
      </div>

      <div className="w-full pt-2">
        <AudioPlayer
          onLoadRequest={() => getAudioUrl(entry.file_name)}
          className="w-full h-10"
        />
      </div>
    </div>
  );
};
