import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

interface BetaChannelToggleProps {
    descriptionMode?: "inline" | "tooltip";
    grouped?: boolean;
}

export const BetaChannelToggle: React.FC<BetaChannelToggleProps> = React.memo(
    ({ descriptionMode = "tooltip", grouped = false }) => {
        const { t } = useTranslation();
        const { getSetting, updateSetting, isUpdating } = useSettings();

        const enabled = getSetting("beta_channel_enabled") || false;

        return (
            <ToggleSwitch
                checked={enabled}
                onChange={(enabled) => updateSetting("beta_channel_enabled", enabled)}
                isUpdating={isUpdating("beta_channel_enabled")}
                label={t("settings.betaChannel.label")}
                description={t("settings.betaChannel.description")}
                descriptionMode={descriptionMode}
                grouped={grouped}
            />
        );
    },
);
