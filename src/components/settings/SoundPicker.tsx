import React from "react";
import { Button } from "../ui/Button";
import { Select, SelectOption } from "../ui/Select";
import { PlayIcon } from "lucide-react";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettingsStore } from "../../stores/settingsStore";
import { useSettings } from "../../hooks/useSettings";

interface SoundPickerProps {
  label: string;
  description: string;
}

export const SoundPicker: React.FC<SoundPickerProps> = ({
  label,
  description,
}) => {
  const { getSetting, updateSetting } = useSettings();
  const playTestSound = useSettingsStore((state) => state.playTestSound);
  const customSounds = useSettingsStore((state) => state.customSounds);

  const selectedTheme = getSetting("sound_theme") ?? "marimba";

  const options: SelectOption[] = [
    { value: "marimba", label: "Marimba" },
    { value: "pop", label: "Pop" },
  ];

  // Only add Custom option if both custom sound files exist
  if (customSounds.start && customSounds.stop) {
    options.push({ value: "custom", label: "Custom" });
  }

  const handlePlayBothSounds = async () => {
    await playTestSound("start");
    await playTestSound("stop");
  };

  return (
    <SettingContainer
      title={label}
      description={description}
      grouped
      layout="horizontal"
    >
      <div className="flex items-center gap-2">
        <Select
          value={selectedTheme}
          onChange={(value) =>
            updateSetting("sound_theme", value as "marimba" | "pop" | "custom")
          }
          options={options}
          className="min-w-[140px]"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayBothSounds}
          title="Preview sound theme (plays start then stop)"
        >
          <PlayIcon className="h-4 w-4" />
        </Button>
      </div>
    </SettingContainer>
  );
};
