import React from "react";
import logoUrl from "../../assets/logo-tagline.png";

const TypeZeroTextLogo = ({
  width,
  height,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => {
  return (
    <img
      src={logoUrl}
      alt="TypeZero Logo"
      width={width || 260}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default TypeZeroTextLogo;
