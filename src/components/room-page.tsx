
"use client";

import { useState, useEffect, useMemo, type DragEvent } from "react";
import React from 'react';
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import html2canvas from "html2canvas";
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
import { Slider } from "@/components/ui/slider";
import { Download, Home, Share2, Users, Star, RotateCw, Replace, X, AlertTriangle, Settings, RefreshCcw, Dices, Swords, ArrowLeft } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";

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
    onImageError,
    hasError,
    isSwapSource,
    canBeSwapTarget,
    onClick,
    ...props
}: {
    character: DraftedCharacterState;
    onImageError: () => void;
    hasError: boolean;
    isSwapSource?: boolean;
    canBeSwapTarget?: boolean;
    onClick?: () => void;
    [key: string]: any;
}) => {
    const isApiFallback = character.imageUrl.includes('bmc_logo.png');
    const showFallback = isApiFallback || hasError;

    return (
        <div
            onClick={onClick}
            className={cn(
                "w-full h-full bg-[url(/card_bg.png)] bg-cover bg-center p-2 flex flex-col items-center gap-1 shadow-lg relative group",
                {
                    "cursor-pointer hover:ring-2 hover:ring-primary": canBeSwapTarget,
                    "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg": isSwapSource,
                }
            )}
            {...props}
        >
            <h3 className="font-headline font-black text-lg tracking-wider text-card-foreground/80">WANTED</h3>
            <div className="w-full h-40 relative bg-black/10 border-2 border-yellow-800/20">
                 <Image
                    src={showFallback ? '/bmc_logo.png' : character.imageUrl}
                    alt={character.info.name}
                    data-ai-hint={character.info.imageHint}
                    fill
                    className={cn(
                        "object-cover",
                        showFallback ? "object-contain p-2" : "object-top"
                    )}
                    sizes="(max-width: 768px) 150px, 150px"
                    onError={onImageError}
                  />
            </div>
            <p className="font-headline text-xs text-card-foreground/70">DEAD OR ALIVE</p>
            <p className="font-headline font-bold text-base leading-tight truncate w-full text-center text-card-foreground">
                {character.info.name}
            </p>
             {isApiFallback && !getReportedIssues().includes(character.info.name) && (
                 <Button
                    size="sm"
                    variant="destructive"
                    className="absolute bottom-1 right-1 h-auto p-1 text-xs opacity-0 group-hover:opacity-100 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      addReportedIssue(character.info.name)
                    }}
                    title={`Report image issue for ${character.info.name}`}
                 >
                    <AlertTriangle className="w-3 h-3 mr-1" /> Report
                 </Button>
              )}
        </div>
    )
}

