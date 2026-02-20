import React, { useMemo } from "react";
import { Select } from "../ui/Select";
import { useTranslation } from "react-i18next";
import { SettingContainer } from "../ui/SettingContainer";
import { ResetButton } from "../ui/ResetButton";
import { useSettings } from "../../hooks/useSettings";
import { LANGUAGES } from "../../lib/constants/languages";

interface LanguageSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  supportedLanguages?: string[];
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  descriptionMode = "tooltip",
  grouped = false,
  supportedLanguages,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, resetSetting, isUpdating } = useSettings();
  const selectedLanguage = getSetting("selected_language") || "auto";

  const availableLanguages = useMemo(() => {
    if (!supportedLanguages || supportedLanguages.length === 0)
      return LANGUAGES;
    return LANGUAGES.filter(
      (lang) =>
        lang.value === "auto" || supportedLanguages.includes(lang.value),
    );
  }, [supportedLanguages]);



  const handleLanguageSelect = async (languageCode: string | null) => {
    if (languageCode) {
      await updateSetting("selected_language", languageCode);
    }
  };

  const handleReset = async () => {
    await resetSetting("selected_language");
  };

  const selectOptions = useMemo(() => {
    return availableLanguages.map((lang) => ({
      value: lang.value,
      label: lang.label,
    }));
  }, [availableLanguages]);

  return (
    <SettingContainer
      title={t("settings.general.language.title")}
      description={t("settings.general.language.description")}
      descriptionMode={descriptionMode}
      grouped={grouped}
    >
      <div className="flex items-center space-x-2">
        <Select
          options={selectOptions}
          value={selectedLanguage}
          onChange={handleLanguageSelect}
          disabled={isUpdating("selected_language")}
          placeholder={t("settings.general.language.searchPlaceholder")}
          className="min-w-[200px]"
        />
        <ResetButton
          onClick={handleReset}
          disabled={isUpdating("selected_language")}
        />
        {isUpdating("selected_language") && (
          <div className="absolute inset-0 bg-mid-gray/10 rounded flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 border-2 border-logo-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </SettingContainer>
  );
};
