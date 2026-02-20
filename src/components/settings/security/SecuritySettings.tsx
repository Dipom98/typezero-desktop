import React from "react";
import { ShieldCheck, Lock, EyeOff, HardDrive, Cpu, WifiOff } from "lucide-react";
import { TelemetryToggle } from "../TelemetryToggle";

export const SecuritySettings: React.FC = () => {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-2">
                <h1 className="mac-title text-3xl mb-1 flex items-center gap-3">
                    <ShieldCheck className="text-emerald-500" />
                    Security & Privacy
                </h1>
                <p className="mac-muted text-sm">Transparency on how TypeZero handles your data</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="mac-card p-6 bg-white/5 border-white/10 backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <WifiOff size={18} />
                        </div>
                        <h3 className="font-semibold">Local-First Architecture</h3>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                        TypeZero is designed to work entirely offline. Transcription, speech synthesis, and post-processing happen on your local machine. No audio or text data is sent to our servers for processing.
                    </p>
                </div>

                <div className="mac-card p-6 bg-white/5 border-white/10 backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Lock size={18} />
                        </div>
                        <h3 className="font-semibold">End-to-End Privacy</h3>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                        Your settings and history are stored in a local SQLite database. We do not track what you dictate or synthesize. The only data we collect is minimal telemetry for stability, which can be disabled.
                    </p>
                </div>
            </div>

            <div className="mac-card p-8 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-500/10">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                    <EyeOff size={16} className="text-emerald-500" />
                    CORE DATA PRINCIPLES
                </h3>

                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted">
                            <HardDrive size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-1">Local Storage</h4>
                            <p className="text-xs text-text-muted">All session data is stored in <code className="bg-white/5 px-1 rounded text-accent">~/Library/Application Support/TypeZero</code>. We never sync this to the cloud.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-1">Device Processing</h4>
                            <p className="text-xs text-text-muted">AI models (Whisper, Coqui) run on your CPU/GPU. No remote API calls are made for the core experience.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mac-card p-6 bg-white/5 border-white/10">
                <TelemetryToggle descriptionMode="inline" grouped={false} />
            </div>
        </div>
    );
};
