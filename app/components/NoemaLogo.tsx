import React from "react";

export function NoemaLogo({className = "brand-mark", size = 26}: {className?: string; size?: number}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src="/noemalogo-mark.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      style={{display: "inline-block", verticalAlign: "middle", flexShrink: 0, objectFit: "contain"}}
    />
  );
}
