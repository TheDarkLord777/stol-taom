"use client";
import React from "react";

interface ButtonProps {
  text: string;
  className?: string;
  onClick?: () => void;
}

const Button = ({ text, className }: ButtonProps) => {
  return (
    <button
      className={`bg-[#FFC412] text-black border border-[#060101]
                  rounded-[12px] font-normal
                  text-[20px] sm:text-[24px] md:text-[28px] lg:text-[32px]
                  leading-none cursor-pointer hover:bg-[#e5b010] transition-transform active:translate-y-[2px] select-none
                  h-[40px] sm:h-[40px] md:h-[50px] lg:h-[60px]
                  w-full
                  will-change-transform
                  ${className ?? ""}`}
    >
      {text}
    </button>
  );
};

export default Button;
