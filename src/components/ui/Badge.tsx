import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "secondary";
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className = "",
}) => {
  const variantClasses = {
    primary: "bg-accent/15 text-accent border border-accent/20",
    success: "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20",
    secondary: "bg-text/5 text-text-muted border border-border",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
