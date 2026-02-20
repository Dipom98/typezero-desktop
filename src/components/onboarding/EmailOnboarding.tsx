import React, { useState } from "react";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/authStore";
import { toast } from "sonner";
import TypeZeroTextLogo from "../icons/TypeZeroTextLogo";

interface EmailOnboardingProps {
    onNext: () => void;
}

export const EmailOnboarding: React.FC<EmailOnboardingProps> = ({ onNext }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const validateLicense = useAuthStore((state) => state.validateLicense);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !email.includes("@")) {
            toast.error("Please enter a valid email address.");
            return;
        }

        setIsLoading(true);
        try {
            // Force the store to update the email immediately
            const normalizedEmail = email.toLowerCase();
            useAuthStore.getState().setUser(normalizedEmail);

            // validateLicense will check if the user is Pro, and if not, 
            // will silently create a new free user record in Firestore.
            const isPro = await validateLicense(normalizedEmail);

            if (isPro) {
                toast.success("Welcome back! Your Pro subscription is active.");
            } else {
                toast.success("Free account ready to use!");
            }

            // Proceed to the next step
            onNext();
        } catch (error) {
            console.error("Failed to register email:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="space-y-4 text-center">
                <TypeZeroTextLogo width={320} className="mx-auto" />
                <p className="text-xl text-text-muted font-medium">Please enter your email to continue.</p>
            </div>

            <div className="w-full bg-gray-50 border border-gray-200 p-8 rounded-3xl shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Mail size={16} className="text-accent" />
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-lg placeholder:text-gray-400"
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 pt-1 flex items-start gap-1.5">
                            <ShieldCheck size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                            <span>This syncs your settings and checks for any active Pro subscriptions. We never share your email.</span>
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !email}
                        className="w-full py-4 rounded-xl bg-accent text-white font-bold text-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Setting up..." : "Continue"}
                        {!isLoading && <ArrowRight size={20} />}
                    </button>
                </form>
            </div>

        </div>
    );
};
