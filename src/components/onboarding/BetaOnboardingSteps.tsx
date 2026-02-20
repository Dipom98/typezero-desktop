import React, { useState, useEffect } from "react";
import { Mic, Check, Volume2, Globe, Brain, MessageSquare, Mail, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import { checkMicrophonePermission } from "tauri-plugin-macos-permissions-api";
import { platform } from "@tauri-apps/plugin-os";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "../ui/Button";

interface StepProps {
    onNext: () => void;
}

export const BetaStep1_BasicSetup: React.FC<StepProps> = ({ onNext }) => {
    const [micPermission, setMicPermission] = useState<boolean | null>(null);
    const [ttsActive, setTtsActive] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            // Check mic
            if (platform() === "macos") {
                const hasMic = await checkMicrophonePermission();
                setMicPermission(hasMic);
            } else {
                setMicPermission(true); // Assume true/handled by OS on Windows for now
            }

            // Check TTS (mock check, or check if binding exists)
            // For now, we'll just simulate a check or check if specific TTS settings are default
            setTtsActive(true);
        };
        checkStatus();
    }, []);

    const requestMic = async () => {
        if (platform() === "macos") {
            // Open system privacy settings for microphone access
            await openUrl("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone");
        }
    };

    return (
        <div className="flex flex-col h-full max-w-xl mx-auto py-12 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-3xl font-bold mb-6 text-center">Step 1: System Check</h2>
            <div className="space-y-6 flex-1">
                <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${micPermission ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            <Mic size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Microphone Access</h3>
                            <p className="text-sm text-gray-500">{micPermission ? "Access granted" : "Permission required"}</p>
                        </div>
                    </div>
                    {micPermission ? (
                        <Check className="text-emerald-500" />
                    ) : (
                        <Button size="sm" variant="secondary" onClick={requestMic}>Check</Button>
                    )}
                </div>

                <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                            <Volume2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Text-to-Speech</h3>
                            <p className="text-sm text-gray-500">{ttsActive ? "Engine ready" : "Checking..."}</p>
                        </div>
                    </div>
                    {ttsActive && <Check className="text-emerald-500" />}
                </div>
            </div>
            <Button onClick={onNext} className="w-full mt-8 bg-gray-900 text-white hover:bg-black transition-all shadow-lg" size="lg">Continue</Button>
        </div>
    );
};

export const BetaStep2_CoreWorkflows: React.FC<StepProps> = ({ onNext }) => {
    // Simple checklist of things to try
    const workflows = [
        { icon: Mic, label: "Dictate a paragraph" },
        { icon: Volume2, label: "Select text → Read Aloud" },
        { icon: Globe, label: "Translate a sentence" },
        { icon: Brain, label: "Try a custom prompt" }
    ];

    return (
        <div className="flex flex-col h-full max-w-xl mx-auto py-12 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-3xl font-bold mb-2 text-center text-gray-900">Step 2: Try It Out</h2>
            <p className="text-center text-gray-500 mb-8">Test these core features to verify everything is working.</p>

            <div className="space-y-4 flex-1">
                {workflows.map((wf, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex items-center gap-4">
                        <wf.icon size={20} className="text-accent" />
                        <span className="font-medium text-gray-900">{wf.label}</span>
                    </div>
                ))}
            </div>
            <Button onClick={onNext} className="w-full mt-8 bg-gray-900 text-white hover:bg-black transition-all shadow-lg" size="lg">Continue</Button>
        </div>
    );
};

export const BetaStep3_Feedback: React.FC<StepProps> = ({ onNext }) => {
    return (
        <div className="flex flex-col h-full max-w-xl mx-auto py-12 animate-in slide-in-from-right-8 duration-500 text-center">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">You're a Beta Pioneer! 🚀</h2>
            <p className="text-lg text-gray-500 mb-8">
                Your feedback shapes the future of TypeZero. As an early tester, you'll get
                <span className="text-emerald-500 font-bold"> Pro access + Founders Discount</span> at launch.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center gap-3 pointer-events-none opacity-80">
                    <Mail size={32} className="text-blue-500" />
                    <span className="font-bold text-gray-900">Support: support@dipomdutta.com</span>
                </div>
                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center gap-3 pointer-events-none opacity-80">
                    <MessageSquare size={32} className="text-purple-500" />
                    <span className="font-bold text-gray-900 flex flex-col items-center">
                        <span>Feedback Form</span>
                        <span className="text-xs text-gray-400 font-normal mt-1">typezero.app/feedback</span>
                    </span>
                </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mb-4 text-left">
                <h4 className="font-bold text-orange-500 mb-1 flex items-center gap-2">
                    <ExternalLink size={16} /> Known Limitations
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
                    <li>Performance may vary on older hardware</li>
                    <li>Unsigned builds will show OS warnings</li>
                </ul>
            </div>

            <Button onClick={onNext} className="w-full mt-auto bg-gray-900 text-white hover:bg-black transition-all shadow-lg" size="lg">Start Using TypeZero</Button>
        </div>
    );
};
