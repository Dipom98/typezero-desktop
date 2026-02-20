import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

interface TelemetryToggleProps {
    descriptionMode?: "inline" | "tooltip";
    grouped?: boolean;
}

export const TelemetryToggle: React.FC<TelemetryToggleProps> = React.memo(
    ({ descriptionMode = "tooltip", grouped = false }) => {
        const { t } = useTranslation();
        const { getSetting, updateSetting, isUpdating } = useSettings();

        const enabled = getSetting("telemetry_enabled") || false;

        return (
            <ToggleSwitch
                checked={enabled}
                onChange={(enabled) => updateSetting("telemetry_enabled", enabled)}
                isUpdating={isUpdating("telemetry_enabled")}
                label={t("settings.telemetry.label")}
                description={t("settings.telemetry.description")}
                descriptionMode={descriptionMode}
                grouped={grouped}
            />
        );
    },
);
