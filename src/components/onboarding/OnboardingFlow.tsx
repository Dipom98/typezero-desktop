import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Lock, Mic, Check, Sparkles, ArrowRight, ArrowLeft, Cpu, Volume2, Info } from "lucide-react";
import TypeZeroTextLogo from "../icons/TypeZeroTextLogo";
import AccessibilityOnboarding from "./AccessibilityOnboarding";
import Onboarding from "./Onboarding"; // Model selection screen
import { Tooltip } from "../ui/Tooltip";
import { commands } from "@/bindings";
import { toast } from "sonner";
import { BetaStep1_BasicSetup, BetaStep2_CoreWorkflows, BetaStep3_Feedback } from "./BetaOnboardingSteps";
import { EmailOnboarding } from "./EmailOnboarding";

type Step = "welcome" | "email" | "privacy" | "permissions" | "model" | "beta-setup" | "beta-core" | "beta-feedback" | "done";

interface OnboardingFlowProps {
    onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<Step>("welcome");

    // Tooltip refs
    const dictationKbdRef = useRef<HTMLElement>(null);
    const ttsTextRef = useRef<HTMLParagraphElement>(null);
    const doneCardRef = useRef<HTMLDivElement>(null);

    const handleComplete = async () => {
        try {
            // Seed demo content on completion so user has something to see
            await commands.seedDemoContent();
        } catch (error) {
            console.error("Failed to seed demo content:", error);
        } finally {
            onComplete();
        }
    };

    const renderStep = () => {
        switch (step) {
            case "welcome":
                return (
                    <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-700">
                        <div className="space-y-4 text-center">
                            <TypeZeroTextLogo width={320} className="mx-auto" />
                            <p className="text-xl text-text-muted font-medium">Your local AI productivity assistant.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-full bg-accent/10 text-accent">
                                    <Mic size={24} />
                                </div>
                                <h3 className="font-semibold text-sm text-gray-900">Real-time Dictation</h3>
                                <p className="text-xs text-gray-500">High accuracy transcription that types exactly where you want.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center text-center space-y-3">
                                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                                    <Shield size={24} />
                                </div>
                                <h3 className="font-semibold text-sm text-gray-900">Privacy by Design</h3>
                                <p className="text-xs text-gray-500">All processing happens locally on your device. Never shared.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep("email")}
                            className="w-full py-4 rounded-xl bg-accent text-white font-bold text-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg"
                        >
                            Get Started
                            <ArrowRight size={20} />
                        </button>
                    </div>
                );

            case "email":
                return <EmailOnboarding onNext={() => setStep("privacy")} />;

            case "privacy":
                return (
                    <div className="flex flex-col h-full max-w-2xl mx-auto py-12 animate-in slide-in-from-right-8 duration-500">
                        <div className="mb-12">
                            <span className="text-accent text-sm font-bold tracking-widest uppercase mb-2 block">Privacy First</span>
                            <h2 className="text-4xl font-bold mb-4 text-gray-900">You are in control.</h2>
                            <p className="text-lg text-gray-500">TypeZero uses state-of-the-art local AI. No audio or text ever leaves your device.</p>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-200">
                                <div className="shrink-0 p-3 h-fit rounded-xl bg-orange-500/10 text-orange-500">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1 text-gray-900">Zero Cloud Processing</h4>
                                    <p className="text-sm text-gray-500">Voices and transcription are generated locally. No internet connection is required for core features.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-200">
                                <div className="shrink-0 p-3 h-fit rounded-xl bg-emerald-500/10 text-emerald-500">
                                    <Cpu size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1 text-gray-900">Local Models</h4>
                                    <p className="text-sm text-gray-500">We use optimized Open Source models that run directly on your CPU/GPU hardware.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setStep("welcome")}
                                className="px-6 py-4 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <button
                                onClick={() => setStep("permissions")}
                                className="flex-1 py-4 rounded-xl bg-accent text-white font-bold text-lg hover:brightness-110 transition-all"
                            >
                                Everything looks good
                            </button>
                        </div>
                    </div>
                );

            case "permissions":
                return (
                    <div className="h-full flex flex-col">
                        <AccessibilityOnboarding onComplete={() => setStep("model")} />
                        <div className="px-6 pb-6 mt-auto">
                            <button
                                onClick={() => setStep("privacy")}
                                className="text-sm text-text-muted hover:text-text transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft size={14} /> Back to privacy
                            </button>
                        </div>
                    </div>
                );

            case "model":
                // Original Onboarding component handles model download
                return <Onboarding onModelSelected={() => setStep("beta-setup")} />;

            case "beta-setup":
                return <BetaStep1_BasicSetup onNext={() => setStep("beta-core")} />;

            case "beta-core":
                return <BetaStep2_CoreWorkflows onNext={() => setStep("beta-feedback")} />;

            case "beta-feedback":
                return <BetaStep3_Feedback onNext={() => setStep("done")} />;

            case "done":
                return (
                    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto space-y-8 animate-in zoom-in-95 duration-700">
                        <div className="p-6 rounded-full bg-emerald-500/10 text-emerald-500">
                            <Check size={64} />
                        </div>
                        <div className="text-center space-y-3">
                            <h2 className="text-3xl font-bold text-gray-900">Setup Complete!</h2>
                            <p className="text-gray-500">TypeZero is now ready to assist you. You can start dictating instantly using the global shortcut.</p>
                        </div>

                        {/* Menu bar info callout — helps first-time users understand how to access the app */}
                        <div className="w-full p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 shrink-0 mt-0.5">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-blue-800 mb-0.5">TypeZero lives in your menu bar</p>
                                <p className="text-xs text-blue-600 leading-relaxed">Look for the TypeZero icon at the top-right of your screen. Click it to open the app anytime — the window will auto-hide when you close it.</p>
                            </div>
                        </div>

                        <div
                            ref={doneCardRef}
                            className="w-full p-4 rounded-2xl bg-accent/10 border border-accent/20 flex items-center gap-4 relative"
                        >
                            <div className="p-3 rounded-xl bg-accent text-white">
                                <Sparkles size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">Unlock Premium Voices</p>
                                <p className="text-xs text-gray-500">Check out our Pro features in the sidebar anytime.</p>
                            </div>
                        </div>

                        {/* Top-right notification instead of tooltip */}
                        <div className="fixed top-20 right-8 z-50 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-700 delay-500">
                            <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-start gap-3 max-w-xs">
                                <Sparkles size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold mb-0.5">Welcome aboard!</p>
                                    <p className="text-xs text-gray-300 leading-relaxed">We've seeded some demo history so you can explore all features immediately.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleComplete}
                            className="w-full py-4 rounded-xl bg-accent text-white font-bold text-lg hover:brightness-110 transition-all"
                        >
                            Launch App
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden text-gray-900">
            <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto px-6">
                {renderStep()}
            </div>

            {/* Step Progress Bar */}
            <div className="h-1 bg-gray-200 flex">
                {(["welcome", "email", "privacy", "permissions", "model", "beta-setup", "beta-core", "beta-feedback", "done"] as Step[]).map((s, idx) => {
                    const steps = ["welcome", "email", "privacy", "permissions", "model", "beta-setup", "beta-core", "beta-feedback", "done"];
                    const currentIdx = steps.indexOf(step);
                    return (
                        <div
                            key={s}
                            className={`flex-1 h-full transition-all duration-500 ${idx <= currentIdx ? "bg-accent" : "bg-transparent"}`}
                        />
                    );
                })}
            </div>
        </div>
    );
};
