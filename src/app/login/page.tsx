import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/register.png"
          alt="Food background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Title */}
          <div className="flex justify-center">
            <h1 className="bg-[#7B9EFF] px-12 py-3 text-3xl font-bold text-white rounded-lg shadow-lg">
              Kirish
            </h1>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name Input */}
            <div className="flex justify-center">
              <Input
                type="text"
                placeholder="Telefon raqamingiz kiriting"
                className="h-14 w-full max-w-md bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-lg border-none shadow-lg placeholder-inika-24"
              />
            </div>

            {/* Password Input */}
            <div className="flex justify-center">
              <Input
                type="password"
                placeholder="Parolni kiriting"
                className="h-14 w-full max-w-md bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-lg border-none shadow-lg placeholder-inika-24"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-4 pt-4">
            {/* Confirm Button */}
            <div className="flex justify-center">
              <Button className="h-16 w-full max-w-xs bg-[#C8FF00] hover:bg-[#B8EF00] text-black text-2xl font-bold shadow-xl rounded-lg">
                Tasdiqlash
              </Button>
            </div>

            {/* Register Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="h-14 w-48  bg-[#FFB800] hover:bg-[#EFA800] text-black text-xl font-bold shadow-lg border-2 border-black rounded-lg"
                href="/register"
              >
                Ro'yhatdan o'tish &rarr; 
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
