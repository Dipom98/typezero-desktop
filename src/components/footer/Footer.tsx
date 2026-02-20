import React, { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

import ModelSelector from "../model-selector";
import UpdateChecker from "../update-checker";

import { useSettings } from "../../hooks/useSettings";

const Footer: React.FC = () => {
  const [version, setVersion] = useState("");
  const { getSetting } = useSettings();
  const isBeta = getSetting("beta_channel_enabled");

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
    <div className="w-full border-t border-mid-gray/20 pt-3">
      <div className="flex justify-between items-center text-xs px-4 pb-3 text-text/60">
        <div className="flex items-center gap-2">
          <UpdateChecker />
          <span>•</span>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span className="flex items-center gap-1.5">
            v{version}
            {isBeta && (
              <span className="px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-medium border border-orange-500/20">
                BETA
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            <span className="text-[10px] font-bold text-text/70 uppercase tracking-wider">
              On-Device • Private
            </span>
          </div>
          <ModelSelector />
        </div>
      </div>
    </div>
  );
};

export default Footer;
