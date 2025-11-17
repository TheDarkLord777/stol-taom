"use client";
import * as React from "react";

type TiltedCardProps = {
    imageSrc?: string | null;
    altText?: string;
    captionText?: string;
    containerHeight?: string;
    containerWidth?: string;
    imageHeight?: number | string;
    imageWidth?: number | string;
    rotateAmplitude?: number; // degrees
    scaleOnHover?: number;
    showMobileWarning?: boolean;
    showTooltip?: boolean;
    displayOverlayContent?: boolean;
    overlayContent?: React.ReactNode;
    className?: string;
    onClick?: () => void;
};

export default function TiltedCard({
    imageSrc,
    altText = "",
    captionText,
    containerHeight = "280px",
    containerWidth = "100%",
    imageHeight = "280px",
    imageWidth = "100%",
    rotateAmplitude = 12,
    scaleOnHover = 1.08,
    showMobileWarning = true,
    showTooltip = false,
    displayOverlayContent = false,
    overlayContent = null,
    className = "",
    onClick,
}: TiltedCardProps) {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const [hovered, setHovered] = React.useState(false);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handle = (e: MouseEvent) => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const ry = (dx / (rect.width / 2)) * rotateAmplitude; // rotateY
            const rx = -(dy / (rect.height / 2)) * rotateAmplitude; // rotateX
            el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${hovered ? scaleOnHover : 1})`;
        };

        const reset = () => {
            if (!el) return;
            el.style.transform = `perspective(900px) scale(1)`;
        };

        const onEnter = () => setHovered(true);
        const onLeave = () => setHovered(false);

        el.addEventListener("mousemove", handle);
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        window.addEventListener("mouseout", reset);

        return () => {
            el.removeEventListener("mousemove", handle);
            el.removeEventListener("mouseenter", onEnter);
            el.removeEventListener("mouseleave", onLeave);
            window.removeEventListener("mouseout", reset);
        };
    }, [rotateAmplitude, scaleOnHover, hovered]);

    return (
        <div
            ref={ref}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
            }}
            className={`transform will-change-transform transition-transform duration-200 ease-out ${className}`}
            style={{ height: containerHeight, width: containerWidth, cursor: onClick ? "pointer" : "default" }}
        >
            <div className="relative h-full w-full overflow-hidden rounded-lg shadow-md bg-gray-50">
                {imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageSrc}
                        alt={altText}
                        style={{ height: imageHeight, width: imageWidth, objectFit: "cover" }}
                        className="block w-full"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500">No image</div>
                )}

                {displayOverlayContent ? (
                    <div className="absolute inset-0 flex items-end">
                        <div className="w-full bg-linear-to-t from-black/60 to-transparent p-3 text-white">
                            {overlayContent ?? (
                                <div className="text-sm font-semibold truncate">{captionText}</div>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
