import React, { useState, useEffect, useMemo } from "react";
import {
    Languages,
    Mic,
    StopCircle,
    Copy,
    RotateCcw,
    ArrowRightLeft,
    ChevronDown,
    Sparkles,
    Play,
    Star,
    Trash2,
    Search,
    Filter,
    History
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import { toast } from "sonner";
import { ErrorBoundary } from "../ErrorBoundary";
import { TranslationLibrary, HistoryItem } from "./TranslationLibrary";

// --- Types ---



const SUPPORTED_LANGUAGES = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "it", name: "Italian", flag: "🇮🇹" },
    { code: "pt", name: "Portuguese", flag: "🇵🇹" },
    { code: "nl", name: "Dutch", flag: "🇳🇱" },
    { code: "pl", name: "Polish", flag: "🇵🇱" },
    { code: "ru", name: "Russian", flag: "🇷🇺" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
];

function TranslationScreen() {
    const { t } = useTranslation();
    const [mode, setMode] = useState<"voice" | "text">("voice");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [sourceLang, setSourceLang] = useState("en");
    const [targetLang, setTargetLang] = useState("es");

    const [sourceText, setSourceText] = useState("");
    const [translatedText, setTranslatedText] = useState("");

    // History Update Trigger
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    const handleTextTranslate = async () => {
        if (!sourceText.trim()) return;
        setIsProcessing(true);
        try {
            const result = await commands.translateText(sourceText, sourceLang, targetLang);
            if (result.status === "ok") {
                setTranslatedText(result.data);
                addToHistory(sourceText, result.data, sourceLang, targetLang);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Translation failed:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("401") || errorMessage.includes("unauthorized") || errorMessage.includes("key")) {
                toast.error(`Translation failed: Please check your API Key in Settings > Post-Processing. (${errorMessage})`);
            } else if (errorMessage.includes("error sending request for url") || errorMessage.includes("Connection refused") || errorMessage.includes("11434")) {
                toast.error(`Translation failed: Unable to connect to your local AI model. Please ensure Ollama is running or check your Post-Processing provider settings.`);
            } else {
                toast.error(`Translation failed: ${errorMessage}`);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const addToHistory = (source: string, translated: string, sLang: string, tLang: string) => {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            sourceText: source,
            translatedText: translated,
            sourceLang: sLang,
            targetLang: tLang,
            timestamp: Date.now(),
            isFavorite: false
        };

        try {
            const saved = localStorage.getItem("translation-history");
            const existingHistory: HistoryItem[] = saved ? JSON.parse(saved) : [];
            const newHistory = [newItem, ...existingHistory];
            localStorage.setItem("translation-history", JSON.stringify(newHistory));
            setLastUpdate(Date.now());
        } catch (e) {
            console.error("Failed to save history", e);
        }
    };

    // --- Render Helpers ---

    return (
        <div className="w-full h-full flex flex-col text-text overflow-hidden">
            {/* Header Region */}
            <div className="flex-none p-6 pb-4 z-10">
                <div className="max-w-4xl mx-auto w-full space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-text dark:text-white">
                                Translate
                            </h1>
                            <p className="text-text-muted mt-1 font-medium">Break language barriers with AI.</p>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex items-center gap-1 p-1.5 bg-white/20 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5 backdrop-blur-sm">
                            <button
                                onClick={() => setMode("voice")}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === "voice"
                                    ? "bg-accent/20 text-accent shadow-sm border border-accent/10"
                                    : "text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/5"
                                    }`}
                            >
                                Voice
                            </button>
                            <button
                                onClick={() => setMode("text")}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === "text"
                                    ? "bg-accent/20 text-accent shadow-sm border border-accent/10"
                                    : "text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/5"
                                    }`}
                            >
                                Text
                            </button>
                        </div>
                    </div>

                    {/* Language Selectors */}
                    <div className="flex items-center gap-4 bg-white/20 dark:bg-white/5 p-2 rounded-2xl border border-white/20 dark:border-white/5 backdrop-blur-md">
                        <select
                            value={sourceLang}
                            onChange={(e) => setSourceLang(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm font-medium text-text focus:outline-none cursor-pointer hover:text-accent transition-colors text-center appearance-none py-2"
                        >
                            {SUPPORTED_LANGUAGES.map(l => (
                                <option key={l.code} value={l.code} className="bg-background text-text">{l.flag}  {l.name}</option>
                            ))}
                        </select>

                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/30 dark:bg-white/10 text-text-muted">
                            <ArrowRightLeft className="w-4 h-4" />
                        </div>

                        <select
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm font-medium text-text focus:outline-none cursor-pointer hover:text-accent transition-colors text-center appearance-none py-2"
                        >
                            {SUPPORTED_LANGUAGES.map(l => (
                                <option key={l.code} value={l.code} className="bg-background text-text">{l.flag}  {l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Region */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">

                    {/* Input Area */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Source Card */}
                        <div className="group bg-white/20 dark:bg-white/5 hover:bg-white/30 dark:hover:bg-white/[0.07] border border-white/20 dark:border-white/10 rounded-3xl p-6 min-h-[240px] flex flex-col transition-all duration-300 shadow-xl shadow-black/5 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                                    {SUPPORTED_LANGUAGES.find(l => l.code === sourceLang)?.name}
                                </span>
                                {sourceText && (
                                    <button onClick={() => setSourceText("")} className="text-text-muted hover:text-white transition-colors">
                                        <RotateCcw size={14} />
                                    </button>
                                )}
                            </div>

                            {mode === "text" ? (
                                <textarea
                                    className="flex-1 bg-transparent border-none resize-none focus:outline-none text-xl leading-relaxed p-0 placeholder:text-text-muted/30"
                                    placeholder="Enter text to translate..."
                                    value={sourceText}
                                    onChange={(e) => setSourceText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleTextTranslate();
                                        }
                                    }}
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <button
                                        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${isRecording
                                            ? "bg-red-500/20 text-red-500 shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)] scale-110"
                                            : "bg-accent/10 text-accent hover:bg-accent/20 hover:scale-105"
                                            }`}
                                        onClick={() => setIsRecording(!isRecording)}
                                    >
                                        {isRecording ? <StopCircle className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                                    </button>
                                    <p className={`text-sm font-medium transition-colors ${isRecording ? "text-red-400 animate-pulse" : "text-text-muted"}`}>
                                        {isRecording ? "Listening..." : "Click to Speak"}
                                    </p>
                                </div>
                            )}

                            {mode === "text" && (
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleTextTranslate}
                                        disabled={!sourceText.trim() || isProcessing}
                                        className="bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20 active:scale-95"
                                    >
                                        {isProcessing ? "Translating..." : "Translate"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Target Card */}
                        <div className="relative group bg-gradient-to-br from-white/20 dark:from-white/5 to-transparent dark:to-white/[0.02] border border-white/20 dark:border-white/10 rounded-3xl p-6 min-h-[240px] flex flex-col overflow-hidden transition-all duration-300 shadow-xl shadow-black/5">
                            {/* Decorative Sparkle */}
                            <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none">
                                <Sparkles className="w-48 h-48" />
                            </div>

                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <span className="text-xs font-bold text-accent uppercase tracking-widest">
                                    {SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    {translatedText && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(translatedText);
                                                toast.success("Copied to clipboard");
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-text dark:hover:text-white transition-colors"
                                            title="Copy Translation"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 relative z-10">
                                {translatedText ? (
                                    <p className="text-xl leading-relaxed animate-in fade-in duration-500">{translatedText}</p>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-text-muted/20 text-sm font-medium italic">
                                        Translation will appear here
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-sm">
                                <History size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">Translation Library</h2>
                                <p className="text-sm text-text-muted">Manage your translation history</p>
                            </div>
                        </div>

                        <div className="h-px w-full bg-gradient-to-r from-gray-200 dark:from-white/10 via-gray-100 dark:via-white/5 to-transparent mb-8" />

                        <TranslationLibrary
                            lastUpdate={lastUpdate}
                            onSelect={(item) => {
                                setSourceText(item.sourceText);
                                setSourceLang(item.sourceLang);
                                setTargetLang(item.targetLang);
                                setTranslatedText(item.translatedText);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TranslationScreenWrapper() {
    return (
        <ErrorBoundary>
            <TranslationScreen />
        </ErrorBoundary>
    );
}
