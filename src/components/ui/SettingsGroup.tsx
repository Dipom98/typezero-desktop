import React from "react";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-4 w-full">
      {title && (
        <div className="px-1 border-b border-border/40 pb-2 mb-4">
          <h2 className="text-[13px] font-bold text-text/40 uppercase tracking-widest">
            {title}
          </h2>
          {description && (
            <p className="mac-muted mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="flex flex-col mac-card px-0 overflow-hidden divide-y divide-border/20">
        {children}
      </div>
    </div>
  );
};
