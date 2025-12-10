
"use client";

import { useState, useEffect, useMemo, type DragEvent, Fragment, ReactNode } from "react";
import React from 'react';
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toPng } from 'html-to-image';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Download, Users, RotateCw, Replace, AlertTriangle, Dices, Swords, Anchor, Award, Compass, Crosshair, ChefHat, Stethoscope, Hammer, User, Star, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import CrewCertificate from "./crew-certificate";
import { Separator } from "./ui/separator";
import { useCollection, useDocument, useUser } from "@/firebase";
import { DraftPick, Player, Room, selectCharacterForPlayer, submitVotes, Vote, swapCharacterRoles, randomizeCrew } from "@/lib/rooms";
import { Badge } from "./ui/badge";
import Balancer from "react-wrap-balancer";

type GamePhase = "drafting" | "voting" | "result";

const roleIcons: Record<Role, React.ComponentType<{ className?: string }>> = {
  Captain: Anchor,
  "Vice-Captain": Award,
  Navigator: Compass,
  Sniper: Crosshair,
  Cook: ChefHat,
  Doctor: Stethoscope,
  Shipwright: Hammer,
  Combatant: Swords,
};

export type DraftedCharacterState = {
  id: string; // This should be the draftPick document ID
  info: Character;
  imageUrl: string;
};

