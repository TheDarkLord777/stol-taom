import React from "react";
import Button from "@/components/Button";
import Image from "next/image";

export default function Home() {
  return (
    <div className="w-full min-h-screen relative overflow-hidden">
      <div className="w-full max-w-[1920px] min-h-screen mx-auto relative overflow-hidden">
        <div className="relative w-full h-screen">
          import Image from "next/image";
          <Image
            src="/background-1920.webp"
            alt="Background"
            fill
            className="object-cover object-center lg:object-center md:object-center"
            quality={80}
            priority
          />
          <div className="absolute top-0 right-0 z-10 flex flex-col items-end gap-[10px] ">
            {/* KIRISH */}
            <Button
              text="KIRISH"
              className="w-[180px] sm:w-[180px] md:w-[180px] lg:w-[180px] xl:w-[180px] 2xl:w-[240px] pt-[13px] pl-[41px] pb-[13px] pr-[15px]  text-[20px] sm:text-[24px] md:text-[28px] lg:text-[32px]"
            />

            {/* RO‘YHATDAN O‘TISH */}
            <Button
              text="RO‘YHATDAN O‘TISH"
              className="pt-[13px] pb-[15px] pl-[0px] pr-[0px]  text-[20px] sm:text-[24px] md:text-[28px] lg:text-[32px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
