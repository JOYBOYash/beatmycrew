import { cn } from "@/lib/utils";
import Image from "next/image";

export const Logo = () => {
  return (
    <div className="flex flex-col items-center">
      <Image
        src="/bmc_logo.png"
        alt="BeatMyCrew Logo"
        width={64}
        height={64}
        className="w-16 h-16"
      />
      <h1 className="text-4xl font-headline font-bold text-center mt-2">
        BeatMyCrew
      </h1>
      <p className="text-muted-foreground mt-2 text-center">
        Assemble your ultimate One Piece crew and get rated!
      </p>
    </div>
  );
};
