import React from "react";
import { useTranslation } from "react-i18next";
import { ShowOverlay } from "../ShowOverlay";
import { ModelUnloadTimeoutSetting } from "../ModelUnloadTimeout";
import { CustomWords } from "../CustomWords";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { StartHidden } from "../StartHidden";
import { AutostartToggle } from "../AutostartToggle";
import { ShowTrayIcon } from "../ShowTrayIcon";
import { PasteMethodSetting } from "../PasteMethod";
import { TypingToolSetting } from "../TypingTool";
import { ClipboardHandlingSetting } from "../ClipboardHandling";
import { AutoSubmit } from "../AutoSubmit";
import { PostProcessingToggle } from "../PostProcessingToggle";
import { AppendTrailingSpace } from "../AppendTrailingSpace";
import { HistoryLimit } from "../HistoryLimit";
import { RecordingRetentionPeriodSelector } from "../RecordingRetentionPeriod";
import { ExperimentalToggle } from "../ExperimentalToggle";
import { useSettings } from "../../../hooks/useSettings";
import { KeyboardImplementationSelector } from "../debug/KeyboardImplementationSelector";
import { BetaChannelToggle } from "../BetaChannelToggle";

import { GlobalShortcutInput } from "../GlobalShortcutInput";

export const AdvancedSettings: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const experimentalEnabled = getSetting("experimental_enabled") || false;

  return (
    <div className="w-full space-y-12">
      <div className="space-y-1 mb-8">
        <h1 className="mac-title text-3xl">{t("settings.advanced.groups.app")}</h1>
        <p className="mac-muted text-sm">Fine-tune application behavior and visibility.</p>
      </div>

      <div className="space-y-8">
        <SettingsGroup title="System Behavior">
          <GlobalShortcutInput shortcutId="transcribe" />
          <StartHidden descriptionMode="tooltip" grouped={true} />
          <AutostartToggle descriptionMode="tooltip" grouped={true} />
          <ShowTrayIcon descriptionMode="tooltip" grouped={true} />
          <ShowOverlay descriptionMode="tooltip" grouped={true} />
          <ModelUnloadTimeoutSetting descriptionMode="tooltip" grouped={true} />
          <BetaChannelToggle descriptionMode="tooltip" grouped={true} />
        </SettingsGroup>

        <SettingsGroup title={t("settings.advanced.groups.output")}>
          <PasteMethodSetting descriptionMode="tooltip" grouped={true} />
          <TypingToolSetting descriptionMode="tooltip" grouped={true} />
          <ClipboardHandlingSetting descriptionMode="tooltip" grouped={true} />
          <AutoSubmit descriptionMode="tooltip" grouped={true} />
        </SettingsGroup>

        <SettingsGroup title={t("settings.advanced.groups.transcription")}>
          <CustomWords descriptionMode="tooltip" grouped />
          <AppendTrailingSpace descriptionMode="tooltip" grouped={true} />
        </SettingsGroup>

        <SettingsGroup title={t("settings.advanced.groups.history")}>
          <HistoryLimit descriptionMode="tooltip" grouped={true} />
          <RecordingRetentionPeriodSelector
            descriptionMode="tooltip"
            grouped={true}
          />
        </SettingsGroup>

        <SettingsGroup title="Experimental">
          <ExperimentalToggle descriptionMode="tooltip" grouped={true} />
          {experimentalEnabled && (
            <>
              <PostProcessingToggle descriptionMode="tooltip" grouped={true} />
              <KeyboardImplementationSelector
                descriptionMode="tooltip"
                grouped={true}
              />
            </>
          )}
        </SettingsGroup>
      </div>
    </div>
  );
};
