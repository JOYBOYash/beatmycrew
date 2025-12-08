
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Wand2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
       <Card className="w-full max-w-lg text-center shadow-2xl bg-card/80 backdrop-blur-sm border-white/20 animate-map-open">
        <CardHeader>
          <Logo />
        </CardHeader>
        <CardContent>
          <p className="text-lg text-foreground mb-6">
            Welcome, pirate! Your next great adventure awaits. Assemble a crew of legendary warriors, cunning navigators, and brilliant minds from the world of One Piece. Challenge your friends, get your crew rated, and see who can build the ultimate pirate fleet.
          </p>
          <Button asChild size="lg">
            <Link href="/build">
              <Wand2 className="mr-2"/>
              Start Building Your Crew
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
