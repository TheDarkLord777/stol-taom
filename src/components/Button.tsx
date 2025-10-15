"use client";
import React from "react";
import Link from "next/link";

interface ButtonProps {
  text: string;
  className?: string;
  onClick?: () => void;
  href?: string; // if provided, render as Link for prefetch/navigation
}
const Button = ({ text, className, onClick, href }: ButtonProps) => {
  const baseClasses = `bg-[#4E6441] text-white border border-[#060101] rounded-[12px] font-normal
    leading-none cursor-pointer hover:bg-[#6B855A]
    transition-colors active:translate-y-[2px] select-none
    flex items-center justify-center text-center box-border`;

  const fallbackSizing = "min-w-[300px] h-[60px] px-[95px] text-[32px]";

  if (href) {
    return (
      <Link
        href={href}
        prefetch
        className={`${baseClasses} ${className ?? fallbackSizing}`}
        role="button"
      >
        {text}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${className ?? fallbackSizing}`}
      type="button"
    >
      {text}
    </button>
  );
};

export default Button;
