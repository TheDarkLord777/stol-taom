"use client";
import React from "react";
import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="w-full min-h-screen relative overflow-hidden">
      <div className="w-full max-w-[1920px] min-h-screen mx-auto relative overflow-hidden">
        <div className="relative w-full h-screen">
          <picture className="absolute w-full h-full top-0 left-0">
            <source srcSet="/background-1920.jpg" media="(min-width: 768px)" />
            <source srcSet="/mobile.jpg" media="(max-width: 767px)" />
            <img
              src="/background-1920.jpg"
              alt="Fon rasmi"
              className="w-full h-full md:object-cover max-md:object-contain max-md:w-full max-md:h-full max-md:m-auto max-md:block"
            />
          </picture>

          {/* 🖥 DESKTOP */}
          <div className="hidden md:flex absolute top-0 right-0 z-10 flex-col items-end gap-[10px] mt-[10px] mr-1">
            <Button text="KIRISH" href="/login" />
            <Button text="RO‘YHATDAN O‘TISH" href="/register" />
          </div>

          {/* 📱 MOBIL (portrait) */}
          <div className="hidden max-md:portrait:flex flex-col items-center gap-4 absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <Button
              text="KIRISH"
              className="min-w-[180px] h-[48px] px-[20px] text-[18px]"
            />
            <Button
              text="RO‘YHATDAN O‘TISH"
              className="min-w-[180px] h-[48px] px-[20px] text-[18px] whitespace-nowrap"
              href="/register"
            />
          </div>

          {/* 📱 MOBIL (landscape) */}
          <div className="hidden max-md:landscape:flex flex-col items-end gap-2 absolute top-4 right-4 z-10">
            <Button
              text="KIRISH"
              className="min-w-[140px] h-[42px] px-[16px] text-[16px]"
            />
            <Button
              text="RO‘YHATDAN O‘TISH"
              className="min-w-[140px] h-[42px] px-[16px] text-[16px] whitespace-nowrap"
              href="/register"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
