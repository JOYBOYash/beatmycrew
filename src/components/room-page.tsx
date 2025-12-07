
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Character,
  Role,
  ROLES,
  generateCharacterPool,
  fetchAllCharacters,
} from "@/lib/characters";
import { getCharImage } from "@/lib/character-images";
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
import { Home, Share2, Users, Star, RotateCw, Replace, X, AlertTriangle, Settings, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CaptainIcon } from "./icons/captain-icon";
import { ViceCaptainIcon } from "./icons/vice-captain-icon";
import { NavigatorIcon } from "./icons/navigator-icon";
import { SniperIcon } from "./icons/sniper-icon";
import { CookIcon } from "./icons/cook-icon";
import { DoctorIcon } from "./icons/doctor-icon";
import { ShipwrightIcon } from "./icons/shipwright-icon";
import { CombatantIcon } from "./icons/combatant-icon";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

type GamePhase = "drafting" | "swapping" | "voting" | "result";

const roleIcons: Record<Role, React.ComponentType<{ className?: string }>> = {
  Captain: CaptainIcon,
  "Vice-Captain": ViceCaptainIcon,
  Navigator: NavigatorIcon,
  Sniper: SniperIcon,
  Cook: CookIcon,
  Doctor: DoctorIcon,
  Shipwright: ShipwrightIcon,
  Combatant: CombatantIcon,
};

type DraftedCharacterState = {
  info: Character;
  imageUrl: string;
};

// Function to store reported issues in localStorage
const getReportedIssues = (): string[] => {
    if (typeof window === 'undefined') return [];
    const issues = localStorage.getItem('reportedIssues');
    return issues ? JSON.parse(issues) : [];
};
  
const addReportedIssue = (characterName: string) => {
    if (typeof window === 'undefined') return;
    const issues = getReportedIssues();
    if (!issues.includes(characterName)) {
        const newIssues = [...issues, characterName];
        localStorage.setItem('reportedIssues', JSON.stringify(newIssues));
    }
};

const WantedPosterCard = ({
    character,
    children,
    onImageError,
    hasError,
}: {
    character: DraftedCharacterState;
    children?: React.ReactNode;
    onImageError: () => void;
    hasError: boolean;
}) => {
    const isApiFallback = character.imageUrl.includes('bmc_logo.png');
    const showFallback = isApiFallback || hasError;

    return (
        <div className="w-full h-full bg-card border-4 border-yellow-800/60 p-2 flex flex-col items-center gap-1 shadow-lg relative group">
            <h3 className="font-headline font-black text-2xl tracking-wider">WANTED</h3>
            <div className="w-full h-32 relative bg-black/10 border-2 border-yellow-800/60">
                 <Image
                    src={showFallback ? '/bmc_logo.png' : character.imageUrl}
                    alt={character.info.name}
                    data-ai-hint={character.info.imageHint}
                    fill
                    className={cn(
                        "object-cover",
                        showFallback ? "object-contain p-4" : "object-top"
                    )}
                    sizes="(max-width: 768px) 120px, 120px"
                    onError={onImageError}
                  />
            </div>
            <p className="font-headline text-xs">DEAD OR ALIVE</p>
            <p className="font-headline font-bold text-lg leading-tight truncate w-full text-center">
                {character.info.name}
            </p>
            {children}
            {isApiFallback && children}
        </div>
    )
}

const EmptyWantedPoster = () => {
    return (
        <div className="w-full h-full bg-card border-4 border-yellow-800/60 p-2 flex flex-col items-center justify-center gap-1 shadow-lg text-muted-foreground">
             <Users size={48} />
             <p className="text-center text-sm mt-2">Click draft to reveal a character</p>
        </div>
    )
}


