import React, { useState, useEffect } from "react";
import { Volume2, Play, Loader2, Sparkles, Sliders, Mic2, Download, RefreshCcw } from "lucide-react";
import { useSettings } from "../../../hooks/useSettings";
import { Select } from "../../ui/Select";
import { commands } from "../../../bindings";
import { ProGate } from "../../shared/ProGate";
import { useAuthStore } from "../../../stores/authStore";
import { toast } from "sonner";
import { TtsLibrary } from "./TtsLibrary";

export const TtsSettings: React.FC = () => {
    // ...
    const { settings, updateSetting } = useSettings();
    const [voices, setVoices] = useState<string[]>([]);
    const [isTesting, setIsTesting] = useState(false);
    const [serviceStatus, setServiceStatus] = useState<boolean | null>(null);
    const [diagnostics, setDiagnostics] = useState<any>(null);
    const [testText, setTestText] = useState("Hello, this is a test of TypeZero local speech synthesis.");
    const { dailyUsage, checkAndResetDaily, isPro } = useAuthStore();

    useEffect(() => {
        checkAndResetDaily();
    }, []);

    const checkStatus = async (manual = false) => {
        try {
            const result = await commands.getTtsStatus();
            if (result.status === "ok") {
                setServiceStatus(result.data);
                if (manual) toast.success(`TTS Service is ${result.data ? "Active" : "Inactive"}`);

                if (!result.data) {
                    const diag = await commands.getTtsDiagnostics();
                    if (diag.status === "ok") {
                        setDiagnostics(diag.data);
                    }
                } else {
                    setDiagnostics(null);
                }
            }
        } catch (e) {
            console.error("Failed to check service status:", e);
            if (manual) toast.error("Failed to check TTS status");
        }
    };

    const fetchVoices = async () => {
        try {
            const result = await commands.getTtsVoices();
            if (result.status === "ok") {
                setVoices(result.data);
            }
        } catch (e) {
            console.error("Failed to fetch voices:", e);
        }
    };

    useEffect(() => {
        fetchVoices();
        checkStatus();

        const interval = setInterval(() => checkStatus(false), 5000);
        return () => clearInterval(interval);
    }, []);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const handleTest = async () => {
        if (isTesting) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setIsTesting(false);
            return;
        }

        try {
            setIsTesting(true);
            const result = await commands.speak({ text: testText });

            if (result.status === "ok") {
                const uint8Array = new Uint8Array(result.data);
                const blob = new Blob([uint8Array], { type: "audio/wav" });
                const url = URL.createObjectURL(blob);

                // Clean up previous audio
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.src = "";
                }

                const newAudio = new Audio(url);
                audioRef.current = newAudio;

                newAudio.play().then(() => {
                    console.log("Audio playback started successfully");
                }).catch((e: any) => {
                    if (e.name !== 'AbortError') {
                        console.error("Audio.play() failed:", e);
                        toast.error("Audio playback failed: " + e.message);
                    }
                    setIsTesting(false);
                });

                newAudio.onended = () => {
                    setIsTesting(false);
                    URL.revokeObjectURL(url);
                    audioRef.current = null;
                };

                newAudio.onerror = (e) => {
                    console.error("Audio element error:", e);
                    toast.error("Audio playback error occurred");
                    setIsTesting(false);
                    URL.revokeObjectURL(url);
                    audioRef.current = null;
                };
            } else {
                toast.error("TTS generation failed: " + result.error);
                setIsTesting(false);
            }
        } catch (error) {
            console.error("handleTest crash:", error);
            toast.error("An unexpected error occurred during playback");
            setIsTesting(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="mac-title text-3xl mb-1 flex items-center gap-3">
                        <Volume2 className="text-accent" />
                        Speech Synthesis
                    </h1>
                    <p className="mac-muted text-sm">Local, high-quality AI speech synthesis</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => checkStatus(true)}
                        className="p-2 hover:bg-white/10 rounded-full transition-mac"
                        title="Refresh Status"
                    >
                        <RefreshCcw size={16} className={`text-text-muted ${!serviceStatus ? 'animate-spin' : ''}`} />
                    </button>
                    <div className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-mac ${serviceStatus
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${serviceStatus ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse"}`} />
                        <span className="text-[11px] font-bold tracking-wider uppercase">
                            {serviceStatus ? "Service Active" : "Initializing..."}
                        </span>
                    </div>
                </div>
            </div>

            {/* Diagnostics Panel for when service is failing */}
            {!serviceStatus && diagnostics && (
                <div className="mac-card p-4 bg-amber-500/5 border-amber-500/10 text-xs space-y-2 mb-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 font-bold text-amber-500 mb-1">
                        <Loader2 size={14} className="animate-spin" />
                        <span>ENVIRONMENT DIAGNOSTICS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono opacity-80">
                        <span>Python Path:</span> <span className="text-right truncate">{diagnostics.python_path || "None"}</span>
                        <span>Python Exists:</span> <span className="text-right font-bold">{diagnostics.python_exists ? "YES" : "NO"}</span>
                        <span>Python Version:</span> <span className="text-right">{diagnostics.python_version || "Unknown"}</span>
                        <span>Server Script:</span> <span className="text-right font-bold">{diagnostics.server_script_exists ? "FOUND" : "NOT FOUND"}</span>
                    </div>
                    {!diagnostics.python_exists && (
                        <p className="text-[11px] mt-2 italic text-amber-500/80 p-2 bg-amber-500/10 rounded-lg">
                            Local environment `tts_env` not found. Please ensure Python dependencies are installed.
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Voice Selection */}
                <div className="mac-card p-6 bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 backdrop-blur-xl space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={18} className="text-accent" />
                        <h3 className="text-sm font-semibold tracking-wide uppercase opacity-60">Voice Model</h3>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[13px] text-text-muted block">Primary Voice</label>
                        <ProGate featureName="Premium Voices">
                            <Select
                                options={voices.length > 0 ? voices.map(v => ({ value: v, label: v })) : [{ value: "v3_en_0", label: "v3_en_0 (Default)" }]}
                                value={settings?.tts_voice || (voices.length > 0 ? voices[0] : "v3_en_0")}
                                onChange={(val) => updateSetting("tts_voice", val as string)}
                                disabled={!isPro}
                                className="w-full"
                            />
                        </ProGate>
                    </div>

                    <div className="pt-2">
                        <label className="text-[13px] text-text-muted block mb-2">Test Voice</label>
                        <textarea
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            placeholder="Type something to hear how it sounds..."
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none h-24 placeholder:text-text-muted/50 text-text"
                        />
                    </div>

                    <div className="pt-2">
                        <div className="flex justify-between text-[11px] mb-1.5">
                            <span className="text-text-muted">Daily Limit (Characters)</span>
                            <span className={dailyUsage.ttsCharacters > 800 && !isPro ? "text-amber-500" : "text-text-muted"}>
                                {dailyUsage.ttsCharacters} / {isPro ? "∞" : "1,000"}
                            </span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${dailyUsage.ttsCharacters > 800 && !isPro ? "bg-amber-500" : "bg-accent"}`}
                                style={{ width: isPro ? "0%" : `${Math.min(100, (dailyUsage.ttsCharacters / 1000) * 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleTest}
                            disabled={isTesting || !serviceStatus || (dailyUsage.ttsCharacters >= 1000 && !isPro) || !testText.trim()}
                            className="flex-1 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl flex items-center justify-center gap-2 transition-mac active:scale-95 disabled:opacity-50 text-text"
                        >
                            {isTesting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                            <span className="text-sm font-medium">Speak</span>
                        </button>
                        <button
                            onClick={async () => {
                                if (isTesting) return;
                                setIsTesting(true);
                                try {
                                    const result = await commands.speak({ text: testText });
                                    if (result.status === "ok") {
                                        const blob = new Blob([new Uint8Array(result.data)], { type: "audio/wav" });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = `tts-${Date.now()}.wav`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    } else {
                                        toast.error("Failed to generate audio: " + result.error);
                                    }
                                } catch (e) {
                                    toast.error("Failed to export audio");
                                } finally {
                                    setIsTesting(false);
                                }
                            }}
                            disabled={isTesting || !serviceStatus || (dailyUsage.ttsCharacters >= 1000 && !isPro) || !testText.trim()}
                            className="flex-1 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl flex items-center justify-center gap-2 transition-mac active:scale-95 disabled:opacity-50 shadow-lg shadow-accent/20"
                        >
                            <Download size={18} />
                            <span className="text-sm font-bold">Download</span>
                        </button>
                    </div>
                </div>

                {/* Speech Settings */}
                <div className="mac-card p-6 bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 backdrop-blur-xl space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Sliders size={18} className="text-accent" />
                        <h3 className="text-sm font-semibold tracking-wide uppercase opacity-60">Engine Controls</h3>
                    </div>

                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            <div className="space-y-0.5 text-left">
                                <p className="text-sm font-medium">Enable Synthesis</p>
                                <p className="text-[11px] text-text-muted">Toggle local synthesis</p>
                            </div>
                            <button
                                onClick={() => updateSetting("tts_enabled", !settings?.tts_enabled)}
                                className={`w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent/50 ${settings?.tts_enabled ? 'bg-accent' : 'bg-black/20 dark:bg-white/20'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${settings?.tts_enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                            </button>
                        </div>

                        <div className="space-y-3 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[13px] text-text-muted font-medium">Speaking Speed</label>
                                <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-md">{settings?.tts_speed || 1.0}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={settings?.tts_speed || 1.0}
                                onChange={(e) => updateSetting("tts_speed", parseFloat(e.target.value))}
                                className="w-full accent-accent bg-black/10 dark:bg-white/10 h-2 rounded-lg appearance-none cursor-pointer shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Voice Selection row ... */}

            {/* Library Section */}
            <div className="pt-8 space-y-6">
                <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-sm">
                        <RefreshCcw size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Speech Library</h2>
                        <p className="text-sm text-text-muted">Manage and replay your generated audio history</p>
                    </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8" />

                <TtsLibrary />
            </div>

            {/* Info Card */}
            <div className="mac-card p-6 bg-accent/5 border-accent/10 flex gap-4 items-start mt-12">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                    <Mic2 size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-bold mb-1">Local Processing Only</h4>
                    <p className="text-xs mac-muted leading-relaxed">
                        Coqui TTS is running locally on your hardware. Your text is processed entirely within TypeZero, and no audio data is ever sent to external servers. High-quality synthesis may increase system usage during generation.
                    </p>
                </div>
            </div>
        </div>
    );
};
