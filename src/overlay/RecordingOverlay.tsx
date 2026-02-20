import { listen } from "@tauri-apps/api/event";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  TypeZeroLogoSmall,
} from "../components/icons";
import "./RecordingOverlay.css";
import { commands } from "@/bindings";
import i18n, { syncLanguageFromSettings } from "@/i18n";
import { getLanguageDirection } from "@/lib/utils/rtl";

type OverlayState = "recording" | "transcribing" | "processing";

const AnimatedReveal: React.FC<{ text: string }> = ({ text }) => {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= text.length + 5) {
          return 0;
        }
        return prev + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span style={{ display: "inline-block" }}>
      {text.split("").map((char, index) => (
        <span
          key={index}
          style={{
            opacity: index < visibleChars ? 1 : 0,
            transition: "opacity 50ms",
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
};

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(16).fill(0));
  const smoothedLevelsRef = useRef<number[]>(Array(16).fill(0));
  const direction = getLanguageDirection(i18n.language);

  useEffect(() => {
    const setupEventListeners = async () => {
      // Listen for show-overlay event from Rust
      const unlistenShow = await listen("show-overlay", async (event) => {
        // Sync language from settings each time overlay is shown
        await syncLanguageFromSettings();
        const overlayState = event.payload as OverlayState;
        setState(overlayState);
        setIsVisible(true);
      });

      // Listen for hide-overlay event from Rust
      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
      });

      // Listen for mic-level updates
      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const newLevels = event.payload as number[];

        // Apply smoothing to reduce jitter
        const smoothed = smoothedLevelsRef.current.map((prev, i) => {
          const target = newLevels[i] || 0;
          return prev * 0.7 + target * 0.3; // Smooth transition
        });

        smoothedLevelsRef.current = smoothed;
        setLevels(smoothed.slice(0, 9));
      });

      // Cleanup function
      return () => {
        unlistenShow();
        unlistenHide();
        unlistenLevel();
      };
    };

    setupEventListeners();
  }, []);

  const getIcon = () => {
    return (
      <div className={`logo-container ${state === "recording" ? "animate-pulse-slow" : "animate-spin-slow"}`}>
        <TypeZeroLogoSmall width={32} height={32} className="text-accent" />
      </div>
    );
  };

  return (
    <div
      dir={direction}
      className={`recording-overlay ${isVisible ? "fade-in" : ""}`}
    >
      <div className="overlay-left">{getIcon()}</div>

      <div className="overlay-middle">
        {state === "recording" && (
          <div className="flex items-center gap-2 justify-center w-full">
            <div className="transcribing-text">
              <AnimatedReveal text={t("overlay.listening")} />
            </div>
            <div className="bars-container">
              {levels.map((v, i) => (
                <div
                  key={i}
                  className="bar"
                  style={{
                    height: `${Math.min(20, 4 + Math.pow(v, 0.7) * 16)}px`, // Cap at 20px max height
                    transition: "height 60ms ease-out, opacity 120ms ease-out",
                    opacity: Math.max(0.2, v * 1.7), // Minimum opacity for visibility
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {state === "transcribing" && (
          <div className="transcribing-text">
            <AnimatedReveal text={t("overlay.transcribing")} />
          </div>
        )}
        {state === "processing" && (
          <div className="transcribing-text">
            <AnimatedReveal text={t("overlay.processing")} />
          </div>
        )}
      </div>

      <div className="overlay-right">
        {/* Cancel button removed as per user request */}
      </div>
    </div>
  );
};

export default RecordingOverlay;
