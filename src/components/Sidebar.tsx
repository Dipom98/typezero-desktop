import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings2,
  Bug,
  Clock,
  HelpCircle,
  Sparkles,
  Wand2,
  Brain,
  Moon,
  Sun,
  Mic2,
  Volume2,
  User,
  Info,
  ShieldCheck,
  Globe,
  Users,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { openUrl } from "@tauri-apps/plugin-opener";
import TypeZeroTextLogo from "./icons/TypeZeroTextLogo";
import iconUrl from "../assets/icon.png";
import { useSettings } from "../hooks/useSettings";
import {
  GeneralSettings,
  AdvancedSettings,
  HistorySettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
  ModelsSettings,
  TtsSettings,
  SecuritySettings,
  AccountSettings,
} from "./settings";
import { MeetingScreen } from "./meetings/MeetingScreen";
import TranslationScreen from "./translate/TranslationScreen";

export type SidebarSection = keyof typeof SECTIONS_CONFIG;

interface IconProps {
  width?: number | string;
  height?: number | string;
  size?: number | string;
  className?: string;
  [key: string]: any;
}

interface SectionConfig {
  labelKey: string;
  icon: React.ComponentType<IconProps>;
  component: React.ComponentType;
  enabled: (settings: any) => boolean;
  locked?: boolean;
}

export const SECTIONS_CONFIG = {
  general: {
    labelKey: "sidebar.general",
    icon: Mic2,
    component: GeneralSettings,
    enabled: () => true,
  },
  postprocessing: {
    labelKey: "sidebar.postProcessing",
    icon: Volume2,
    component: PostProcessingSettings,
    enabled: () => true,
  },
  models: {
    labelKey: "sidebar.models",
    icon: Brain,
    component: ModelsSettings,
    enabled: () => true,
  },
  tts: {
    labelKey: "sidebar.tts",
    icon: Volume2,
    component: TtsSettings,
    enabled: () => true,
    locked: true,
  },
  advanced: {
    labelKey: "sidebar.advanced",
    icon: Settings2,
    component: AdvancedSettings,
    enabled: () => true,
  },
  history: {
    labelKey: "sidebar.history",
    icon: Clock,
    component: HistorySettings,
    enabled: () => true,
  },
  account: {
    labelKey: "sidebar.account",
    icon: User,
    component: AccountSettings,
    enabled: () => true,
  },
  about: {
    labelKey: "sidebar.about",
    icon: Info,
    component: AboutSettings,
    enabled: () => true,
  },
  meetings: {
    labelKey: "sidebar.meetings",
    icon: Users,
    component: MeetingScreen,
    enabled: () => true,
  },
  translate: {
    labelKey: "sidebar.translate",
    icon: Globe,
    component: TranslationScreen,
    enabled: () => true,
  },
  privacy: {
    labelKey: "sidebar.privacy",
    icon: ShieldCheck,
    component: SecuritySettings,
    enabled: () => true,
  },
} as const satisfies Record<string, SectionConfig>;

const MENU_GROUPS = [
  {
    label: "CORE",
    items: ["general", "meetings", "tts", "postprocessing"] as SidebarSection[],
  },
  {
    label: "SETTINGS",
    items: ["translate", "models", "advanced"] as SidebarSection[],
  },
  {
    label: "DATA",
    items: ["history", "privacy"] as SidebarSection[],
  },
  {
    label: "SYSTEM",
    items: ["account", "about"] as SidebarSection[],
  },
];

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem("welcome-modal-shown") !== "true";
  });

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("welcome-modal-shown", "true");
  };

  const { settings, updateSetting } = useSettings();

  const isDark = settings?.theme === "dark";

  const toggleTheme = () => {
    updateSetting("theme", isDark ? "plain" : "dark");
  };



  return (
    <div
      className="flex flex-col w-56 h-full glass-sidebar px-4 pt-11 pb-6 shrink-0 z-10 transition-mac border-r border-border"
      style={{ backgroundColor: 'var(--color-sidebar)' }}
      data-tauri-drag-region
    >
      {/* Header */}
      <div className="flex items-center px-1 mb-6 mt-1" data-tauri-drag-region>
        <div className="flex flex-col w-full">
          <div className="flex flex-col items-start w-full pr-1 gap-1">

            <TypeZeroTextLogo width={260} className="text-text opacity-95 h-auto scale-[1.12] origin-left" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-none mt-4">
        {MENU_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <h3 className="px-3 mb-2 text-[10px] font-bold text-text-muted/40 uppercase tracking-[0.15em] select-none">
              {group.label}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((key) => {
                const config = SECTIONS_CONFIG[key] as SectionConfig;
                if (!config || config.enabled(settings) === false) return null;

                const isActive = activeSection === key;
                const Icon = config.icon;

                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (config.locked) {
                        toast.info("Coming Soon", {
                          description: "This feature is currently under maintenance.",
                          position: "bottom-right",
                        });
                        return;
                      }
                      onSectionChange(key as SidebarSection);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                      ? "bg-accent/10 text-accent shadow-[inset_0_1px_0_var(--color-border)]"
                      : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text"
                      }`}
                  >
                    <Icon
                      size={18}
                      className={`transition-all duration-200 shrink-0 ${isActive
                        ? "text-accent scale-110"
                        : "text-text-muted group-hover:text-text opacity-60 group-hover:opacity-100"
                        }`}
                    />
                    <span className={`text-[13.5px] font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? "text-accent" : ""
                      }`}>
                      {t(config.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="pt-4 mt-auto border-t border-white/5 space-y-2">
        <button
          onClick={() => openUrl("https://typezero.dipomdutta.com/#/support")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text transition-all duration-200 group"
        >
          <MessageSquare size={18} className="text-text-muted group-hover:text-purple-400 transition-colors shrink-0 opacity-70 group-hover:opacity-100" />
          <span className="text-[13px] font-medium">Send Feedback</span>
        </button>

        <button
          onClick={toggleTheme}
          className="flex gap-3 items-center px-3 py-2.5 w-full rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text group"
        >
          {isDark ? (
            <Moon size={18} className="shrink-0 opacity-60 group-hover:opacity-100" />
          ) : (
            <Sun size={18} className="shrink-0 opacity-60 group-hover:opacity-100" />
          )}
          <span className="text-[13px] font-medium">
            {isDark ? "Light Theme" : "Dark Theme"}
          </span>
        </button>
      </div>
    </div>
  );
};

