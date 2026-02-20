import React, { useState, useEffect } from "react";
import {
    Search,
    Star,
    Trash2,
    Clock,
    Copy,
    ArrowRight
} from "lucide-react";
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
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
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
                <div className="p-16 flex flex-col items-center justify-center opacity-40 bg-white/5 border border-white/10 border-dashed rounded-3xl">
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
                            className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-300 cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                            <span className="text-text-muted bg-white/5 px-2 py-0.5 rounded">{item.sourceLang}</span>
                                            <ArrowRight size={10} className="text-text-muted" />
                                            <span className="text-accent bg-accent/10 px-2 py-0.5 rounded  border border-accent/10">{item.targetLang}</span>
                                        </div>
                                        <span className="text-[10px] font-medium text-text-muted flex items-center gap-1 ml-auto md:ml-0">
                                            <Clock size={10} />
                                            {format(new Date(item.timestamp), "MMM d, h:mm a")}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-text-muted mb-0.5 font-medium uppercase tracking-wider opacity-70">Original</p>
                                            <p className="text-sm text-text font-medium leading-relaxed line-clamp-2">{item.sourceText}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-accent mb-0.5 font-medium uppercase tracking-wider opacity-70">Translation</p>
                                            <p className="text-sm text-text-muted leading-relaxed line-clamp-2">{item.translatedText}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 top-3 bg-black/20 backdrop-blur-md p-1 rounded-lg border border-white/5">
                                    <button
                                        onClick={(e) => toggleFavorite(item.id, e)}
                                        className={`p-2 rounded-lg transition-colors ${item.isFavorite
                                            ? "text-amber-400 hover:bg-amber-400/10"
                                            : "text-text-muted hover:bg-white/10 hover:text-white"
                                            }`}
                                        title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                                    >
                                        <Star size={16} fill={item.isFavorite ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={(e) => copyText(item.translatedText, e)}
                                        className="p-2 text-text-muted hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                                        title="Copy translation"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => deleteEntry(item.id, e)}
                                        className="p-2 text-text-muted hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                                        title="Delete entry"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
