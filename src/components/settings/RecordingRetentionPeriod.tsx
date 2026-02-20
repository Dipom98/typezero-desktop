import React from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../ui/Select";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import { RecordingRetentionPeriod } from "@/bindings";

interface RecordingRetentionPeriodProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const RecordingRetentionPeriodSelector: React.FC<RecordingRetentionPeriodProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const selectedRetentionPeriod =
      getSetting("recording_retention_period") || "never";
    const historyLimit = getSetting("history_limit") || 5;

    const handleRetentionPeriodSelect = async (period: string | null) => {
      if (!period) return;
      await updateSetting(
        "recording_retention_period",
        period as RecordingRetentionPeriod,
      );
    };

    const retentionOptions = [
      { value: "never", label: t("settings.debug.recordingRetention.never") },
      {
        value: "preserve_limit",
        label: t("settings.debug.recordingRetention.preserveLimit", {
          count: Number(historyLimit),
        }),
      },
      { value: "days3", label: t("settings.debug.recordingRetention.days3") },
      { value: "weeks2", label: t("settings.debug.recordingRetention.weeks2") },
      {
        value: "months3",
        label: t("settings.debug.recordingRetention.months3"),
      },
    ];

    return (
      <SettingContainer
        title={t("settings.debug.recordingRetention.title")}
        description={t("settings.debug.recordingRetention.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <Select
          options={retentionOptions}
          value={selectedRetentionPeriod as string}
          onChange={handleRetentionPeriodSelect}
          placeholder={t("settings.debug.recordingRetention.placeholder")}
          disabled={isUpdating("recording_retention_period")}
          className="min-w-[200px]"
        />
      </SettingContainer>
    );
  });

RecordingRetentionPeriodSelector.displayName =
  "RecordingRetentionPeriodSelector";
