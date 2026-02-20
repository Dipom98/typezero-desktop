import { useEffect, useState, useRef } from "react";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { platform } from "@tauri-apps/plugin-os";
import {
  checkAccessibilityPermission,
  checkMicrophonePermission,
} from "tauri-plugin-macos-permissions-api";
import "./App.css";
import AccessibilityPermissions from "./components/AccessibilityPermissions";
import Footer from "./components/footer";
import { OnboardingFlow } from "./components/onboarding";
import { BetaSecurityNotice } from "./components/onboarding/BetaSecurityNotice";
import { Sidebar, SidebarSection, SECTIONS_CONFIG } from "./components/Sidebar";
import { SpeakSelection } from "./components/ui";
import { useSettings } from "./hooks/useSettings";
import { useSettingsStore } from "./stores/settingsStore";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { commands } from "@/bindings";
import { useAuthStore } from "@/stores/authStore";
import { getLanguageDirection, initializeRTL } from "@/lib/utils/rtl";

type OnboardingStep = "accessibility" | "model" | "done";

const renderSettingsContent = (section: SidebarSection) => {
  const ActiveComponent =
    SECTIONS_CONFIG[section]?.component || SECTIONS_CONFIG.general.component;
  return <ActiveComponent />;
};

function App() {
  const { i18n } = useTranslation();
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(
    null,
  );
  // Track if this is a returning user who just needs to grant permissions
  // (vs a new user who needs full onboarding including model selection)
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [currentSection, setCurrentSection] =
    useState<SidebarSection>("general");
  const { settings, updateSetting } = useSettings();
  const direction = getLanguageDirection(i18n.language);
  const refreshAudioDevices = useSettingsStore(
    (state) => state.refreshAudioDevices,
  );
  const refreshOutputDevices = useSettingsStore(
    (state) => state.refreshOutputDevices,
  );
  const hasCompletedPostOnboardingInit = useRef(false);

  useEffect(() => {
    checkOnboardingStatus();

    // Validate pro status in background on app start
    const { userEmail, validateLicense } = useAuthStore.getState();
    if (userEmail) {
      console.log("🔄 App started - validating pro status for:", userEmail);
      validateLicense(userEmail);
    }
  }, []);

  // Initialize RTL direction when language changes
  useEffect(() => {
    initializeRTL(i18n.language);
  }, [i18n.language]);

  // Apply theme to document root
  useEffect(() => {
    const theme = settings?.theme || "plain";
    document.documentElement.setAttribute("data-theme", theme);
  }, [settings?.theme]);

  // Initialize Enigo, shortcuts, and refresh audio devices when main app loads
  const osPlatform = platform();

  useEffect(() => {
    if (onboardingStep === "done" && !hasCompletedPostOnboardingInit.current) {
      hasCompletedPostOnboardingInit.current = true;

      let unlistenUsage: UnlistenFn | undefined;

      const initializeApp = async () => {
        try {
          await commands.initializeEnigo();
          await commands.initializeShortcuts();

          // usage-dictation from Rust (global shortcuts)
          unlistenUsage = await listen<number>("usage-dictation", (event) => {
            console.log("Usage dictation event received:", event.payload);
            useAuthStore.getState().incrementDictation(event.payload);
          });

          refreshAudioDevices();
          refreshOutputDevices();
        } catch (e) {
          console.warn("Failed to initialize:", e);
        }
      };

      initializeApp();

      return () => {
        unlistenUsage?.();
      };
    }
  }, [onboardingStep, refreshAudioDevices, refreshOutputDevices]);

  // Handle keyboard shortcuts for debug mode toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+D (Windows/Linux) or Cmd+Shift+D (macOS)
      const isDebugShortcut =
        event.shiftKey &&
        event.key.toLowerCase() === "d" &&
        (event.ctrlKey || event.metaKey);

      if (isDebugShortcut) {
        event.preventDefault();
        const currentDebugMode = settings?.debug_mode ?? false;
        updateSetting("debug_mode", !currentDebugMode);
      }
    };

    // Add event listener when component mounts
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settings?.debug_mode, updateSetting]);

  const checkOnboardingStatus = async () => {
    try {
      // Check if they have any models available
      const result = await commands.hasAnyModelsAvailable();
      const hasModels = result.status === "ok" && result.data;

      if (hasModels) {
        // Returning user - but check if they need to grant permissions on macOS
        setIsReturningUser(true);
        if (platform() === "macos") {
          try {
            const [hasAccessibility, hasMicrophone] = await Promise.all([
              checkAccessibilityPermission(),
              checkMicrophonePermission(),
            ]);
            if (!hasAccessibility || !hasMicrophone) {
              // Missing permissions - show accessibility onboarding
              setOnboardingStep("accessibility");
              return;
            }
          } catch (e) {
            console.warn("Failed to check permissions:", e);
            // If we can't check, proceed to main app and let them fix it there
          }
        }
        setOnboardingStep("done");
      } else {
        // New user - start full onboarding
        setIsReturningUser(false);
        setOnboardingStep("accessibility");
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
      setOnboardingStep("accessibility");
    }
  };

  const handleAccessibilityComplete = () => {
    // Returning users already have models, skip to main app
    // New users need to select a model
    setOnboardingStep(isReturningUser ? "done" : "model");
  };

  const handleModelSelected = () => {
    // Transition to main app - user has started a download
    setOnboardingStep("done");
  };

  const [showBetaNotice, setShowBetaNotice] = useState(() => {
    return localStorage.getItem("beta-notice-dismissed") !== "true";
  });

  // Still checking onboarding status
  if (onboardingStep === null) {
    return null;
  }

  if (onboardingStep !== "done") {
    return <OnboardingFlow onComplete={() => setOnboardingStep("done")} />;
  }

  return (
    <div
      dir={direction}
      data-platform={osPlatform}
      data-theme={settings?.theme || "plain"}
      className="h-screen flex select-none cursor-default overflow-hidden bg-background"
    >
      {showBetaNotice && (
        <BetaSecurityNotice
          onDismiss={() => {
            setShowBetaNotice(false);
            localStorage.setItem("beta-notice-dismissed", "true");
          }}
        />
      )}
      <SpeakSelection />
      <Toaster
        theme="system"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "bg-background border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 text-sm",
            title: "font-medium",
            description: "text-text-muted",
          },
        }}
      />

      <Sidebar
        activeSection={currentSection}
        onSectionChange={setCurrentSection}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <AccessibilityPermissions />
            {renderSettingsContent(currentSection)}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default App;