export default function RoomPage({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [phase, setPhase] = useState<GamePhase>("drafting");
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [characterPool, setCharacterPool] = useState<Character[]>([]);
  const [draftedCharacter, setDraftedCharacter] = useState<DraftedCharacterState | null>(
    null
  );
  const [myCrew, setMyCrew] = useState<Record<Role, DraftedCharacterState | null>>(
    Object.fromEntries(ROLES.map((r) => [r, null])) as Record<
      Role,
      DraftedCharacterState | null
    >
  );
  const [finalScore, setFinalScore] = useState<number>(0);
  const [swappingCharacterRole, setSwappingCharacterRole] = useState<Role | null>(null);
  const [hasSwapped, setHasSwapped] = useState(false);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [locallyReported, setLocallyReported] = useState<string[]>(getReportedIssues());
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const initializePool = async () => {
    const fetchedChars = await fetchAllCharacters();
    setAllCharacters(fetchedChars);
    setCharacterPool(generateCharacterPool(fetchedChars, 100));
  };
  
  useEffect(() => {
    initializePool();
  }, []);

  const crewIsFull = useMemo(
    () => Object.values(myCrew).every((c) => c !== null),
    [myCrew]
  );

  const drawCharacter = async () => {
    if (characterPool.length === 0) {
        toast({ title: "No more characters left in the pool!", variant: "destructive" });
        return;
    }
    const newPool = [...characterPool];
    const draftIndex = Math.floor(Math.random() * newPool.length);
    const character = newPool.splice(draftIndex, 1)[0];
    setCharacterPool(newPool);
    
    const imageUrl = await getCharImage(character.name);
    
    setDraftedCharacter({ info: character, imageUrl });
  }

  const handleDraft = () => {
    if (draftedCharacter || crewIsFull || characterPool.length === 0) return;
    drawCharacter();
  };

  const handleReroll = () => {
    if (hasRerolled || !draftedCharacter) return;
    setHasRerolled(true);
    toast({
      title: "Re-rolled!",
      description: "You got a new character.",
    });
    drawCharacter();
  }

  const handleAssignRole = (role: Role) => {
    if (!draftedCharacter) return;

    setMyCrew((prev) => ({ ...prev, [role]: draftedCharacter }));
    setDraftedCharacter(null);
    setHasRerolled(false);
  };
  
  useEffect(() => {
    if (crewIsFull && phase === "drafting") {
      setPhase("swapping");
    }
  }, [crewIsFull, phase]);

  const handleSubmitRating = (rating: number[]) => {
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
    initializePool();
    setDraftedCharacter(null);
    setMyCrew(Object.fromEntries(ROLES.map(r => [r, null])) as Record<Role, DraftedCharacterState | null>);
    setFinalScore(0);
    setSwappingCharacterRole(null);
    setHasSwapped(false);
    setHasRerolled(false);
    setLocallyReported(getReportedIssues());
    setImageErrors({});
  }

  const handleInitiateSwap = (role: Role) => {
    if (hasSwapped || phase !== 'swapping') return;
    setSwappingCharacterRole(role);
  };
  
  const handlePerformSwap = (targetRole: Role) => {
    if (!swappingCharacterRole || swappingCharacterRole === targetRole) {
      setSwappingCharacterRole(null);
      return;
    }
  
    const sourceCharacter = myCrew[swappingCharacterRole];
    const targetCharacter = myCrew[targetRole];
  
    const newCrew = { ...myCrew };
    newCrew[swappingCharacterRole] = targetCharacter;
    newCrew[targetRole] = sourceCharacter;
  
    setMyCrew(newCrew);
    setSwappingCharacterRole(null);
    setHasSwapped(true);
    toast({
        title: "Swap Successful!",
        description: `${sourceCharacter?.info.name} and ${targetCharacter?.info.name} have swapped roles.`,
    });
  };
  
  const handleCancelSwap = () => {
    setSwappingCharacterRole(null);
  };

  const handleFinish = () => {
    setPhase('voting');
  }

  const handleReportIssue = (characterName: string) => {
    if (!locallyReported.includes(characterName)) {
      addReportedIssue(characterName);
      setLocallyReported(prev => [...prev, characterName]);
      toast({
        title: "Issue Reported",
        description: `${characterName} has been flagged for alias review.`,
      });
    }
  };
  
  const handleImageError = (characterName: string) => {
    setImageErrors(prev => ({ ...prev, [characterName]: true }));
  }

  const renderCrewMember = (role: Role, isVotingPhase: boolean = false) => {
    const crewMember = myCrew[role];
    const Icon = roleIcons[role];

    const isSwapSource = swappingCharacterRole === role;
    const canBeSwapTarget = swappingCharacterRole !== null && swappingCharacterRole !== role;
    const isApiFallback = crewMember?.imageUrl.includes('bmc_logo.png');

    return (
      <div key={role} className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-5 h-5" />
          <h4 className="font-semibold text-sm">{role}</h4>
        </div>
        <div
          onClick={() => canBeSwapTarget && handlePerformSwap(role)}
          className={cn(
            "w-[140px] h-[220px] relative group",
            {
              "cursor-pointer hover:ring-2 hover:ring-primary": canBeSwapTarget,
              "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg": isSwapSource,
            }
          )}
        >
          {crewMember ? (
            <WantedPosterCard 
              character={crewMember}
              onImageError={() => handleImageError(crewMember.info.name)}
              hasError={!!imageErrors[crewMember.info.name]}
            >
                {!isVotingPhase && phase === 'swapping' && !hasSwapped && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-1 right-1 h-7 w-7 bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 z-20"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateSwap(role);
                    }}
                    title={`Swap ${crewMember.info.name}`}
                >
                    <Replace className="w-4 h-4" />
                </Button>
              )}
              {isApiFallback && !locallyReported.includes(crewMember.info.name) && (
                 <Button
                    size="sm"
                    variant="destructive"
                    className="absolute bottom-1 right-1 h-auto p-1 text-xs opacity-0 group-hover:opacity-100 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReportIssue(crewMember.info.name)
                    }}
                    title={`Report image issue for ${crewMember.info.name}`}
                 >
                    <AlertTriangle className="w-3 h-3 mr-1" /> Report
                 </Button>
              )}
            </WantedPosterCard>
          ) : (
             <div className="w-[140px] h-[220px] flex items-center justify-center relative overflow-hidden bg-card/50 group border-4 border-yellow-800/60 p-2 text-muted-foreground text-2xl">?</div>
          )}
        </div>
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
            <Button variant="outline" asChild>
                <Link href="/admin"><Settings className="mr-2 h-4 w-4" />Admin</Link>
            </Button>
          <Button variant="outline" onClick={() => router.push("/")}><Home className="mr-2 h-4 w-4"/>Home</Button>
          <Button onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/>Share</Button>
        </div>
      </header>
      
      <Separator />

      {(phase === "drafting" || phase === "swapping") && (
        <div className="grid md:grid-cols-2 gap-8">
          {phase === "drafting" && (
            <Card className="flex flex-col animate-map-open bg-[url(/map_bg.jpg)] bg-cover bg-center border-yellow-800/60">
              <CardHeader>
                <CardTitle>Draft a Character</CardTitle>
                <CardDescription>
                  Remaining in Pool: {characterPool.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-64 h-96">
                  {draftedCharacter ? (
                    <Card className="h-full overflow-hidden">
                      <CardContent className="p-0 h-full flex flex-col">
                        <div className="relative flex-grow">
                          <Image
                            src={draftedCharacter.imageUrl}
                            alt={draftedCharacter.info.name}
                            fill
                            className={cn(
                              "object-cover",
                              draftedCharacter.imageUrl.includes('bmc_logo.png') ? "object-contain p-4" : "object-top"
                            )}
                            sizes="256px"
                          />
                        </div>
                        <div className="p-4 bg-card">
                          <h3 className="font-bold text-lg">{draftedCharacter.info.name}</h3>
                          <p className="text-sm text-muted-foreground">{draftedCharacter.info.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-muted-foreground/50 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Users size={48} />
                      <p className="text-center text-sm mt-2">Click draft to reveal a character</p>
                    </div>
                  )}
                </div>
                <Button onClick={handleDraft} disabled={!!draftedCharacter || crewIsFull} size="lg">
                  Draft Character
                </Button>
                {draftedCharacter && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                      {ROLES.filter(r => myCrew[r] === null).map(role => (
                          <Button key={role} variant="secondary" onClick={() => handleAssignRole(role)}>Assign to {role}</Button>                      ))}
                      <Button variant="outline" onClick={handleReroll} disabled={hasRerolled}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Re-roll
                      </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {phase === "swapping" && (
            <Card className="animate-map-open bg-[url(/map_bg.jpg)] bg-cover bg-center border-yellow-800/60">
                <CardHeader>
                    <CardTitle>Finalize Your Crew</CardTitle>
                    <CardDescription>
                        Your crew is assembled! You can make one swap before finalizing.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground text-center">
                        {swappingCharacterRole 
                            ? `Select a crew member to swap with ${myCrew[swappingCharacterRole]?.info.name}.`
                            : hasSwapped 
                                ? "Your swap has been made." 
                                : "Click the swap icon on a character to start a swap."
                        }
                    </p>
                    {swappingCharacterRole && (
                        <Button variant="outline" size="sm" onClick={handleCancelSwap} className="w-fit">
                            <X className="mr-2 h-4 w-4" /> Cancel Swap
                        </Button>
                    )}
                    <Button onClick={handleFinish} size="lg" disabled={swappingCharacterRole !== null}>
                        Finish and Proceed to Voting
                    </Button>
                </CardContent>
            </Card>
          )}
          
          <div className="grid gap-8">
            <Card className="animate-map-open bg-[url(/map_bg.jpg)] bg-cover bg-center border-yellow-800/60">
              <CardHeader>
                <CardTitle>Your Crew</CardTitle>
                <CardDescription>
                  {
                    phase === 'drafting' ? `Fill all ${ROLES.length} positions to complete your crew.` : 
                    phase === 'swapping' ? 'Your final crew before voting.' :
                    'Your masterpiece!'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {ROLES.map(role => renderCrewMember(role, false))}
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {(phase === "voting" || phase === "result") && (
         <Card className="w-full max-w-5xl mx-auto animate-map-open bg-[url(/map_bg.jpg)] bg-cover bg-center border-yellow-800/60">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-headline">
                {phase === 'voting' ? "Rate Your Masterpiece" : "Final Verdict"}
                </CardTitle>
                <CardDescription>
                {phase === 'voting' ? "Your crew is assembled! How powerful do they seem?" : `Your crew has been rated!`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    {ROLES.map(role => renderCrewMember(role, true))}
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
