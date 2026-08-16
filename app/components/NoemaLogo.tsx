import React from "react";

export function NoemaLogo({className = "brand-mark", size = 26}: {className?: string; size?: number}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{display: "inline-block", verticalAlign: "middle", flexShrink: 0}}
    >
      <defs>
        <linearGradient id="noema-logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="50%" stopColor="oklch(0.76 0.12 180)" />
          <stop offset="100%" stopColor="oklch(0.82 0.14 165)" />
        </linearGradient>
      </defs>
      {/* Outer N loop */}
      <path
        d="M 24 72 
           C 14 58, 20 36, 38 18 
           C 48 8, 58 14, 62 22 
           L 32 60 
           C 26 68, 32 80, 44 80 
           C 56 80, 66 68, 76 46 
           L 82 34"
        stroke="url(#noema-logo-gradient)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner diagonal contour */}
      <path
        d="M 40 28 
           L 58 52 
           C 64 60, 72 52, 70 42"
        stroke="url(#noema-logo-gradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow head */}
      <path
        d="M 64 26 L 86 14 L 88 38"
        stroke="url(#noema-logo-gradient)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Circle node & arc */}
      <circle
        cx="72"
        cy="38"
        r="5"
        stroke="url(#noema-logo-gradient)"
        strokeWidth="5"
        fill="none"
      />
      <path
        d="M 80 46 A 12 12 0 0 0 86 28"
        stroke="url(#noema-logo-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
