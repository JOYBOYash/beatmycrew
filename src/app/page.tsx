
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
       <div className="w-full max-w-lg text-center animate-map-open bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/20">
          <Logo />
          <Balancer className="text-lg text-white/90 mt-6 [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
            Welcome, pirate! Your next great adventure awaits. Assemble a crew of legendary warriors, cunning navigators, and brilliant minds from the world of One Piece. Challenge your friends, get your crew rated, and see who can build the ultimate pirate fleet.
          </Balancer>
          <Button asChild size="lg" className="mt-8">
            <Link href="/build">
              <Wand2 className="mr-2"/>
              Start Building Your Crew
            </Link>
          </Button>
      </div>
    </main>
  );
}
