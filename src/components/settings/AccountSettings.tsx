import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { User, ShieldCheck, CreditCard, ExternalLink, Mail, Key, Clock, ArrowUpCircle, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { openUrl } from "@tauri-apps/plugin-opener";

export const AccountSettings: React.FC = () => {
    const { t } = useTranslation();
    const {
        isPro,
        userEmail,
        licenseKey,
        dailyUsage,
        setUser,
        setLicense,
        setPro,
        validateLicense,
        isLicenseValid
    } = useAuthStore();

    const [loginEmail, setLoginEmail] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLicenseInput, setShowLicenseInput] = useState(false);
    const [inputLicenseKey, setInputLicenseKey] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);

        try {
            // Check Firebase for the email's Pro status
            const isProUser = await validateLicense(loginEmail);

            if (isProUser) {
                toast.success("Logged in & Pro activated!");
            } else {
                toast.success("Logged in as Free user");
                setUser(loginEmail); // Fallback to free tier
            }
        } catch (error) {
            toast.error("Failed to login");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        setLicense(null);
        setPro(false);
        toast.info("Logged out");
    };

    const handleActivateLicense = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        // Since we are moving to email-based licensing via Razorpay + Firebase,
        // we can just re-validate the current user's email.
        if (!userEmail) return;

        setLoginLoading(true);
        try {
            const success = await validateLicense(userEmail);
            if (success) {
                toast.success("Pro activated successfully!");
                setShowLicenseInput(false);
                setInputLicenseKey("");
            } else {
                toast.error("No active Pro subscription found for this email.");
            }
        } catch (error) {
            toast.error("Failed to check subscription status");
        } finally {
            setLoginLoading(false);
        }
    };

    const licenseActive = isLicenseValid();
    const dictationLimit = 300;
    const ttsLimit = 1000;

    if (!userEmail) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Account</h2>
                    <p className="text-sm text-text-muted">Sign in to sync your Pro status and settings.</p>
                </div>

                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center space-y-6">
                    <div className="p-4 rounded-full bg-accent/10 text-accent">
                        <User size={48} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">Welcome to TypeZero</h3>
                        <p className="text-sm text-text-muted max-w-xs mx-auto">
                            Join the private beta and unlock the full potential of local AI.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                type="email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                placeholder="name@email.com"
                                required
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-black/20 border border-white/10 focus:border-accent/40 focus:ring-1 focus:ring-accent/40 outline-none transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="w-full py-4 rounded-2xl bg-accent text-white font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loginLoading ? "Signing in..." : "Continue with Email"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Your Account</h2>
                    <p className="text-sm text-text-muted">{userEmail}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                    Sign Out
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pro Status Card */}
                <div className={`p-6 rounded-3xl border transition-all ${isPro
                    ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                    : "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 shadow-lg shadow-accent/5"}`}>
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-3 rounded-2xl ${isPro ? "bg-emerald-500 text-white" : "bg-accent text-white shadow-lg shadow-accent/20"}`}>
                            <ShieldCheck size={24} />
                        </div>
                        {isPro && (
                            <span className={`px-3 py-1 ${licenseActive ? "bg-emerald-500/20 text-emerald-500" : "bg-yellow-500/20 text-yellow-500"} rounded-full text-[10px] font-bold uppercase tracking-wider italic`}>
                                {licenseActive ? "Active Plan" : "Offline Grace Period"}
                            </span>
                        )}
                    </div>

                    <h3 className="text-xl font-bold mb-2">{isPro ? "TypeZero Pro" : "Free Version"}</h3>
                    <p className="text-sm text-text-muted mb-6 leading-relaxed">
                        {isPro
                            ? "You have full access to all local voices and unlimited meeting transcription."
                            : "Upgrade to unlock unlimited dictation and premium offline productivity features."}
                    </p>

                    {!isPro && (
                        <div className="space-y-4 mb-6 p-4 rounded-2xl bg-black/20 border border-white/5">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                    <span>Daily Dictation</span>
                                    <span>{Math.round(dailyUsage.dictationSeconds / 60)} / {dictationLimit / 60} min</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all duration-500"
                                        style={{ width: `${Math.min(100, (dailyUsage.dictationSeconds / dictationLimit) * 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                    <span>Daily Text-to-Speech</span>
                                    <span>{dailyUsage.ttsCharacters} / {ttsLimit} chars</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${Math.min(100, (dailyUsage.ttsCharacters / ttsLimit) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {isPro ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between text-xs text-text-muted">
                                <span>Status: {licenseActive ? "Verified" : "Pending Sync"}</span>
                                <span>$19/month</span>
                            </div>
                            <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                <Clock size={14} />
                                Manage Subscription
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => openUrl("https://typezero.dipomdutta.com/")}
                            className="w-full py-4 rounded-xl bg-accent text-white font-bold shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowUpCircle size={18} />
                            Upgrade to Pro
                        </button>
                    )}
                </div>

                {/* Device/License Card */}
                <div className="p-6 rounded-3xl bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 rounded-2xl bg-violet-100 dark:bg-white/10 text-violet-600 dark:text-violet-400 leading-none">
                            <Key size={24} />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold mb-2">License Management</h3>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Current License</p>
                            <p className="text-sm font-mono bg-black/5 dark:bg-black/20 p-2 rounded-lg truncate border border-black/5 dark:border-white/5 text-gray-900 dark:text-text">
                                {isPro ? "TypeZero Pro Active" : "Free Tier"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Authorized Devices</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-text">1 / 2 devices used</p>
                        </div>

                        <button
                            onClick={() => handleActivateLicense()}
                            disabled={loginLoading}
                            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${isPro
                                ? "bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white"
                                : "bg-accent text-white shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95"
                                }`}
                        >
                            {loginLoading ? "Checking..." : (isPro ? "Verify Subscription Sync" : "Refresh Subscription Status")}
                        </button>
                    </div>
                </div>
            </div>


            {/* Quick Actions */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4 shadow-sm shadow-white/5">
                <h4 className="font-bold flex items-center gap-2">
                    <CreditCard size={18} className="text-accent" />
                    Billing & Receipts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-accent/40 transition-all text-left group">
                        <p className="text-xs text-text-muted group-hover:text-accent transition-colors">Last invoice</p>
                        <p className="text-sm font-bold mt-1">Jan 17, 2026</p>
                    </button>
                    <button className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-accent/40 transition-all text-left group">
                        <p className="text-xs text-text-muted group-hover:text-accent transition-colors">Payment method</p>
                        <p className="text-sm font-bold mt-1">•••• 4242</p>
                    </button>
                    <button
                        onClick={() => openUrl("https://typezero.dipomdutta.com/")}
                        className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-accent/40 transition-all text-left flex items-center justify-center"
                    >
                        <span className="text-xs font-bold text-accent">View All Invoices</span>
                    </button>
                </div>
            </div>
        </div >
    );
};
