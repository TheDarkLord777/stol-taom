"use client";
import React from "react";
import Image from "next/image";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";
export default function Home() {
  const router = useRouter();
  return (
    <div className="w-full min-h-screen relative overflow-hidden">
      
      <div className="w-full max-w-[1920px] min-h-screen mx-auto relative overflow-hidden">
       
        {/* 🌄 Responsive fon rasmi */}
        <div className="relative w-full h-screen">
          {/* Desktop rasmi */}
          <div className="hidden md:block">
            <Image
              src="/background-1920.webp"
              alt="Background Desktop"
              fill
              priority
              quality={90}
              className="object-cover object-center"
            />{" "}
          </div>{" "}
          {/* Mobil rasmi */}{" "}
          <div className="block md:hidden">
            {" "}
            <Image
              src="/mobile.webp"
              alt="Background Mobile"
              fill
              priority
              quality={90}
              unoptimized
              className="object-contain contrast-125 saturate-110 brightness-105"
            />{" "}
          </div>{" "}
          {/* 🖥 DESKTOP uchun */}{" "}
          <div className="hidden md:flex absolute top-0 right-0 z-10 flex-col items-end gap-[10px]">
            {" "}
            <Button
              text="KIRISH"
              className="w-[180px] xl:w-[240px] pt-[13px] pl-[41px] pb-[13px] pr-[15px] text-[32px]"
            />{" "}
            <Button
              text="RO‘YHATDAN O‘TISH"
              className="pt-[13px] pb-[15px] text-[32px]"
              onClick={() => router.push("/register")}
            />{" "}
          </div>{" "}
          {/* 📱 MOBIL (portrait) */}{" "}
          <div className="max-md:portrait:flex hidden flex-col items-center gap-4 absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            {" "}
            <Button text="KIRISH" className="w-[200px] text-[20px]" />{" "}
            <Button
              text="RO‘YHATDAN O‘TISH"
              className="w-[200px] text-[20px]"
              onClick={() => router.push("/register")}
            />{" "}
          </div>{" "}
          {/* 📱 MOBIL (landscape) */}{" "}
          <div className="max-md:landscape:flex hidden flex-col items-end gap-2 absolute top-4 right-4 z-10">
            {" "}
            <Button text="KIRISH" className="w-[160px] text-[18px]" />{" "}
            <Button
              text="RO‘YHATDAN O‘TISH"
              className="w-[160px] text-[18px]"
              onClick={() => router.push("/register")}
            />{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