type CrewWithDataUri = Record<Role, (DraftedCharacterState & { dataUri: string | null }) | null>;

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
    isDraggable,
    onDragStart,
}: {
    character: DraftedCharacterState;
    onImageError: () => void;
    hasError: boolean;
    isDraggable: boolean;
    [key: string]: any;
}) => {
    const isApiFallback = character.imageUrl.includes('bmc_logo.png');
    const showFallback = isApiFallback || hasError;

    return (
        <div
            className={cn(
                "w-full h-full bg-[url(/card_bg.png)] bg-cover bg-center p-2 flex flex-col items-center gap-1 shadow-lg relative group",
                isDraggable && 'cursor-grab'
            )}
            draggable={isDraggable}
            onDragStart={onDragStart}
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

async function getBase64Image(url: string): Promise<string | null> {
    try {
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting image to Base64:", error);
        return null;
    }
}


export default function RoomPage({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [phase, setPhase] = useState<GamePhase>("drafting");
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [characterPool, setCharacterPool] = useState<Character[]>([]);
  const [draftedCharacter, setDraftedCharacter] = useState<DraftedCharacterState | null>(null);
  
  const [playerRatings, setPlayerRatings] = useState<Record<string, number>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [crewForCertificate, setCrewForCertificate] = useState<CrewWithDataUri | null>(null);
  
  const isMobile = useIsMobile();
  const [mobileCharSelected, setMobileCharSelected] = useState(false);
  
  const [draggedRole, setDraggedRole] = useState<Role | null>(null);

  const { data: room } = useDocument<Room>(`rooms/${roomId}`);
  const { data: players } = useCollection<Player>(`rooms/${roomId}/players`);
  const { data: draftPicks } = useCollection<DraftPick>(`rooms/${roomId}/draftPicks`);
  const { data: votes } = useCollection<Vote>('votes', { isCollectionGroup: true });

  const isMyTurn = room?.currentPlayerId === user?.uid;
  const isSinglePlayer = room?.playerCount === 1;

  const playerCrews = useMemo(() => {
    const crews: Record<string, Record<Role, DraftedCharacterState | null>> = {};

    players.forEach(p => {
        crews[p.id] = Object.fromEntries(ROLES.map(r => [r, null])) as Record<Role, null>;
    });

    draftPicks.forEach(pick => {
        if(crews[pick.playerId] && pick.role) {
            crews[pick.playerId][pick.role as Role] = {
                id: pick.id,
                info: { 
                    id: 0, 
                    name: pick.characterName, 
                    description: pick.characterDescription, 
                    imageHint: pick.characterName 
                },
                imageUrl: pick.characterImageUrl,
            };
        }
    });

    return crews;
  }, [players, draftPicks]);

  const myCrew = useMemo(() => user ? playerCrews[user.uid] : null, [playerCrews, user]);
  const otherPlayers = useMemo(() => players.filter(p => p.id !== user?.uid), [players, user]);

  const allCrewsFull = useMemo(() => {
    if (Object.keys(playerCrews).length === 0 || players.length === 0) return false;
    if (players.length !== room?.playerCount) return false;

    return Object.values(playerCrews).every(crew => 
        crew && Object.values(crew).every(member => member !== null)
    );
  }, [playerCrews, players, room?.playerCount]);
  
  useEffect(() => {
    if (room?.status === 'voting') {
      setPhase('voting');
    } else if (room?.status === 'finished') {
      setPhase('result');
    } else if (allCrewsFull && room?.status === 'drafting') {
        if (!isSinglePlayer) {
            setPhase('voting');
        }
    }
  }, [allCrewsFull, room, isSinglePlayer]);


  const initializePool = async () => {
    const fetchedChars = await fetchAllCharacters();
    setAllCharacters(fetchedChars);
    setCharacterPool(generateCharacterPool(fetchedChars, 100));
  };
  
  useEffect(() => {
    initializePool();
  }, []);

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
    
    setDraftedCharacter({ id: "new-draft", info: character, imageUrl });
  }

  const handleDraft = () => {
    if (draftedCharacter || !isMyTurn) return;
    drawCharacter();
  };

  const handleReroll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!draftedCharacter || !isMyTurn) return;
    drawCharacter();
  }

  const handleImageError = (characterName: string) => {
    setImageErrors(prev => ({ ...prev, [characterName]: true }));
  };

  const assignCharacterToRole = async (role: Role) => {
    if (!draftedCharacter || !room || !user || !room.turnOrder) return;
    
    await selectCharacterForPlayer(
        roomId, 
        user.uid, 
        role, 
        draftedCharacter.info.name,
        draftedCharacter.info.description,
        draftedCharacter.imageUrl,
        room.turnOrder,
        room.playerCount
    );

    setDraftedCharacter(null);
    setMobileCharSelected(false);
  }
  
  const handleRandomizeCrew = async () => {
    if (!user || !isSinglePlayer || !room) return;

    const emptyRoles = ROLES.filter(role => !myCrew?.[role]);
    if (emptyRoles.length === 0) {
      toast({ title: "Your crew is already full!" });
      return;
    }

    await randomizeCrew(roomId, user.uid, emptyRoles, allCharacters, setCharacterPool);
  };

  const handlePlayAgain = () => {
    router.push('/build');
  }

  const handleSubmitVotes = async () => {
    if (!user || !room) return;

    const votesToSubmit: Omit<Vote, 'id'>[] = otherPlayers.map(p => ({
        voterId: user.uid,
        targetPlayerId: p.id,
        score: playerRatings[p.id] ?? 5,
    }));

    if (votesToSubmit.length === 0) {
        toast({ title: "No ratings submitted.", description: "Please rate at least one crew." });
        return;
    }
    
    await submitVotes(roomId, votesToSubmit, room.playerCount, votes);
  };
  
  const finalScores = useMemo(() => {
    if (phase !== 'result') return {};
    const scores: Record<string, { total: number; count: number; avg: number }> = {};
    
    players.forEach(p => {
      scores[p.id] = { total: 0, count: 0, avg: 0 };
    });

    const roomVotes = votes.filter(v => v.id.startsWith(roomId));

    roomVotes.forEach(vote => {
      if (scores[vote.targetPlayerId]) {
        scores[vote.targetPlayerId].total += vote.score;
        scores[vote.targetPlayerId].count += 1;
      }
    });

    for (const playerId in scores) {
      if (scores[playerId].count > 0) {
        scores[playerId].avg = scores[playerId].total / scores[playerId].count;
      }
    }
    
    return scores;
  }, [phase, votes, players, roomId]);


  const sortedPlayers = useMemo(() => {
    if (phase !== 'result' || isSinglePlayer) return players;
    
    const playersToSort = [...players];
    
    playersToSort.sort((a, b) => {
        const scoreA = finalScores[a.id]?.avg ?? 0;
        const scoreB = finalScores[b.id]?.avg ?? 0;
        return scoreB - scoreA;
    });

    return playersToSort;

  }, [phase, players, finalScores, isSinglePlayer]);

   const handleSaveCrew = async () => {
    if (!myCrew) return;
    setIsSaving(true);
    toast({
        title: "Generating your certificate...",
        description: "Please wait a moment."
    });

    const crewWithImages: CrewWithDataUri = { ...myCrew } as CrewWithDataUri;
    
    for (const role of ROLES) {
        const member = myCrew[role];
        if (member) {
            const dataUri = await getBase64Image(member.imageUrl);
            crewWithImages[role] = { ...member, dataUri: dataUri };
        }
    }
    setCrewForCertificate(crewWithImages);

    setTimeout(async () => {
        const element = document.getElementById('crew-certificate-capture');
        if (element) {
            try {
                const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 1.5 });
                const link = document.createElement('a');
                link.download = 'my-one-piece-crew.png';
                link.href = dataUrl;
                link.click();
                toast({
                    title: "Certificate saved!",
                    description: "Your crew certificate has been downloaded.",
                });
            } catch (err) {
                console.error('oops, something went wrong!', err);
                 toast({
                    title: "Error saving certificate",
                    description: "Could not generate the image.",
                    variant: "destructive"
                });
            } finally {
                setCrewForCertificate(null);
                setIsSaving(false);
            }
        }
    }, 500); // Small delay to ensure images render
  };


  const handleMobileDraftedCharClick = () => {
    if (!isMobile || !draftedCharacter || !isMyTurn) return;
    setMobileCharSelected(!mobileCharSelected);
    if (!mobileCharSelected) {
      toast({
        title: `${draftedCharacter.info.name} selected!`,
        description: 'Tap an empty role slot to assign them.',
      });
    }
  }

  const handleMobileSlotClick = (role: Role) => {
    if (!isMobile || !draftedCharacter || !isMyTurn || (myCrew && myCrew[role])) return;
    assignCharacterToRole(role);
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, role: Role | "new-draft") => {
    if (isMobile || !isMyTurn) return;
    
    if(role === 'new-draft' && draftedCharacter) {
      e.dataTransfer.setData("application/json", JSON.stringify(draftedCharacter));
      setDraggedRole(null);
    } else {
      setDraggedRole(role as Role);
    }
  };
  
  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetRole: Role) => {
    e.preventDefault();
    if (isMobile || !isMyTurn) return; 

    if(draggedRole) { // Swapping existing characters
        if(draggedRole !== targetRole && myCrew && user) {
            swapCharacterRoles(roomId, user.uid, draggedRole, targetRole);
        }
        setDraggedRole(null);
    } else { // Assigning new character
        if (myCrew && !myCrew[targetRole]) {
            const characterData = e.dataTransfer.getData("application/json");
            if (characterData) {
                assignCharacterToRole(targetRole);
            }
        }
    }
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const renderCrewMemberSlot = (crewMember: DraftedCharacterState | null, role: Role, isMySlot: boolean, isDraggable: boolean) => {
    const isMobileAssignable = isMobile && draftedCharacter && !crewMember && isMySlot && isMyTurn;
    
    return (
        <div 
            key={role} 
            className="flex flex-col items-center gap-1 w-full relative"
            onClick={() => isMySlot && handleMobileSlotClick(role)}
        >
            <div className={cn(
                "w-full h-48 md:h-56 relative transition-all duration-200",
                {
                    "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg": isMobileAssignable && mobileCharSelected
                }
            )}>
                {crewMember ? (
                     <WantedPosterCard
                        character={crewMember}
                        onImageError={() => handleImageError(crewMember.info.name)}
                        hasError={imageErrors[crewMember.info.name]}
                        isDraggable={isDraggable && isMySlot}
                        onDragStart={(e: DragEvent<HTMLDivElement>) => handleDragStart(e, role)}
                     />
                ) : (
                    <div className={cn("w-full h-full flex items-center justify-center relative overflow-hidden bg-black/20 border-2 border-dashed border-white/20 rounded-lg p-2 text-white/40 text-3xl font-bold", isMobileAssignable && "cursor-pointer")}>
                        ?
                        <div 
                          className="absolute inset-0"
                          onDrop={(e) => isMySlot && handleDrop(e, role)} 
                          onDragOver={handleDragOver} />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1.5 text-white/70 -mt-1">
                {React.createElement(roleIcons[role], { className: "w-3 h-3" })}
                <span className="font-semibold text-xs">{role}</span>
            </div>
        </div>
    );
  };
  
  if (!room || !user || !myCrew) {
    return <div className="flex items-center justify-center h-screen text-white text-xl">Loading your crew...</div>
  }

  return (
    <div className="w-full h-screen">
      {phase === "drafting" && (
        <div className="flex flex-col md:flex-row h-full">
            <div className="flex-shrink-0 w-full md:w-80 bg-black/30 backdrop-blur-sm border-r border-white/20 p-4 flex flex-col items-center justify-center gap-4">
               <div className="text-center">
                    <h2 className='font-headline text-3xl text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]'>
                      {isMyTurn ? "Your Turn!" : "Waiting..."}
                    </h2>
                    <p className="text-white/70">{isMyTurn ? "Draft a character for your crew." : "Waiting for other players to draft."}</p>
                </div>
               
               <div
                className={cn(
                    "w-56 h-80 transition-all", 
                    draftedCharacter && isMyTurn && (isMobile ? 'cursor-pointer' : 'cursor-grab')
                )}
                onClick={handleMobileDraftedCharClick}
                >
                {draftedCharacter ? (
                    <div 
                        className={cn(
                            "w-full h-full",
                            mobileCharSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg"
                        )}
                        draggable={!isMobile && !!draftedCharacter && isMyTurn}
                        onDragStart={(e) => handleDragStart(e, "new-draft")}
                    >
                    <WantedPosterCard
                        character={draftedCharacter}
                        onImageError={() => handleImageError(draftedCharacter.info.name)}
                        hasError={imageErrors[draftedCharacter.info.name]}
                        isDraggable={false}
                    />
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full h-full bg-black/20 border-white/20 border-dashed text-white/60 hover:bg-black/30 hover:text-white"
                        onClick={handleDraft}
                        disabled={!isMyTurn}
                    >
                        <Dices className="mr-2 h-5 w-5" />
                        Draft Character
                    </Button>
                )}
               </div>

                <div className="text-center space-y-2">
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button variant="outline" size="sm" onClick={handleReroll} disabled={!draftedCharacter || !isMyTurn}>
                      <Dices className="mr-2 h-4 w-4" />
                      Re-roll
                  </Button>
                  {isSinglePlayer && (
                     <Button variant="secondary" size="sm" onClick={handleRandomizeCrew} disabled={!isMyTurn}>
                      <Shuffle className="mr-2 h-4 w-4" />
                      Randomize Crew
                  </Button>
                  )}
                  </div>
                </div>
            </div>

             <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="w-full max-w-7xl mx-auto">
                    <div className="space-y-8">
                        {players.map(player => (
                            <div key={player.id}>
                                <h3 className="text-2xl font-headline mb-4 text-white/90">
                                    {player.displayName} {player.id === user.uid && "(You)"}
                                </h3>
                                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                    {ROLES.map(role => renderCrewMemberSlot(playerCrews[player.id]?.[role] || null, role, player.id === user.uid, isMyTurn))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div> 
      )}

      {phase === 'voting' && !isSinglePlayer && (
         <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="w-full h-full animate-map-open bg-black/30 backdrop-blur-sm border-white/20 rounded-lg p-4 md:p-8 overflow-y-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-5xl font-headline text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">Rate Their Crews!</h1>
                    <p className="text-white/70 mt-2">
                        Vote on which crew you think is the strongest.
                    </p>
                </div>
                
                <div className="space-y-8">
                    {otherPlayers.map(player => (
                        <div key={player.id} className="p-4 rounded-lg bg-black/20 border border-white/10">
                            <h3 className="font-headline text-2xl mb-4 text-white/90">
                                {`${player.displayName}'s Crew`}
                            </h3>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-6">
                                {ROLES.map(role => {
                                    const crewMember = playerCrews[player.id]?.[role];
                                    return (
                                        <div key={role} className="flex flex-col items-center gap-1 text-center">
                                            <div className="w-[80px] h-[140px] relative">
                                                {crewMember ? (
                                                    <div className="w-full h-full bg-[url(/card_bg.png)] bg-cover bg-center p-1 flex flex-col items-center gap-0.5 shadow-lg relative text-center">
                                                        <h3 className="font-headline font-black text-xs tracking-wider text-card-foreground/80">WANTED</h3>
                                                        <div className="w-full h-32 relative mt-0.5 rounded-sm overflow-hidden border-2 border-yellow-800/20">
                                                            <Image src={imageErrors[crewMember.info.name] ? '/bmc_logo.png' : crewMember.imageUrl} alt={crewMember.info.name} fill className="object-cover object-top" sizes="80px" onError={() => handleImageError(crewMember.info.name)} />
                                                        </div>
                                                        <p className="font-headline text-xs text-card-foreground/70">DEAD OR ALIVE</p>
                                                        <p className="font-headline font-bold text-sm leading-tight truncate w-full">{crewMember.info.name}</p>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-black/20 border-2 border-dashed border-white/20 p-2 text-white/40 text-xl font-bold">?</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-white/70 -mt-1">
                                                {React.createElement(roleIcons[role], { className: "w-2 h-2" })}
                                                <span className="font-semibold text-[10px]">{role}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-4 max-w-md mx-auto">
                                <span className="text-white font-bold">1</span>
                                <Slider 
                                    defaultValue={[5]} 
                                    min={1} 
                                    max={10} 
                                    step={1} 
                                    onValueChange={([value]) => setPlayerRatings(prev => ({...prev, [player.id]: value}))}
                                />
                                <span className="text-white font-bold">10</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-8">
                    <Button onClick={handleSubmitVotes} size="lg">Submit Votes</Button>
                </div>
            </div>
        </div>
      )}

      {phase === 'result' && (
         <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="w-full h-full animate-map-open bg-black/30 backdrop-blur-sm border-white/20 rounded-lg p-4 md:p-8 overflow-y-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-5xl font-headline text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
                        {isSinglePlayer ? "Your Assembled Crew" : "Final Standings"}
                    </h1>
                      <p className="text-white/70 mt-2">
                         {isSinglePlayer ? "You've assembled your crew! Save it or try again." : "The results are in! Here's how the crews stacked up."}
                    </p>
                </div>
                <div className="space-y-6">
                     {sortedPlayers.map((player, index) => {
                     return (
                         <div key={player.id} className="p-4 rounded-lg bg-black/20 border border-white/10 flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex items-center gap-4">
                             
                                {!isSinglePlayer && (
                                 <>
                                     <span className="text-4xl font-bold font-headline text-yellow-500 w-12 text-center">#{index + 1}</span>
                                     <div className="text-center border-r pr-4 border-yellow-800/30">
                                        <p className="text-5xl font-bold font-headline text-white">{(finalScores[player.id]?.avg ?? 0).toFixed(1)}</p>
                                         <p className="text-sm text-white/60">Avg. Score</p>
                                     </div>
                                 </>
                                )}
                              
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-headline mb-4 text-white/90">{player.displayName}'s Crew</h3>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                {ROLES.map(role => {
                                const crewMember = playerCrews[player.id]?.[role] || null;
                                return (
                                <div key={role} className="flex flex-col items-center gap-1 text-center">
                                    <div className="w-[80px] h-[140px] relative">
                                     {crewMember ? (
                                         <div className="w-full h-full bg-[url(/card_bg.png)] bg-cover bg-center p-1 flex flex-col items-center gap-0.5 shadow-lg relative text-center">
                                             <h3 className="font-headline font-black text-xs tracking-wider text-card-foreground/80">WANTED</h3>
                                             <div className="w-full h-32 relative mt-0.5 rounded-sm overflow-hidden border-2 border-yellow-800/20">
                                                 <Image src={imageErrors[crewMember.info.name] ? '/bmc_logo.png' : crewMember.imageUrl} alt={crewMember.info.name} fill className="object-cover object-top" sizes="80px" onError={() => handleImageError(crewMember.info.name)} />
                                             </div>
                                             <p className="font-headline text-xs text-card-foreground/70">DEAD OR ALIVE</p>
                                             <p className="font-headline font-bold text-sm leading-tight truncate w-full">{crewMember.info.name}</p>
                                         </div>
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center bg-black/20 border-2 border-dashed border-white/20 p-2 text-white/40 text-xl font-bold">?</div>
                                     )}
                                    </div>
                                     <div className="flex items-center gap-1.5 text-white/70 -mt-1">
                                     {React.createElement(roleIcons[role], { className: "w-2 h-2" })}
                                     <span className="font-semibold text-[10px]">{role}</span>
                                     </div>
                                 </div>
                                )
                            })}
                            </div>
                        </div>
                        </div>
                     )})}
                </div>
                 <div className="mt-8 flex justify-center gap-4">
                    <Button onClick={handleSaveCrew} disabled={isSaving}>
                        <Download className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save My Crew"}
                    </Button>
                    <Button variant="secondary" onClick={handlePlayAgain}>
                        <RotateCw className="mr-2 h-4 w-4" />
                        Play Again
                    </Button>
                </div>
            </div>
        </div>
      )}

      {crewForCertificate && <CrewCertificate 
        id="crew-certificate-capture"
        roomId={roomId}
        crew={crewForCertificate}
        isForCapture={!!crewForCertificate}
      />}
    </div>
  );
}

    