const CrewCertificate = ({ crew, score, roomId }: { crew: Record<Role, DraftedCharacterState | null>, score: number, roomId: string }) => {
    return (
      <div id="crew-certificate" className="fixed top-0 left-0 -z-50 opacity-0 w-[1200px] h-[630px] bg-[url(/rating_bg.png)] bg-cover p-8 font-sans">
        <div className="flex justify-between items-start text-white">
          <div>
            <h1 className="text-5xl font-bold font-headline">My One Piece Crew</h1>
            <p className="text-xl text-yellow-300">Room Code: {roomId}</p>
          </div>
          <div className="text-right">
              <p className="text-2xl font-headline">Final Score</p>
              <p className="text-6xl font-bold font-headline text-yellow-300">{score.toFixed(1)}</p>
          </div>
        </div>
  
        <div className="grid grid-cols-4 gap-4 mt-8">
          {ROLES.map(role => {
            const member = crew[role];
            const Icon = roleIcons[role];
            return (
              <div key={role} className="bg-card/80 backdrop-blur-sm rounded-lg p-2 flex flex-col items-center border border-yellow-700/50">
                <div className="flex items-center gap-1 text-sm text-amber-100">
                    <Icon className="w-4 h-4" />
                    <span className="font-bold">{role}</span>
                </div>
                {member ? (
                  <>
                    <div className="w-full h-32 relative mt-1">
                      <Image src={member.imageUrl} alt={member.info.name} fill className="object-cover object-top rounded" sizes="150px" />
                    </div>
                    <p className="mt-1 font-bold text-center text-white truncate w-full">{member.info.name}</p>
                  </>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center mt-1">
                    <span className="text-muted-foreground">Empty</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
         <p className="absolute bottom-4 right-8 text-white/50 text-sm font-headline">Generated by BeatMyCrew</p>
      </div>
    );
  };

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
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [hasSwapped, setHasSwapped] = useState(false);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isDraggingOver, setIsDraggingOver] = useState<Role | null>(null);
  
  const isMobile = useIsMobile();
  const [mobileCharSelected, setMobileCharSelected] = useState(false);

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
  
  useEffect(() => {
    if (crewIsFull && phase === "drafting") {
      setPhase("swapping");
    }
  }, [crewIsFull, phase]);

  const handleSubmitRating = (rating: number[]) => {
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
    setIsSwapMode(false);
    setHasSwapped(false);
    setHasRerolled(false);
    setImageErrors({});
    setMobileCharSelected(false);
  }

  const handleSwapClick = (role: Role) => {
    if (!isSwapMode || hasSwapped || !myCrew[role]) return;

    if (!swappingCharacterRole) {
      // Start the swap
      setSwappingCharacterRole(role);
      toast({
        title: 'Select a crew member to swap with',
        description: `You selected ${myCrew[role]?.info.name}.`,
      });
    } else if (swappingCharacterRole === role) {
      // Cancel the swap
      setSwappingCharacterRole(null);
      toast({
        title: 'Swap canceled',
      });
    } else {
      // Perform the swap
      const sourceCharacter = myCrew[swappingCharacterRole];
      const targetCharacter = myCrew[role];
  
      const newCrew = { ...myCrew };
      newCrew[swappingCharacterRole] = targetCharacter;
      newCrew[role] = sourceCharacter;
  
      setMyCrew(newCrew);
      setSwappingCharacterRole(null);
      setHasSwapped(true);
      setIsSwapMode(false); // Exit swap mode after a successful swap
      toast({
          title: "Swap Successful!",
          description: `${sourceCharacter?.info.name} and ${targetCharacter?.info.name} have swapped roles.`,
      });
    }
  };

  const toggleSwapMode = () => {
    if (hasSwapped) {
        toast({ title: "You've already made a swap this round.", variant: "destructive" });
        return;
    }
    if (phase !== 'swapping') return;

    const newSwapMode = !isSwapMode;
    setIsSwapMode(newSwapMode);
    setSwappingCharacterRole(null); // Reset selection when toggling mode
    if (newSwapMode) {
        toast({ title: "Swap Mode Activated", description: "Select two crew members to swap their roles." });
    } else {
        toast({ title: "Swap Mode Deactivated" });
    }
  }

  const handleFinish = () => {
    setPhase('voting');
  }
  
  const handleImageError = (characterName: string) => {
    setImageErrors(prev => ({ ...prev, [characterName]: true }));
  }

  const handleSaveCrew = async () => {
    const certificate = document.getElementById('crew-certificate');
    if (!certificate) {
        toast({ title: 'Error generating image', variant: 'destructive' });
        return;
    }

    toast({ title: 'Generating your crew certificate...' });

    try {
        const canvas = await html2canvas(certificate, {
            allowTaint: true,
            useCORS: true,
            scale: 2, // Higher scale for better resolution
        });
        const image = canvas.toDataURL('image/png', 1.0);
        
        const link = document.createElement('a');
        link.href = image;
        link.download = `beat-my-crew-${roomId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Crew saved!', description: 'Your crew certificate has been downloaded.' });
    } catch (error) {
        console.error('Error generating canvas:', error);
        toast({ title: 'Could not save image', description: 'There was an error while creating your certificate.', variant: 'destructive' });
    }
  };

  // --- Drag and Drop / Mobile Tap Handlers ---
  const handleMobileDraftedCharClick = () => {
    if (!isMobile || !draftedCharacter) return;
    setMobileCharSelected(true);
    toast({
      title: `${draftedCharacter.info.name} selected!`,
      description: 'Tap an empty role slot to assign them.',
    });
  }

  const handleMobileSlotClick = (role: Role) => {
    if (!isMobile || !mobileCharSelected || myCrew[role] || !draftedCharacter) return;
    setMyCrew(prev => ({ ...prev, [role]: draftedCharacter }));
    setDraftedCharacter(null);
    setHasRerolled(false);
    setMobileCharSelected(false);
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (isMobile || !draftedCharacter) return;
    e.dataTransfer.setData("application/json", JSON.stringify(draftedCharacter));
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>, role: Role) => {
    e.preventDefault();
    if (isMobile || myCrew[role]) return; 
    
    const characterData = e.dataTransfer.getData("application/json");
    if (characterData) {
      const character = JSON.parse(characterData) as DraftedCharacterState;
      setMyCrew(prev => ({ ...prev, [role]: character }));
      setDraftedCharacter(null);
      setHasRerolled(false);
    }
    setIsDraggingOver(null);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>, role: Role) => {
    e.preventDefault();
    if (!isMobile && !myCrew[role]) {
      setIsDraggingOver(role);
    }
  };
  
  const handleDragLeave = () => {
    if (!isMobile) {
      setIsDraggingOver(null);
    }
  };
  // --- End Handlers ---


  const renderCrewMemberSlot = (role: Role, isVotingPhase: boolean = false) => {
    const crewMember = myCrew[role];
    const Icon = roleIcons[role];

    const isSwapSource = swappingCharacterRole === role;
    const canBeSwapTarget = isSwapMode && !hasSwapped && crewMember !== null;
    const isMobileAssignable = isMobile && mobileCharSelected && !crewMember;

    return (
      <div 
        key={role} 
        className="flex flex-col items-center gap-2"
        onDrop={(e) => handleDrop(e, role)}
        onDragOver={(e) => handleDragOver(e, role)}
        onDragLeave={handleDragLeave}
        onClick={() => handleMobileSlotClick(role)}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-5 h-5" />
          <h4 className="font-semibold text-sm">{role}</h4>
        </div>
        <div
          className={cn(
            "w-[160px] h-[250px] relative transition-all duration-200",
            {
              'bg-primary/20 ring-2 ring-primary rounded-lg': isDraggingOver === role || isMobileAssignable
            }
          )}
        >
          {crewMember ? (
            <WantedPosterCard 
              character={crewMember}
              onImageError={() => handleImageError(crewMember.info.name)}
              hasError={!!imageErrors[crewMember.info.name]}
              isSwapSource={isSwapSource}
              canBeSwapTarget={canBeSwapTarget}
              onClick={() => handleSwapClick(role)}
            />
          ) : (
             <div className={cn(
                "w-full h-full flex items-center justify-center relative overflow-hidden bg-card/50 group border-2 border-dashed border-yellow-800/40 p-2 text-muted-foreground text-4xl font-bold",
                isMobileAssignable && "cursor-pointer"
             )}>
              ?
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="w-full flex justify-start">
        <Button variant="outline" asChild>
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
        </Button>
      </div>

      {(phase === "drafting" || phase === "swapping") && (
        <div className="flex-grow flex flex-col gap-4 items-center">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* Left Column: Drafting */}
            <div className="md:col-span-1 flex flex-col gap-4">
              <Card className="flex-grow flex flex-col animate-map-open bg-[url(/map_bg.jpg)] bg-cover bg-center border-yellow-800/60">
                <CardHeader>
                  <CardTitle>DRAFTING ARENA</CardTitle>
                  <CardDescription>
                    Remaining in Pool: {characterPool.length}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center gap-4 text-center">
                  <div 
                    className={cn(
                        "w-64 h-96 transition-all", 
                        draftedCharacter && (isMobile ? 'cursor-pointer' : 'cursor-grab'),
                        mobileCharSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg"
                    )}
                    draggable={!isMobile && !!draftedCharacter}
                    onDragStart={handleDragStart}
                    onClick={handleMobileDraftedCharClick}
                  >
                    {draftedCharacter ? (
                       <div className="w-full h-full relative group">
                          <Image
                              src={draftedCharacter.imageUrl}
                              alt={draftedCharacter.info.name}
                              fill
                              className={cn(
                              "object-cover rounded-lg border-2 border-yellow-700/50",
                              draftedCharacter.imageUrl.includes('bmc_logo.png') ? "object-contain p-4" : "object-top"
                              )}
                              sizes="256px"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-center rounded-b-lg">
                              <h3 className="font-bold text-lg">{draftedCharacter.info.name}</h3>
                          </div>
                       </div>
                    ) : (
                      <div className="w-full h-full border-2 border-dashed border-muted-foreground/50 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        {crewIsFull ? (
                           <>
                              <Users size={48} />
                              <p className="text-center text-sm mt-2">Your crew is full!</p>
                           </>
                        ) : (
                          <>
                             <Users size={48} />
                             <p className="text-center text-sm mt-2">Click draft to reveal a character</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <Button onClick={handleDraft} disabled={!!draftedCharacter || crewIsFull} size="lg">
                    Draft Character
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Crew Roster */}
            <div className="md:col-span-2">
              <Card className="h-full animate-map-open bg-[url(/map_bg.jpg)] bg-cover bg-center border-yellow-800/60">
                <CardHeader>
                  <CardTitle>Your Crew Roster</CardTitle>
                   <CardDescription>
                    {
                      phase === 'drafting' ? (isMobile ? 'Tap your drafted character, then tap an empty slot.' : 'Drag your drafted character into an empty slot.') : 
                      phase === 'swapping' ? (
                          isSwapMode
                              ? swappingCharacterRole
                                  ? `Select a crew member to swap with ${myCrew[swappingCharacterRole]?.info.name}.`
                                  : 'Select the first crew member to swap.'
                              : hasSwapped 
                                  ? "Your swap has been made for this round." 
                                  : "Your crew is assembled. You can make one swap."
                      ) : 'Your masterpiece!'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6">
                    {ROLES.map(role => renderCrewMemberSlot(role, false))}
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Actions Toolbar */}
          <Card className="w-full max-w-4xl animate-map-open bg-[url(/map_bg.jpg)] bg-cover bg-center border-yellow-800/60">
              <CardHeader>
                  <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <Button variant="outline" onClick={handleReroll} disabled={hasRerolled || !draftedCharacter}>
                      <Dices className="mr-2 h-4 w-4" />
                      Re-roll
                  </Button>
                  <Button variant="outline" onClick={toggleSwapMode} disabled={!crewIsFull || phase !== 'swapping' || hasSwapped}>
                      <Replace className="mr-2 h-4 w-4" />
                      {isSwapMode ? 'Cancel Swap' : 'Swap Roles'}
                  </Button>

                  {phase === "swapping" && (
                      <Button onClick={handleFinish} size="lg" disabled={isSwapMode} className="flex-grow">
                          Finish and Proceed to Voting
                      </Button>
                  )}
              </CardContent>
          </Card>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {ROLES.map(role => renderCrewMemberSlot(role, true))}
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
                        <div className="flex items-center gap-4 mt-4">
                            <Button onClick={handlePlayAgain} size="lg">
                                <RotateCw className="mr-2 h-4 w-4" />
                                Assemble a New Crew
                            </Button>
                            <Button onClick={handleSaveCrew} size="lg" variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Save Crew
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
         </Card>
      )}

    {phase === 'result' && <CrewCertificate crew={myCrew} score={finalScore} roomId={roomId} />}

    </div>
  );
}

    

    

