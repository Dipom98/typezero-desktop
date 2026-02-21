import React, { useState, useEffect } from "react";
import {
    Search,
    Star,
    Trash2,
    Clock,
    Copy,
    ArrowRight,
    Languages,
    Play,
    Loader2
} from "lucide-react";
import { useSettings } from "../../hooks/useSettings";
import { commands } from "@/bindings";
import { toast } from "sonner";
import { format } from "date-fns";

export interface HistoryItem {
    id: string;
    sourceText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
    timestamp: number;
    isFavorite: boolean;
}

interface TranslationLibraryProps {
    onSelect: (item: HistoryItem) => void;
    lastUpdate?: number;
}

export const TranslationLibrary: React.FC<TranslationLibraryProps> = ({ onSelect, lastUpdate }) => {
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("translation-history");
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, [lastUpdate]);

    const saveHistory = (newHistory: HistoryItem[]) => {
        setHistory(newHistory);
        localStorage.setItem("translation-history", JSON.stringify(newHistory));
    };

    const toggleFavorite = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newHistory = history.map(item =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
        );
        saveHistory(newHistory);
    };

    const deleteEntry = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newHistory = history.filter(item => item.id !== id);
        saveHistory(newHistory);
        toast.success("Deleted from library");
    };

    const copyText = (text: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard");
        } else {
            toast.error("Clipboard not available");
        }
    };

    const playHistoryItem = async (text: string, lang: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            toast.info("Generating audio...");
            const result = await commands.speak({ text });
            if (result.status === "ok") {
                const blob = new Blob([new Uint8Array(result.data)], { type: "audio/wav" });
                const url = URL.createObjectURL(blob);

                // Cleanup previous audio if exists
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.src = "";
                }

                const audio = new Audio(url);
                audioRef.current = audio;

                audio.play().catch(err => {
                    console.error("Audio play failed:", err);
                    toast.error("Audio playback blocked. Please click again.");
                });

                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    audioRef.current = null;
                };
            } else {
                toast.error("TTS Failed: " + result.error);
            }
        } catch (err) {
            console.error("TTS play error:", err);
            toast.error("Failed to play audio");
        }
    };

    const filteredHistory = history.filter(item => {
        const matchesSearch =
            item.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.translatedText.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFavorite = showFavoritesOnly ? item.isFavorite : true;
        return matchesSearch && matchesFavorite;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Search translations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm ${showFavoritesOnly
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

            {filteredHistory.length === 0 ? (
                <div className="mac-card py-16 flex flex-col items-center justify-center opacity-40 bg-[#1a1a1a]/40 border-dashed">
                    <Clock size={48} className="mb-4" />
                    <p className="text-sm font-medium">No saved translations found</p>
                    <p className="text-xs">Your translation history will appear here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filteredHistory.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className="group mac-card p-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex items-center gap-4 cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-accent group-hover:bg-accent group-hover:text-white transition-all">
                                <Languages size={20} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase py-0.5 px-2 bg-accent/10 text-accent rounded-full border border-accent/10">
                                        <span>{item.sourceLang}</span>
                                        <ArrowRight size={10} className="mx-0.5" />
                                        <span>{item.targetLang}</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-text-muted flex items-center gap-1">
                                        <Clock size={10} />
                                        {format(new Date(item.timestamp), "MMM d, h:mm a")}
                                    </span>
                                </div>
                                <h4 className="text-[13px] font-medium truncate text-white/90 mb-1 leading-tight group-hover:text-white transition-colors">
                                    {item.sourceText}
                                </h4>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                        <Copy size={12} className="opacity-50" />
                                        <span className="truncate max-w-[300px]">{item.translatedText}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => playHistoryItem(item.translatedText, item.targetLang, e)}
                                    className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-mac"
                                    title="Play translation"
                                >
                                    <Play size={18} fill="currentColor" />
                                </button>
                                <button
                                    onClick={(e) => toggleFavorite(item.id, e)}
                                    className={`p-2 rounded-lg transition-mac ${item.isFavorite
                                        ? "text-amber-400 hover:bg-amber-400/10"
                                        : "text-text-muted hover:bg-white/10 hover:text-white"
                                        }`}
                                    title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                                >
                                    <Star size={18} fill={item.isFavorite ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={(e) => copyText(item.translatedText, e)}
                                    className="p-2 text-text-muted hover:bg-white/10 hover:text-white rounded-lg transition-mac"
                                    title="Copy translation"
                                >
                                    <Copy size={18} />
                                </button>
                                <button
                                    onClick={(e) => deleteEntry(item.id, e)}
                                    className="p-2 text-text-muted hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-mac"
                                    title="Delete entry"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
