import React from "react";
import iconUrl from "../../assets/logo.png";

const TypeZeroLogoSmall = ({
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
            src={iconUrl}
            alt="TypeZero Logo"
            width={width || 32}
            height={height || 32}
            className={`object-contain ${className || ""}`}
        />
    );
};

export default TypeZeroLogoSmall;
