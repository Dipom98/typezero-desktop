import React from "react";
import { Lock, Sparkles } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

interface ProGateProps {
    children: React.ReactNode;
    featureName: string;
    overlay?: boolean;
}

export const ProGate: React.FC<ProGateProps> = ({ children, featureName, overlay = false }) => {
    const isPro = useAuthStore((state) => state.isPro);

    if (isPro) return <>{children}</>;

    if (overlay) {
        return (
            <div className="relative group overflow-hidden rounded-xl">
                <div className="opacity-40 pointer-events-none filter blur-[2px]">
                    {children}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="bg-accent p-2 rounded-full shadow-lg mb-2">
                        <Lock size={16} className="text-white" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white">Pro Feature</p>
                    <button
                        className="mt-2 text-[11px] font-semibold text-accent bg-white px-3 py-1 rounded-full hover:scale-105 active:scale-95 transition-mac"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // In future, trigger upgrade flow
                            alert(`Upgrade to Pro to unlock ${featureName}!`);
                        }}
                    >
                        Unlock Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 opacity-70">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                    <Lock size={14} className="text-text-muted" />
                </div>
                <div>
                    <p className="text-xs font-medium text-text-muted">{featureName}</p>
                    <p className="text-[10px] text-text-muted/60">Available in Pro</p>
                </div>
            </div>
            <button
                className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                onClick={() => alert("Upgrade flow coming soon!")}
            >
                <Sparkles size={10} />
                Upgrade
            </button>
        </div>
    );
};
