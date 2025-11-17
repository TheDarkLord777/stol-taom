"use client";
import React from "react";
import { cn } from "@/lib/utils";

type ShimmerProps = React.HTMLAttributes<HTMLDivElement> & {
    className?: string;
};

export default function Shimmer({ className, ...rest }: ShimmerProps) {
    return (
        <div
            className={cn("animate-pulse bg-gray-200 dark:bg-gray-700", className)}
            aria-hidden
            {...rest}
        />
    );
}

export { Shimmer };
