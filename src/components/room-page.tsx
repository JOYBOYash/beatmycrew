"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Character,
  Role,
  ROLES,
  generateCharacterPool,
} from "@/lib/characters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Home, Share2, Users, Crown, Star, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CaptainIcon } from "./icons/captain-icon";
import { ViceCaptainIcon } from "./icons/vice-captain-icon";
import { NavigatorIcon } from "./icons/navigator-icon";
import { SniperIcon } from "./icons/sniper-icon";
import { CookIcon } from "./icons/cook-icon";

type GamePhase = "drafting" | "voting" | "result";

const roleIcons: Record<Role, React.ComponentType<{ className?: string }>> = {
  Captain: CaptainIcon,
  "Vice-Captain": ViceCaptainIcon,
  Navigator: NavigatorIcon,
  Sniper: SniperIcon,
  Cook: CookIcon,
};

export default function RoomPage({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<GamePhase>("drafting");
  const [characterPool, setCharacterPool] = useState<Character[]>([]);
  const [draftedCharacter, setDraftedCharacter] = useState<Character | null>(
    null
  );
  const [myCrew, setMyCrew] = useState<Record<Role, Character | null>>(
    Object.fromEntries(ROLES.map((r) => [r, null])) as Record<
      Role,
      Character | null
    >
  );
  const [finalScore, setFinalScore] = useState<number>(0);

  useEffect(() => {
    setCharacterPool(generateCharacterPool(50));
  }, []);

  const crewIsFull = useMemo(
    () => Object.values(myCrew).every((c) => c !== null),
    [myCrew]
  );
  
  const assignedRoles = useMemo(() =>
    ROLES.filter(role => myCrew[role] !== null),
    [myCrew]
  );

  const handleDraft = () => {
    if (draftedCharacter) return;
    if (characterPool.length > 0) {
      const newPool = [...characterPool];
      const draftIndex = Math.floor(Math.random() * newPool.length);
      const character = newPool.splice(draftIndex, 1)[0];
      setDraftedCharacter(character);
      setCharacterPool(newPool);
    }
  };

  const handleAssignRole = (role: Role) => {
    if (!draftedCharacter) return;
    setMyCrew((prev) => ({ ...prev, [role]: draftedCharacter }));
    setDraftedCharacter(null);
  };
  
  useEffect(() => {
    if (crewIsFull) {
      setPhase("voting");
    }
  }, [crewIsFull]);

  const handleSubmitRating = (rating: number) => {
    // Simulate a score calculation
    const score = (rating[0] + (Math.random() * 3 + 7)) / 2;
    setFinalScore(score);
    setPhase("result");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Room Link Copied!",
      description: "Invite others to join your room.",
    });
  };

  const handlePlayAgain = () => {
    setPhase("drafting");
    setCharacterPool(generateCharacterPool(50));
    setDraftedCharacter(null);
    setMyCrew(Object.fromEntries(ROLES.map(r => [r, null])) as Record<Role, Character | null>);
    setFinalScore(0);
  }

  const renderCrewMember = (role: Role) => {
    const character = myCrew[role];
    const Icon = roleIcons[role];

    return (
      <div key={role} className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-5 h-5" />
          <h4 className="font-semibold text-sm">{role}</h4>
        </div>
        <Card className="w-full h-48 flex items-center justify-center relative overflow-hidden bg-card/50">
          {character ? (
            <>
              <Image
                src={character.image}
                alt={character.name}
                data-ai-hint={character.imageHint}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-center">
                <p className="text-white text-xs font-bold truncate">
                  {character.name}
                </p>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-2xl">?</div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="grid gap-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline">The Grand Line Draft</h1>
          <div className="text-muted-foreground">
            Room Code: <Badge variant="secondary">{roomId}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}><Home className="mr-2 h-4 w-4"/>Home</Button>
          <Button onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/>Share</Button>
        </div>
      </header>
      
      <Separator />

      {phase === "drafting" && (
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Draft a Character</CardTitle>
              <CardDescription>
                Remaining in Pool: {characterPool.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center gap-4 text-center">
              {draftedCharacter ? (
                <Card className="w-64 relative overflow-hidden shadow-lg">
                  <Image
                    src={draftedCharacter.image}
                    alt={draftedCharacter.name}
                    width={400}
                    height={600}
                    data-ai-hint={draftedCharacter.imageHint}
                    className="w-full"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <h3 className="text-white text-lg font-bold">{draftedCharacter.name}</h3>
                  </div>
                </Card>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
                  <Users size={48} />
                  <p>Click draft to reveal a character</p>
                </div>
              )}
              <Button onClick={handleDraft} disabled={!!draftedCharacter || crewIsFull} size="lg">
                Draft Character
              </Button>
              {draftedCharacter && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                    {ROLES.filter(r => !assignedRoles.includes(r)).map(role => (
                        <Button key={role} variant="secondary" onClick={() => handleAssignRole(role)}>Assign to {role}</Button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Your Crew</CardTitle>
              <CardDescription>Fill all 5 positions to complete your crew.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ROLES.map(renderCrewMember)}
            </CardContent>
          </Card>
        </div>
      )}

      {(phase === "voting" || phase === "result") && (
         <Card className="w-full max-w-4xl mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-headline">
                {phase === 'voting' ? "Rate Your Masterpiece" : "Final Verdict"}
                </CardTitle>
                <CardDescription>
                {phase === 'voting' ? "Your crew is assembled! How powerful do they seem?" : `Your crew has been rated!`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
                    {ROLES.map(renderCrewMember)}
                </div>

                {phase === 'voting' && (
                  <div className="flex flex-col items-center gap-4">
                      <Slider defaultValue={[5]} max={10} step={1} className="max-w-md" onValueCommit={handleSubmitRating} />
                      <p className="text-sm text-muted-foreground">Slide to submit your rating from 1 to 10</p>
                  </div>
                )}

                {phase === 'result' && (
                    <div className="text-center flex flex-col items-center gap-4 animate-in fade-in duration-500">
                        <div className="flex items-center gap-4">
                            <Star className="text-accent w-10 h-10" fill="currentColor" />
                            <p className="text-6xl font-bold font-headline">{finalScore.toFixed(1)}</p>
                            <Star className="text-accent w-10 h-10" fill="currentColor" />
                        </div>
                        <p className="text-lg text-muted-foreground">An impressive score!</p>
                        <Button onClick={handlePlayAgain} size="lg">
                            <RotateCw className="mr-2 h-4 w-4" />
                            Assemble a New Crew
                        </Button>
                    </div>
                )}
            </CardContent>
         </Card>
      )}

    </div>
  );
}
