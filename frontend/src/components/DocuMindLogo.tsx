import React from "react";

export interface DocuMindLogoProps {
  variant?: "full" | "icon" | "graphic";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showSubtitle?: boolean;
}

export default function DocuMindLogo({
  variant = "full",
  size = "md",
  className = "",
  showSubtitle = true,
}: DocuMindLogoProps) {
  const iconSizes = {
    xs: "h-5 w-5 rounded-md",
    sm: "h-7 w-7 rounded-lg",
    md: "h-9 w-9 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
    xl: "h-16 w-16 rounded-2xl",
  };

  const textSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const tagSizes = {
    xs: "text-[8px]",
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-xs",
  };

  // 1. Icon-only variant
  if (variant === "icon") {
    return (
      <div
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-accent-500/30 bg-base-900 shadow-glow transition-transform ${iconSizes[size]} ${className}`}
      >
        <img
          src="/logo-icon.png"
          alt="DocuMind AI"
          className="h-full w-full object-cover select-none pointer-events-none"
        />
      </div>
    );
  }

  // 2. Full Graphic Artwork badge (the complete official artwork image)
  if (variant === "graphic") {
    const graphicSizes = {
      xs: "w-20",
      sm: "w-28",
      md: "w-36",
      lg: "w-48",
      xl: "w-64",
    };
    return (
      <div className={`relative inline-block overflow-hidden rounded-2xl ${graphicSizes[size]} ${className}`}>
        <img
          src="/logo.png"
          alt="DocuMind AI — Your Personal Learning Companion"
          className="w-full object-contain select-none pointer-events-none"
        />
      </div>
    );
  }

  // 3. Full Brand combo (Emblem + sharp typography)
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`relative shrink-0 overflow-hidden border border-accent-500/30 bg-base-900 shadow-glow transition-transform ${iconSizes[size]}`}
      >
        <img
          src="/logo-icon.png"
          alt="DocuMind AI"
          className="h-full w-full object-cover select-none pointer-events-none"
        />
      </div>
      <div className="min-w-0 leading-tight">
        <span className={`block font-bold tracking-tight text-ink-50 ${textSizes[size]}`}>
          DocuMind <span className="text-accent-400">AI</span>
        </span>
        {showSubtitle && (
          <span className={`block font-medium tracking-wider uppercase text-accent-300 ${tagSizes[size]}`}>
            Learning Companion
          </span>
        )}
      </div>
    </div>
  );
}
