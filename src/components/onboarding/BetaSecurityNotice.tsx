import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, Download, Terminal, Check } from "lucide-react";
import { Button } from "../ui/Button";

interface BetaSecurityNoticeProps {
    onDismiss: () => void;
}

export const BetaSecurityNotice: React.FC<BetaSecurityNoticeProps> = ({
    onDismiss,
}) => {
    const { t } = useTranslation();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3 text-orange-500">
                        <ShieldAlert size={28} />
                        <h2 className="text-xl font-bold text-gray-900">Security Notice (Beta Build)</h2>
                    </div>

                    <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                        <p>
                            TypeZero is currently distributed as an <strong className="text-gray-900">early beta build</strong>.
                            Because this version is not yet code-signed, macOS and Windows may show a security
                            warning during installation.
                        </p>

                        <div className="bg-emerald-50 border border-emerald-500/20 p-4 rounded-xl flex gap-3">
                            <Check className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="font-semibold text-emerald-600 mb-1">This is expected and safe.</p>
                                <p className="text-xs text-gray-600">
                                    All speech processing in TypeZero happens locally on your device.
                                    No audio or text is uploaded to our servers.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 mt-6">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2 mb-2 text-gray-800 font-medium">
                                    <Terminal size={16} />
                                    <span>macOS (Beta Install Reminder)</span>
                                </div>
                                <p className="text-xs mb-2 text-gray-500">If macOS blocks the app:</p>
                                <code className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded block w-fit">
                                    Right-click TypeZero → Open → Open Anyway
                                </code>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2 mb-2 text-gray-800 font-medium">
                                    <Download size={16} />
                                    <span>Windows (Beta Install Reminder)</span>
                                </div>
                                <p className="text-xs mb-2 text-gray-500">If SmartScreen appears:</p>
                                <code className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded block w-fit">
                                    Click More info → Run anyway
                                </code>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 text-center pt-2">
                            Signed installers will be available in the public release.
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <Button onClick={onDismiss} className="px-8 bg-gray-900 text-white hover:bg-black">
                        I Understand
                    </Button>
                </div>
            </div>
        </div>
    );
};
