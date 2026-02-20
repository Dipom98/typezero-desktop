import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, ShieldCheck, Bug, FolderOpen, FileJson } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { commands } from "@/bindings";
import { toast } from "sonner";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { FeedbackModal } from "../../ui/FeedbackModal";
import { AppDataDirectory } from "../AppDataDirectory";
import { AppLanguageSelector } from "../AppLanguageSelector";
import { LogDirectory } from "../debug";

export const AboutSettings: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const copyDiagnostics = async () => {
    try {
      const result = await commands.generateDiagnosticReport();
      if (result.status === "ok") {
        await navigator.clipboard.writeText(result.data);
        toast.success("Diagnostic report copied to clipboard!");
      } else {
        toast.error(`Failed to generate diagnostics: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to copy diagnostics:", error);
      toast.error("Failed to generate diagnostics");
    }
  };

  const checkForUpdates = async () => {
    try {
      const update = await check();
      if (update) {
        toast.message(`Update available: ${update.version}`, {
          description: "Would you like to install it now?",
          action: {
            label: "Install & Restart",
            onClick: async () => {
              try {
                await update.downloadAndInstall();
                await relaunch();
              } catch (e) {
                console.error(e);
                toast.error("Failed to install update");
              }
            }
          }
        });
      } else {
        toast.success("You're using the latest version of TypeZero!");
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      toast.error("Failed to check for updates");
    }
  };

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("0.1.2");
      }
    };

    fetchVersion();
  }, []);

  return (
    <div className="w-full space-y-12">
      <div className="space-y-1 mb-8">
        <h1 className="mac-title text-3xl">{t("settings.about.title")}</h1>
        <p className="mac-muted text-sm">Information about TypeZero and your environment.</p>
      </div>

      <div className="space-y-8">
        <SettingsGroup title="Configuration">
          <AppLanguageSelector descriptionMode="tooltip" grouped={true} />
        </SettingsGroup>

        <SettingsGroup title="System">
          <SettingContainer
            title={t("settings.about.version.title")}
            description={t("settings.about.version.description")}
            grouped={true}
          >
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-mono bg-text/5 px-2 py-0.5 rounded border border-border/40 text-text/80">
                v{version}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-[11px] font-bold uppercase tracking-wider"
                onClick={checkForUpdates}
              >
                Check for Updates
              </Button>
            </div>
          </SettingContainer>
          <AppDataDirectory descriptionMode="tooltip" grouped={true} />
          <LogDirectory grouped={true} />
          <div className="px-4 py-3.5 flex items-center justify-between transition-mac hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
            <div className="max-w-[70%] text-[13px] font-semibold">Copy Diagnostics</div>
            <Button variant="secondary" size="sm" onClick={copyDiagnostics}>Copy</Button>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Beta Distribution Notice">
          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-sm space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-orange-500 mb-1">Unsigned Beta Build</p>
                <p className="text-text-muted leading-relaxed">
                  This version of TypeZero is distributed for testing purposes and is <strong>not code-signed</strong>.
                  Operating systems may show security warnings during installation or launch.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <p className="text-xs font-bold mb-1 text-text">macOS Workaround</p>
                <code className="text-[10px] bg-black/30 px-2 py-1 rounded text-text-muted block w-fit">Right-click App → Open → Open Anyway</code>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <p className="text-xs font-bold mb-1 text-text">Windows Workaround</p>
                <code className="text-[10px] bg-black/30 px-2 py-1 rounded text-text-muted block w-fit">More info → Run anyway</code>
              </div>
            </div>

            <p className="text-xs text-text-muted/60 pt-2 border-t border-orange-500/10">
              Signed installers will be available in the public V1 release.
            </p>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Support & Community">
          <SettingContainer
            title="Join the Community"
            description="Get help, share feedback, and chat with other TypeZero users."
            grouped={true}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openUrl("https://discord.gg/typezero")}
              className="font-bold flex items-center gap-2 text-[#5865F2]"
            >
              <ExternalLink size={14} />
              Join Discord
            </Button>
          </SettingContainer>

          <SettingContainer
            title="Troubleshooting"
            description="Access logs or report a problem to our team."
            grouped={true}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFeedback(true)}
                className="font-bold flex items-center gap-2 text-accent"
              >
                <Bug size={14} />
                Report a Problem
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => commands.openLogDir()}
                className="font-medium flex items-center gap-2"
              >
                <FolderOpen size={14} />
                Open Logs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyDiagnostics}
                className="font-medium flex items-center gap-2"
              >
                <FileJson size={14} />
                Copy Diagnostics
              </Button>
            </div>
          </SettingContainer>
        </SettingsGroup>

        <SettingsGroup title={t("settings.about.acknowledgments.title")}>
          <SettingContainer
            title={t("settings.about.acknowledgments.whisper.title")}
            description={t("settings.about.acknowledgments.whisper.description")}
            grouped={true}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {t("settings.about.acknowledgments.whisper.details")}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openUrl("https://github.com/ggerganov/whisper.cpp")}
                className="shrink-0"
              >
                <ExternalLink size={14} />
              </Button>
            </div>
          </SettingContainer>
        </SettingsGroup>
      </div>

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </div>
  );
};
