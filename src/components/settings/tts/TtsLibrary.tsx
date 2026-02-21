import React, { useState, useEffect } from "react";
import {
    Search,
    Star,
    Play,
    Pause,
    Folder,
    Trash2,
    Clock,
    Filter,
    MessageSquare,
    User,
    ChevronRight,
    Loader2
} from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { commands } from "../../../bindings";
import { toast } from "sonner";
import { format } from "date-fns";

interface TtsHistoryEntry {
    id: number;
    text: String;
    voice_id: String;
    file_name: String;
    timestamp: number;
    is_favorite: boolean;
}

export const TtsLibrary: React.FC = () => {
    const [history, setHistory] = useState<TtsHistoryEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const result = await commands.getTtsHistory();
            if (result.status === "ok") {
                setHistory(result.data as any);
            }
        } catch (e) {
            console.error("Failed to fetch TTS history:", e);
            toast.error("Failed to load library");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const toggleFavorite = async (id: number) => {
        try {
            const result = await commands.toggleTtsFavorite(id);
            if (result.status === "ok") {
                setHistory(prev => prev.map(item =>
                    item.id === id ? { ...item, is_favorite: !item.is_favorite } : item
                ));
            }
        } catch (e) {
            toast.error("Failed to update favorite");
        }
    };

    const deleteEntry = async (id: number) => {
        try {
            const result = await commands.deleteTtsEntry(id);
            if (result.status === "ok") {
                setHistory(prev => prev.filter(item => item.id !== id));
                toast.success("Deleted from library");
            }
        } catch (e) {
            toast.error("Failed to delete entry");
        }
    };

    const playAudio = async (item: TtsHistoryEntry) => {
        if (playingId === item.id) {
            audio?.pause();
            setPlayingId(null);
            return;
        }

        try {
            if (audio) {
                audio.pause();
                audio.src = ""; // Clear src to stop loading
                audio.load();
            }

            const pathResult = await commands.getAudioFilePath(item.file_name as string);
            if (pathResult.status === "ok") {
                const assetUrl = convertFileSrc(pathResult.data as string);
                console.log("Playing local audio from:", assetUrl);

                const newAudio = new Audio(assetUrl);
                setAudio(newAudio);
                setPlayingId(item.id);

                newAudio.play().catch(err => {
                    console.error("Playback error:", err);
                    if (err.name !== 'AbortError') {
                        toast.error("Playback failed");
                    }
                    setPlayingId(null);
                });

                newAudio.onended = () => {
                    setPlayingId(null);
                    setAudio(null);
                };

                newAudio.onerror = (e) => {
                    console.error("Audio error:", e);
                    toast.error("Audio file not found or corrupted");
                    setPlayingId(null);
                    setAudio(null);
                };
            }
        } catch (e) {
            toast.error("Failed to play audio");
        }
    };

    const findInFolder = async (fileName: string) => {
        try {
            await commands.openRecordingsFolder(); // Use existing command to open folder
            toast.info("Opened recordings folder");
        } catch (e) {
            toast.error("Failed to open folder");
        }
    };

    const filteredHistory = history.filter(item => {
        const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.voice_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFavorite = showFavoritesOnly ? item.is_favorite : true;
        return matchesSearch && matchesFavorite;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Search history..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-mac text-sm ${showFavoritesOnly
                            ? "bg-accent/10 border-accent/20 text-accent"
                            : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"
                            }`}
                    >
                        <Star size={16} fill={showFavoritesOnly ? "currentColor" : "none"} />
                        <span>Favorites</span>
                    </button>

                    <div className="h-8 w-px bg-white/10 hidden md:block" />

                    <div className="text-xs text-text-muted font-medium bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                        {filteredHistory.length} Saved Items
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="mac-card py-16 flex flex-col items-center justify-center opacity-40 bg-white/5 border-dashed">
                    <Clock size={48} className="mb-4" />
                    <p className="text-sm font-medium">No saved speeches found</p>
                    <p className="text-xs">Your generated TTS history will appear here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filteredHistory.map((item) => (
                        <div
                            key={item.id}
                            className="group mac-card p-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex items-center gap-4"
                        >
                            <button
                                onClick={() => playAudio(item)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${playingId === item.id
                                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                                    : "bg-white/10 text-accent group-hover:bg-accent group-hover:text-white"
                                    }`}
                            >
                                {playingId === item.id ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold tracking-widest uppercase py-0.5 px-2 bg-accent/10 text-accent rounded-full border border-accent/10">
                                        ID: {item.id}
                                    </span>
                                    <span className="text-[10px] font-medium text-text-muted flex items-center gap-1">
                                        <Clock size={10} />
                                        {format(new Date(item.timestamp * 1000), "MMM d, h:mm a")}
                                    </span>
                                </div>
                                <h4 className="text-[13px] font-medium truncate text-white/90 mb-1 leading-tight group-hover:text-white transition-colors">
                                    {item.text}
                                </h4>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                        <User size={12} className="opacity-50" />
                                        <span className="font-mono">{item.voice_id}</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                        <MessageSquare size={12} className="opacity-50" />
                                        <span>{item.text.length} chars</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => toggleFavorite(item.id)}
                                    className={`p-2 rounded-lg transition-mac ${item.is_favorite
                                        ? "text-amber-400 hover:bg-amber-400/10"
                                        : "text-text-muted hover:bg-white/10 hover:text-white"
                                        }`}
                                    title={item.is_favorite ? "Remove from favorites" : "Add to favorites"}
                                >
                                    <Star size={18} fill={item.is_favorite ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={() => findInFolder(item.file_name as string)}
                                    className="p-2 text-text-muted hover:bg-white/10 hover:text-white rounded-lg transition-mac"
                                    title="Show in recordings folder"
                                >
                                    <Folder size={18} />
                                </button>
                                <button
                                    onClick={() => deleteEntry(item.id)}
                                    className="p-2 text-text-muted hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-mac"
                                    title="Delete entry"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <ChevronRight size={16} className="text-white/5 group-hover:text-white/20 transition-colors mr-2" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
