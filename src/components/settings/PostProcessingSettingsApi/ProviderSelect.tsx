import React from "react";
import { Select, type SelectOption } from "../../ui/Select";

interface ProviderSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ProviderSelect: React.FC<ProviderSelectProps> = React.memo(
  ({ options, value, onChange, disabled }) => {
    return (
      <Select
        options={options}
        value={value}
        onChange={(val) => onChange(val || "")}
        disabled={disabled}
        className="flex-1"
      />
    );
  },
);

ProviderSelect.displayName = "ProviderSelect";
