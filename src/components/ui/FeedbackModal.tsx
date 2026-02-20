import React, { useState } from "react";
import { Bug, Send, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { commands } from "@/bindings";
import { toast } from "sonner";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let diagnosticData = "";
            if (includeDiagnostics) {
                const result = await commands.generateDiagnosticReport();
                if (result.status === "ok") {
                    diagnosticData = result.data;
                } else {
                    console.warn("Failed to generate diagnostics:", result.error);
                    diagnosticData = "Failed to generate diagnostics: " + result.error;
                }
            }

            // Mock submission to a proxy or email
            console.log("Feedback submitted:", {
                email,
                message,
                diagnostics: diagnosticData
            });

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            setSubmitted(true);
            toast.success("Feedback sent! Thank you for helping us improve TypeZero.");
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            toast.error("Failed to send feedback. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-background border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2 font-bold">
                        <Bug size={18} className="text-accent" />
                        Report a Problem
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {submitted ? (
                        <div className="flex flex-col items-center text-center space-y-4 py-8">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold">Message Sent!</h3>
                                <p className="text-sm text-text-muted">Our team will review your feedback and get back to you if needed.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="mt-4 px-8 py-2.5 bg-accent text-white rounded-xl font-bold hover:brightness-110 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Your Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent/40 outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">What happened?</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe the issue you're facing..."
                                    className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent/40 outline-none resize-none"
                                    required
                                />
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                <input
                                    type="checkbox"
                                    id="diag"
                                    checked={includeDiagnostics}
                                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                                    className="mt-1 accent-accent"
                                />
                                <label htmlFor="diag" className="text-xs leading-relaxed cursor-pointer">
                                    <span className="font-bold flex items-center gap-1.5 mb-1">
                                        <FileText size={14} className="text-blue-400" />
                                        Include System Diagnostics
                                    </span>
                                    <span className="text-text-muted">
                                        Attaches anonymous system info (OS, CPU, memory) and recent logs to help us debug.
                                        <strong className="text-text/60"> No personal audio collected.</strong>
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 rounded-xl bg-accent text-white font-bold flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? "Sending..." : (
                                    <>
                                        Submit Bug Report
                                        <Send size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center gap-2 text-[10px] text-text-muted italic">
                    <AlertCircle size={12} />
                    Beta version: Diagnostics are invaluable for stability.
                </div>
            </div>
        </div>
    );
};
