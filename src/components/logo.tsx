import { cn } from "@/lib/utils";
import Image from "next/image";
import Balancer from "react-wrap-balancer";

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
      <h1 className="text-4xl font-headline font-bold text-center mt-2 text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
        BeatMyCrew
      </h1>
      <Balancer className="text-muted-foreground mt-2 text-center text-white/80 [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
        Assemble your ultimate One Piece crew and get rated!
      </Balancer>
    </div>
  );
};
