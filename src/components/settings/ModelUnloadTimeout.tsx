import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import { commands, type ModelUnloadTimeout } from "@/bindings";
import { Select } from "../ui/Select"; // Use Select
import { SettingContainer } from "../ui/SettingContainer";

interface ModelUnloadTimeoutProps {
  descriptionMode?: "tooltip" | "inline";
  grouped?: boolean;
}

export const ModelUnloadTimeoutSetting: React.FC<ModelUnloadTimeoutProps> = ({
  descriptionMode = "inline",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { settings, getSetting, updateSetting } = useSettings();

  const timeoutOptions = [
    {
      value: "never" as ModelUnloadTimeout,
      label: t("settings.advanced.modelUnload.options.never"),
    },
    {
      value: "immediately" as ModelUnloadTimeout,
      label: t("settings.advanced.modelUnload.options.immediately"),
    },
    {
      value: "min2" as ModelUnloadTimeout,
      label: t("settings.advanced.modelUnload.options.min2"),
    },
    {
      value: "min5" as ModelUnloadTimeout,
      label: t("settings.advanced.modelUnload.options.min5"),
    },
    {
      value: "min10" as ModelUnloadTimeout,
      label: t("settings.advanced.modelUnload.options.min10"),
    },
    {
      value: "min15" as ModelUnloadTimeout,
      label: t("settings.advanced.modelUnload.options.min15"),
    },
    {
      value: "hour1" as ModelUnloadTimeout,
      label: t("settings.advanced.modelUnload.options.hour1"),
    },
  ];

  const debugTimeoutOptions = [
    ...timeoutOptions,
    {
      value: "sec5" as ModelUnloadTimeout,
      label: t("settings.advanced.modelUnload.options.sec5"),
    },
  ];

  const handleChange = async (value: string | null) => {
    if (!value) return;
    const newTimeout = value as ModelUnloadTimeout;

    try {
      await commands.setModelUnloadTimeout(newTimeout);
      updateSetting("model_unload_timeout", newTimeout);
    } catch (error) {
      console.error("Failed to update model unload timeout:", error);
    }
  };

  const currentValue = getSetting("model_unload_timeout") ?? "never";

  const options = useMemo(() => {
    return settings?.debug_mode === true ? debugTimeoutOptions : timeoutOptions;
  }, [settings]);

  return (
    <SettingContainer
      title={t("settings.advanced.modelUnload.title")}
      description={t("settings.advanced.modelUnload.description")}
      descriptionMode={descriptionMode}
      grouped={grouped}
    >
      <Select
        options={options}
        value={currentValue}
        onChange={(val) => handleChange(val)}
        className="min-w-[200px]"
      />
    </SettingContainer>
  );
};
