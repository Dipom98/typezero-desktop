import React, { useState, useEffect, useRef } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { commands } from "../../bindings";
import { useAuthStore } from "../../stores/authStore";

export const SpeakSelection: React.FC = () => {
    const [selection, setSelection] = useState("");
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleSelection = () => {
            const sel = window.getSelection();
            const text = sel?.toString().trim();

            if (text && text.length > 0) {
                const range = sel?.getRangeAt(0);
                const rect = range?.getBoundingClientRect();
                if (rect && rect.width > 0) {
                    setSelection(text);
                    setPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 48
                    });
                    setIsVisible(true);
                }
            } else {
                // Short delay to check if we clicked the button itself
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (activeElement !== buttonRef.current && !isSpeaking) {
                        setIsVisible(false);
                    }
                }, 100);
            }
        };

        document.addEventListener("mouseup", handleSelection);
        return () => document.removeEventListener("mouseup", handleSelection);
    }, [isSpeaking]);

    const handleSpeak = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isSpeaking || !selection) return;

        setIsSpeaking(true);
        try {
            const result = await commands.speak({ text: selection });
            if (result.status === "ok") {
                useAuthStore.getState().incrementTts(selection.length);
                const blob = new Blob([new Uint8Array(result.data)], { type: "audio/wav" });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audio.play();
                audio.onended = () => {
                    setIsSpeaking(false);
                    setIsVisible(false);
                    window.getSelection()?.removeAllRanges();
                };
            } else {
                setIsSpeaking(false);
            }
        } catch (error) {
            console.error("Speak failed:", error);
            setIsSpeaking(false);
        }
    };

    if (!isVisible) return null;

    return (
        <button
            ref={buttonRef}
            onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
            onClick={handleSpeak}
            style={{
                left: Math.max(60, Math.min(window.innerWidth - 60, position.x)),
                top: Math.max(20, position.y),
                transform: 'translateX(-50%)'
            }}
            className="fixed z-[999] px-4 py-2 rounded-2xl bg-accent text-white shadow-2xl shadow-accent/40 animate-in zoom-in slide-in-from-bottom-2 duration-200 hover:scale-110 active:scale-95 border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
        >
            {isSpeaking ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
            <span className="text-[11px] font-bold uppercase tracking-widest">Speak</span>
        </button>
    );
};
