import React from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../ui/Select";
import { SettingContainer } from "../ui/SettingContainer";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "../../i18n";
import { useSettings } from "@/hooks/useSettings";

interface AppLanguageSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const AppLanguageSelector: React.FC<AppLanguageSelectorProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t, i18n } = useTranslation();
    const { settings, updateSetting } = useSettings();

    const currentLanguage = (settings?.app_language ||
      i18n.language) as SupportedLanguageCode;

    const languageOptions = SUPPORTED_LANGUAGES.map((lang) => ({
      value: lang.code,
      label: `${lang.nativeName} (${lang.name})`,
    }));

    const handleLanguageChange = (langCode: string) => {
      i18n.changeLanguage(langCode);
      updateSetting("app_language", langCode);
    };

    return (
      <SettingContainer
        title={t("appLanguage.title")}
        description={t("appLanguage.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <Select
          options={languageOptions}
          value={currentLanguage}
          onChange={(val) => {
            if (val) handleLanguageChange(val);
          }}
          className="min-w-[200px]"
        />
      </SettingContainer>
    );
  });

AppLanguageSelector.displayName = "AppLanguageSelector";
