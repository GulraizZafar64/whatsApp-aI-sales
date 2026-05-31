"use client";

import type { ComponentType, SVGProps } from "react";
import * as FlagIcons from "country-flag-icons/react/3x2";

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

const flags = FlagIcons as Record<string, FlagComponent | undefined>;

type Props = {
  code: string;
  className?: string;
};

export function CountryFlag({ code, className = "w-6 h-4 rounded-sm shrink-0" }: Props) {
  const Flag = flags[code.toUpperCase()];
  if (!Flag) {
    return (
      <span
        className={`inline-block bg-[#e9edef] rounded-sm ${className}`}
        aria-hidden
      />
    );
  }
  return (
    <span className="inline-flex shrink-0" title={code}>
      <Flag className={className} aria-hidden />
    </span>
  );
}
