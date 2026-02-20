import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Mic, ShieldCheck, Zap, X, ChevronRight, Copy, Check, Loader2 } from "lucide-react";
import { useModelStore } from "../../../stores/modelStore";
import { useSettings } from "../../../hooks/useSettings"; // Correct import
import { toast } from "sonner";
import { commands } from "@/bindings"; // Import commands
import { listen } from "@tauri-apps/api/event";

const Waveform = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden h-64 opacity-50">
    <div className="flex items-center gap-1.5 h-full">
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-accent/20 via-accent/60 to-accent/20 transition-all duration-500"
          style={{
            height: `${Math.random() * 60 + 20}%`,
            animation: `pulse 1.5s ease-in-out infinite ${i * 0.05}s`
          }}
        />
      ))}
    </div>
    <style>{`
      @keyframes pulse {
        0%, 100% { transform: scaleY(1); opacity: 0.5; }
        50% { transform: scaleY(1.5); opacity: 1; }
      }
    `}</style>
  </div>
);

export const GeneralSettings: React.FC = () => {
  const { t } = useTranslation();
  const { currentModel, getModelInfo } = useModelStore();
  const { settings, updateSetting } = useSettings(); // Use updateSetting

  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem("welcome-modal-shown") !== "true";
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isStopping, setIsStopping] = useState(false); // New state for processing
  const [dictatedText, setDictatedText] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Check initial state
  useEffect(() => {
    commands.isMeetingActive().then((res) => {
      if (res.status === "ok") setIsRecording(res.data);
    });

    const unlistenSegment = listen<any>("meeting-segment-added", (event) => {
      console.log("Segment received:", event.payload); // Debug log
      // Append new segment text
      setDictatedText((prev) => prev + " " + event.payload.text);
    });

    const unlistenStopped = listen<number>("meeting-stopped", () => {
      console.log("Meeting stopped"); // Debug log
      console.log("Meeting stopped"); // Debug log
      setIsRecording(false);
      setIsStopping(false); // Reset stopping state
      toast.success("Dictation saved to History");
    });

    return () => {
      unlistenSegment.then((u) => u());
      unlistenStopped.then((u) => u());
    };
  }, []);

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        setIsStopping(true); // Immediate feedback
        await commands.stopMeeting();
        // State update handled by event listener
      } else {
        const res = await commands.startMeeting("Quick Dictation", true);
        if (res.status === "ok") {
          setIsRecording(true);
          setDictatedText(""); // Clear previous text on new session
          toast.success("Listening...");
        } else {
          toast.error("Failed to start dictation");
        }
      }
    } catch (error) {
      console.error("Failed to toggle recording:", error);
      toast.error("Failed to toggle dictation");
    }
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("welcome-modal-shown", "true");
  };

  const handleCopy = async () => {
    if (!dictatedText) return;
    try {
      await navigator.clipboard.writeText(dictatedText);
      setIsCopied(true);
      toast.success("Text copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy text");
    }
  };

  const activeModel = getModelInfo(currentModel);

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] flex flex-col items-center overflow-visible">


      {/* Title - below top section */}



      {/* Main Hero Interaction (Centered) */}
      <div className="relative w-full flex-1 flex flex-col items-center justify-center gap-8 min-h-0">

        <div className="relative group flex items-center justify-center">
          {/* Waveform - Scaled up 2x */}
          <div className="absolute inset-0 scale-[2.0] origin-center opacity-70 pointer-events-none flex items-center justify-center -translate-y-8">
            <Waveform />
          </div>

          <button
            onClick={toggleRecording}
            className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 z-20 ${isRecording
              ? "bg-accent scale-110 shadow-[0_0_70px_rgba(10,132,255,0.4)] animate-glow"
              : "bg-white/10 hover:bg-white/15 backdrop-blur-3xl border border-white/20 hover:scale-105"
              }`}
          >
            {isStopping ? (
              <Loader2 size={64} className="text-white animate-spin" />
            ) : (
              <Mic size={64} className={`transition-all duration-500 ${isRecording ? "text-white fill-white scale-110" : "text-text"}`} />
            )}

            {/* Visual Listening Rings */}
            {isRecording && !isStopping && (
              <>
                <div className="absolute inset-0 rounded-full animate-ping bg-accent/30 pointer-events-none" />
                <div className="absolute -inset-4 rounded-full animate-pulse border border-accent/20 pointer-events-none" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chat-style Dictation Bar at the Bottom - Negative margin to counteract container padding */}
      <div className="w-full px-6 pb-2 pt-4 z-30 -mb-6">
        <div className="mac-card w-full max-w-4xl mx-auto flex items-center gap-4 p-3 pl-6 bg-white/5 border-white/10 backdrop-blur-3xl shadow-2xl rounded-2xl">
          <div className="flex-1 text-sm text-text/90 font-medium truncate py-1 select-text">
            {dictatedText || (isRecording ? "Listening..." : "Your dictated text will appear here...")}
          </div>
          <button
            onClick={handleCopy}
            disabled={!dictatedText}
            className={`p-2.5 rounded-xl transition-mac ${dictatedText
              ? "bg-white/5 hover:bg-accent hover:text-white text-text/60"
              : "text-text/20 cursor-not-allowed"
              }`}
          >
            {isCopied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* Welcome Card Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md transition-mac">
          <div className="mac-card w-[420px] p-8 relative flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in duration-500 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
            <button
              onClick={dismissWelcome}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-mac text-text-muted"
            >
              <X size={18} />
            </button>

            <div className="w-20 h-20 rounded-[24px] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-2">
              <ShieldCheck size={40} />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Welcome to TypeZero</h2>
              <p className="text-sm text-text-muted leading-relaxed px-4">
                Private, on-device voice AI for creators. <br />
                Everything you say stays on your Mac.
              </p>
            </div>

            <div className="w-full space-y-4 pt-4">
              <div className="flex items-center justify-center gap-2 pb-2 text-[10px] font-bold text-accent tracking-[0.2em] uppercase">
                <Zap size={14} fill="currentColor" />
                <span>Ready to create?</span>
              </div>

              <button
                onClick={dismissWelcome}
                className="w-full py-4.5 bg-accent hover:bg-accent/90 text-white rounded-2xl font-bold text-lg shadow-xl shadow-accent/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
              >
                Start Dictating
                <span className="opacity-50 text-sm font-medium">(⌘D)</span>
                <ChevronRight size={20} className="stroke-[3]" />
              </button>

              <button
                onClick={dismissWelcome}
                className="w-full py-3 text-sm font-medium text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
