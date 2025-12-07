"use client";
import React, { useEffect, useState } from "react";

interface GlowBorderButtonProps {
  label: string;
  href: string;
  icon?: string;
}

export default function GlowBorderButton({
  label,
  href,
  icon,
}: GlowBorderButtonProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [deviceCapability, setDeviceCapability] = useState<
    "high" | "mid" | "low"
  >("mid");

  useEffect(() => {
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    // Detect device capability based on screen width and cores (approximation)
    const cores = navigator.hardwareConcurrency || 4;
    const isSmallScreen = window.innerWidth < 768;

    if (isSmallScreen && cores <= 2) {
      setDeviceCapability("low");
    } else if (isSmallScreen || cores <= 4) {
      setDeviceCapability("mid");
    } else {
      setDeviceCapability("high");
    }
  }, []);

  // Adjust animation speed based on device capability
  const animationSpeed =
    deviceCapability === "low"
      ? "6s"
      : deviceCapability === "mid"
        ? "4s"
        : "3s";

  return (
    <a href={href} className="block w-full">
      <div
        className="glow-card relative h-14 w-full sm:max-w-xs overflow-hidden rounded-2xl"
        style={
          {
            "--animation-speed": animationSpeed,
          } as React.CSSProperties & { "--animation-speed": string }
        }
      >
        {/* Glow element - rotating around the button */}
        <div className="glow-element absolute w-8 h-8 rounded-full" />

        {/* Background gradient layer */}
        <div className="glow-bg-layer absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Inner button */}
        <div className="glow-inner relative h-full w-full bg-slate-950 text-white font-bold rounded-2xl flex items-center justify-start pl-5 md:pl-10 gap-3 hover:text-cyan-300 transition-colors group">
          {icon && <span className="text-2xl">{icon}</span>}
          <span className="text-xl">{label}</span>
        </div>
      </div>

      {/* CSS for glowing effect */}
      <style>{`
              @property --hue {
                syntax: "<number>";
                inherits: true;
                initial-value: 0;
              }

              @property --glow-blur {
                syntax: "<number>";
                inherits: true;
                initial-value: 6;
              }

              @property --glow-opacity {
                syntax: "<number>";
                inherits: true;
                initial-value: 0.8;
              }

              @property --glow-scale {
                syntax: "<number>";
                inherits: true;
                initial-value: 1.5;
              }

              @property --rotate {
                syntax: "<number>";
                inherits: true;
                initial-value: 0;
              }

              .glow-card {
                --hue: 0;
                --glow-blur: 6;
                --glow-opacity: 0.8;
                --glow-scale: 1.5;
                --rotate: 0;
                --animation-speed: 4s;
              }

              .glow-element {
                animation: rotateShadow var(--animation-speed) linear infinite;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotateZ(calc(var(--rotate) * 1deg));
                width: 120%;
                height: 120%;
                background: radial-gradient(
                  circle,
                  hsl(calc(var(--hue) * 1deg), 100%, 60%) 0%,
                  transparent 70%
                );
                filter: blur(calc(var(--glow-blur) * 1px));
                opacity: var(--glow-opacity);
                z-index: -1;
              }

              .glow-card:hover .glow-element {
                --glow-blur: 2;
                --glow-opacity: 0.6;
                --glow-scale: 2.5;
              }

              .glow-bg-layer {
                background: radial-gradient(
                  30% 30% at 50% 50%,
                  hsl(calc(var(--hue) * 1deg), 100%, 30%) 0%,
                  hsl(calc(var(--hue) * 1deg), 100%, 10%) 40%,
                  transparent 100%
                );
                mix-blend-mode: color-burn;
              }

              @keyframes rotateShadow {
                0% {
                  --rotate: -70;
                  --hue: 0;
                }
                25% {
                  --hue: 90;
                }
                50% {
                  --rotate: 290;
                  --hue: 180;
                }
                75% {
                  --hue: 270;
                }
                100% {
                  --rotate: 360;
                  --hue: 360;
                }
              }
            `}</style>
    </a>
  );
}
