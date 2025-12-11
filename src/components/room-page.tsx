'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toPng } from 'html-to-image';
import {
  Character,
  Role,
  ROLES,
  generateCharacterPool,
  fetchAllCharacters,
} from '@/lib/characters';
import { getCharImage } from '@/lib/character-images';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Download,
  RotateCw,
  AlertTriangle,
  Dices,
  Swords,
  Anchor,
  Award,
  Compass,
  Crosshair,
  ChefHat,
  Stethoscope,
  Hammer,
  Shuffle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import CrewCertificate from './crew-certificate';
import { useCollection, useDocument, useUser } from '@/firebase';
import {
  DraftPick,
  Player,
  Room,
  randomizeCrew,
  selectCharacterForPlayer,
  submitVotes,
  swapCharacterRoles,
  Vote,
} from '@/lib/rooms';

type GamePhase = 'drafting' | 'voting' | 'result';

const roleIcons: Record<Role, React.ComponentType<{ className?: string }>> = {
  Captain: Anchor,
  'Vice-Captain': Award,
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
  role: Role;
  playerId: string;
};

type CrewWithDataUri = Record<
  Role,
  (DraftedCharacterState & { dataUri: string | null }) | null
>;

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
  ...props
}: {
  character: DraftedCharacterState;
  onImageError: () => void;
  hasError: boolean;
  [key: string]: any;
}) => {
  const isApiFallback = character.imageUrl.includes('bmc_logo.png');
  const showFallback = isApiFallback || hasError;

  return (
    <div
      className="w-full h-full bg-[url(/card_bg.png)] bg-cover bg-center p-2 flex flex-col items-center gap-1 shadow-lg relative group"
      {...props}
    >
      <h3 className="font-headline font-black text-lg tracking-wider text-card-foreground/80">
        WANTED
      </h3>
      <div className="w-full h-32 relative bg-black/10 border-2 border-yellow-800/20">
        <Image
          src={showFallback ? '/bmc_logo.png' : character.imageUrl}
          alt={character.info.name}
          data-ai-hint={character.info.imageHint}
          fill
          className={cn(
            'object-cover',
            showFallback ? 'object-contain p-2' : 'object-top'
          )}
          sizes="(max-width: 768px) 150px, 150px"
          onError={onImageError}
        />
      </div>
      <p className="font-headline text-xs text-card-foreground/70">
        DEAD OR ALIVE
      </p>
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
            addReportedIssue(character.info.name);
          }}
          title={`Report image issue for ${character.info.name}`}
        >
          <AlertTriangle className="w-3 h-3 mr-1" /> Report
        </Button>
      )}
    </div>
  );
};

async function getBase64Image(url: string): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/image-proxy?url=${encodeURIComponent(url)}`
    );
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to Base64:', error);
    return null;
  }
}

export default function RoomPage({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [phase, setPhase] = useState<GamePhase>('drafting');
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [characterPool, setCharacterPool] = useState<Character[]>([]);
  const [draftedCharacter, setDraftedCharacter] =
    useState<DraftedCharacterState | null>(null);

  const [playerRatings, setPlayerRatings] = useState<Record<string, number>>(
    {}
  );
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [crewForCertificate, setCrewForCertificate] =
    useState<CrewWithDataUri | null>(null);

  const isMobile = useIsMobile();
  const [mobileCharSelected, setMobileCharSelected] = useState(false);

  const { data: room, isLoading: isRoomLoading } = useDocument<Room>(`rooms/${roomId}`);
  const { data: players, isLoading: arePlayersLoading } = useCollection<Player>(
    `rooms/${roomId}/players`
  );
  const { data: draftPicks, isLoading: areDraftPicksLoading } = useCollection<DraftPick>(
    `rooms/${roomId}/draftPicks`
  );
  const { data: votes } = useCollection<Vote>(`rooms/${roomId}/votes`);

  const isLoading = isRoomLoading || arePlayersLoading || areDraftPicksLoading;

  const isMyTurn = room?.currentPlayerId === user?.uid;
  const isSinglePlayer = room?.playerCount === 1;

  const playerCrews = useMemo(() => {
    const crews: Record<
      string,
      Record<Role, DraftedCharacterState | null>
    > = {};

    players.forEach((p) => {
      crews[p.id] = Object.fromEntries(ROLES.map((r) => [r, null])) as Record<
        Role,
        null
      >;
    });

    draftPicks.forEach((pick) => {
      if (crews[pick.playerId] && pick.role) {
        crews[pick.playerId][pick.role as Role] = {
          id: pick.id,
          info: {
            id: 0,
            name: pick.characterName,
            description: pick.characterDescription,
            imageHint: pick.characterName,
          },
          imageUrl: pick.characterImageUrl,
          role: pick.role as Role,
          playerId: pick.playerId,
        };
      }
    });

    return crews;
  }, [players, draftPicks]);

  const myCrew = useMemo(
    () => (user ? playerCrews[user.uid] : null),
    [playerCrews, user]
  );
  const otherPlayers = useMemo(
    () => players.filter((p) => p.id !== user?.uid),
    [players, user]
  );

  const allCrewsFull = useMemo(() => {
    if (Object.keys(playerCrews).length === 0 || players.length === 0)
      return false;
    if (players.length !== room?.playerCount) return false;

    return Object.values(playerCrews).every(
      (crew) => crew && Object.values(crew).every((member) => member !== null)
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
      } else {
        // For single player, go straight to result after drafting
        setPhase('result');
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
      toast({
        title: 'No more characters left in the pool!',
        variant: 'destructive',
      });
      return;
    }
    const newPool = [...characterPool];
    const draftIndex = Math.floor(Math.random() * newPool.length);
    const character = newPool.splice(draftIndex, 1)[0];
    setCharacterPool(newPool);

    const imageUrl = await getCharImage(character.name);
    if(!user) return;
    setDraftedCharacter({ id: 'new-draft', info: character, imageUrl, role: 'Captain' /* placeholder */, playerId: user.uid});
  };

  const handleDraft = () => {
    if (draftedCharacter || !isMyTurn) return;
    drawCharacter();
  };

  const handleReroll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!draftedCharacter || !isMyTurn) return;
    drawCharacter();
  };

  const handleImageError = (characterName: string) => {
    setImageErrors((prev) => ({ ...prev, [characterName]: true }));
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
  };

  const handlePlayAgain = () => {
    router.push('/build');
  };

  const handleSubmitVotes = async () => {
    if (!user || !room) return;

    const votesToSubmit: Omit<Vote, 'id'>[] = otherPlayers.map((p) => ({
      voterId: user.uid,
      targetPlayerId: p.id,
      score: playerRatings[p.id] ?? 5,
    }));

    // Add self-vote for single player mode to progress
    if (isSinglePlayer) {
      votesToSubmit.push({
        voterId: user.uid,
        targetPlayerId: user.uid,
        score: playerRatings[user.uid] ?? 10,
      });
    }

    if (votesToSubmit.length === 0 && !isSinglePlayer) {
      toast({
        title: 'No ratings submitted.',
        description: 'Please rate at least one crew.',
      });
      return;
    }

    await submitVotes(roomId, votesToSubmit, room.playerCount, votes);
  };

  const finalScores = useMemo(() => {
    if (phase !== 'result') return {};
    const scores: Record<
      string,
      { total: number; count: number; avg: number }
    > = {};

    players.forEach((p) => {
      scores[p.id] = { total: 0, count: 0, avg: 0 };
    });

    votes.forEach((vote) => {
      if (scores[vote.targetPlayerId] && vote.voterId !== vote.targetPlayerId) {
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
  }, [phase, votes, players]);

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
      title: 'Generating your certificate...',
      description: 'Please wait a moment.',
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
          const dataUrl = await toPng(element, {
            cacheBust: true,
            pixelRatio: 1.5,
          });
          const link = document.createElement('a');
          link.download = 'my-one-piece-crew.png';
          link.href = dataUrl;
          link.click();
          toast({
            title: 'Certificate saved!',
            description: 'Your crew certificate has been downloaded.',
          });
        } catch (err) {
          console.error('oops, something went wrong!', err);
          toast({
            title: 'Error saving certificate',
            description: 'Could not generate the image.',
            variant: 'destructive',
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
  };

  const handleMobileSlotClick = (role: Role) => {
    if (
      !isMobile ||
      !draftedCharacter ||
      !isMyTurn ||
      (myCrew && myCrew[role])
    )
      return;
    assignCharacterToRole(role);
  };
  
  const handleRandomizeCrew = async () => {
      if (!isSinglePlayer || !user) return;
      const crewCharacters = Object.values(myCrew || {}).filter(Boolean).map(m => m!.info.name);
      
      const availablePool = await Promise.all(
        characterPool
          .filter(c => !crewCharacters.includes(c.name))
          .map(async c => ({ ...c, imageUrl: await getCharImage(c.name) }))
      );

      await randomizeCrew(roomId, user.uid, availablePool, myCrew || {});
  }

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, character: DraftedCharacterState) => {
    if (character.playerId !== user?.uid) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify(character));
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-accent/20');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/20');
  };
  
  const handleDrop = (e: React.DragEvent, targetRole: Role) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/20');
    e.currentTarget.closest('[draggable]')?.classList.remove('opacity-50');
    
    const draggedCharString = e.dataTransfer.getData('application/json');
    if (!draggedCharString || !myCrew) return;
    
    const draggedChar: DraftedCharacterState = JSON.parse(draggedCharString);

    // Don't do anything if dropping on the same role
    if(draggedChar.role === targetRole) return;
    
    const targetChar = myCrew[targetRole];

    // If dropping on an empty slot, it's an assignment, not a swap.
    if (!targetChar) {
        if (draggedChar.id === 'new-draft' && draftedCharacter) {
             assignCharacterToRole(targetRole);
        }
        return;
    }

    // Perform the swap
    swapCharacterRoles(roomId, draggedChar.id, draggedChar.role, targetChar.id, targetChar.role);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  }


  const renderCrewMemberSlot = (
    crewMember: DraftedCharacterState | null,
    role: Role,
    isMySlot: boolean
  ) => {
    const isAssignable = !crewMember && draftedCharacter && isMyTurn;
    const isMobileAssignable = isMobile && isAssignable;
    
    const isOwner = crewMember?.playerId === user?.uid;

    const slotContent = (
      <>
        {crewMember ? (
          <WantedPosterCard
            character={crewMember}
            onImageError={() => handleImageError(crewMember.info.name)}
            hasError={imageErrors[crewMember.info.name]}
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center relative overflow-hidden bg-black/20 border-2 border-dashed border-white/20 rounded-lg p-2 text-white/40 text-3xl font-bold',
              isAssignable && 'cursor-pointer'
            )}
          >
            ?
          </div>
        )}
      </>
    );

    return (
      <div
        key={role}
        className="flex flex-col items-center gap-1 w-full relative"
        onClick={() =>
          isMySlot &&
          (isMobileAssignable
            ? handleMobileSlotClick(role)
            : isAssignable && assignCharacterToRole(role))
        }
        onDragOver={isOwner ? handleDragOver : undefined}
        onDragLeave={isOwner ? handleDragLeave : undefined}
        onDrop={(e) => isOwner ? handleDrop(e, role) : undefined}
      >
        <div
          draggable={isOwner && !!crewMember}
          onDragStart={(e) => crewMember && isOwner && handleDragStart(e, crewMember)}
          onDragEnd={handleDragEnd}
          className={cn('w-full h-48 md:h-56 relative transition-all duration-200', {
            'ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg':
              isMobileAssignable && mobileCharSelected,
            'hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-accent':
              isAssignable && !isMobile,
             'cursor-grab active:cursor-grabbing': isOwner && crewMember
          })}
        >
          {slotContent}
        </div>
        <div className="flex items-center gap-1.5 text-white/70 -mt-1">
          {React.createElement(roleIcons[role], { className: 'w-3 h-3' })}
          <span className="font-semibold text-xs">{role}</span>
        </div>
      </div>
    );
  };

  if (isLoading || !user || !myCrew) {
    return (
      <div className="flex items-center justify-center h-screen text-white text-xl">
        Loading your crew...
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      {phase === 'drafting' && (
        <div className="flex flex-col md:flex-row h-full">
          <div className="flex-shrink-0 w-full md:w-80 bg-black/30 backdrop-blur-sm border-r border-white/20 p-4 flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h2 className="font-headline text-3xl text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
                {isMyTurn ? 'Your Turn!' : 'Waiting...'}
              </h2>
              <p className="text-white/70">
                {isMyTurn
                  ? 'Draft a character for your crew.'
                  : 'Waiting for other players to draft.'}
              </p>
            </div>

            <div
              className={cn(
                'w-56 h-80 transition-all',
                draftedCharacter && isMyTurn && isMobile && 'cursor-pointer'
              )}
              onClick={handleMobileDraftedCharClick}
              onDrop={(e) => {
                 const draggedCharString = e.dataTransfer.getData('application/json');
                 if(draggedCharString) {
                    setDraftedCharacter(JSON.parse(draggedCharString));
                 }
              }}
              onDragOver={handleDragOver}
            >
              {draftedCharacter ? (
                <div
                  className={cn('w-full h-full', {
                    'ring-2 ring-accent ring-offset-2 ring-offset-background rounded-lg':
                      mobileCharSelected,
                  })}
                  draggable={isMyTurn}
                   onDragStart={(e) => draftedCharacter && handleDragStart(e, draftedCharacter)}
                >
                  <WantedPosterCard
                    character={draftedCharacter}
                    onImageError={() =>
                      handleImageError(draftedCharacter.info.name)
                    }
                    hasError={imageErrors[draftedCharacter.info.name]}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReroll}
                  disabled={!draftedCharacter || !isMyTurn}
                >
                  <Dices className="mr-2 h-4 w-4" />
                  Re-roll
                </Button>
                {isSinglePlayer && (
                    <Button variant="outline" size="sm" onClick={handleRandomizeCrew}>
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
                {players.map((player) => (
                  <div key={player.id}>
                    <h3 className="text-2xl font-headline mb-4 text-white/90">
                      {player.displayName} {player.id === user.uid && '(You)'}
                    </h3>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {ROLES.map((role) =>
                        renderCrewMemberSlot(
                          playerCrews[player.id]?.[role] || null,
                          role,
                          player.id === user.uid
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {(phase === 'voting' || phase === 'result') && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          <div className="w-full h-full animate-map-open bg-black/30 backdrop-blur-sm border-white/20 rounded-lg p-4 md:p-8 overflow-y-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-5xl font-headline text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
                {phase === 'voting' ? 'Rate Their Crews!' : isSinglePlayer ? 'Your Assembled Crew' : 'Final Standings'}
              </h1>
              <p className="text-white/70 mt-2">
                {phase === 'voting' ? 'Vote on which crew you think is the strongest.' : isSinglePlayer ? "You've assembled your crew! Save it or try again." : "The results are in! Here's how the crews stacked up."}
              </p>
            </div>

            {phase === 'voting' && (
               <div className="space-y-8">
               {otherPlayers.map((player) => (
                   <div
                     key={player!.id}
                     className="p-4 rounded-lg bg-black/20 border border-white/10"
                   >
                     <h3 className="font-headline text-2xl mb-4 text-white/90">
                       {`${player!.displayName}'s Crew`}
                     </h3>
                     <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-6">
                       {ROLES.map((role) => {
                         const crewMember = playerCrews[player!.id]?.[role];
                         return (
                           <div
                             key={role}
                             className="flex flex-col items-center gap-1 text-center"
                           >
                             <div className="w-[80px] h-[140px] relative">
                               {crewMember ? (
                                  <WantedPosterCard character={crewMember} onImageError={() => handleImageError(crewMember.info.name)} hasError={imageErrors[crewMember.info.name]}/>
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-black/20 border-2 border-dashed border-white/20 p-2 text-white/40 text-xl font-bold">
                                   ?
                                 </div>
                               )}
                             </div>
                             <div className="flex items-center gap-1.5 text-white/70 -mt-1">
                               {React.createElement(roleIcons[role], {
                                 className: 'w-2 h-2',
                               })}
                               <span className="font-semibold text-[10px]">
                                 {role}
                               </span>
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
                         onValueChange={([value]) =>
                           setPlayerRatings((prev) => ({
                             ...prev,
                             [player!.id]: value,
                           }))
                         }
                       />
                       <span className="text-white font-bold">10</span>
                     </div>
                   </div>
                 ))}
             </div>
            )}

            {phase === 'result' && (
                <div className="space-y-6">
                  {sortedPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        className="p-4 rounded-lg bg-black/20 border border-white/10 flex flex-col md:flex-row gap-6 items-center"
                      >
                         {!isSinglePlayer && (
                            <div className="flex items-center gap-4">
                              <span className="text-4xl font-bold font-headline text-yellow-500 w-12 text-center">
                                #{index + 1}
                              </span>
                              <div className="text-center border-r pr-4 border-yellow-800/30">
                                <p className="text-5xl font-bold font-headline text-white">
                                  {(finalScores[player.id]?.avg ?? 0).toFixed(1)}
                                </p>
                                <p className="text-sm text-white/60">Avg. Score</p>
                              </div>
                            </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-headline mb-4 text-white/90">
                            {player.displayName}'s Crew {player.id === user.id && '(You)'}
                          </h3>
                          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                            {ROLES.map((role) => {
                              const crewMember = playerCrews[player.id]?.[role] || null;
                              return (
                                <div
                                  key={role}
                                  className="flex flex-col items-center gap-1 text-center"
                                >
                                  <div className="w-[80px] h-[140px] relative">
                                    {crewMember ? (
                                       <WantedPosterCard character={crewMember} onImageError={() => handleImageError(crewMember.info.name)} hasError={imageErrors[crewMember.info.name]}/>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-black/20 border-2 border-dashed border-white/20 p-2 text-white/40 text-xl font-bold">
                                        ?
                                      </div>
                                    )}
                                  </div>
                                   <div className="flex items-center gap-1.5 text-white/70 -mt-1">
                                        {React.createElement(roleIcons[role], {
                                        className: 'w-2 h-2',
                                        })}
                                        <span className="font-semibold text-[10px]">
                                        {role}
                                        </span>
                                    </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
            )}
            
            <div className="text-center mt-8 flex justify-center gap-4">
              {phase === 'voting' && (
                <Button onClick={handleSubmitVotes} size="lg">
                  Submit Votes
                </Button>
              )}
              {phase === 'result' && (
                 <>
                  <Button onClick={handleSaveCrew} disabled={isSaving}>
                    <Download className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save My Crew'}
                  </Button>
                  <Button variant="secondary" onClick={handlePlayAgain}>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Play Again
                  </Button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {crewForCertificate && (
        <CrewCertificate
          id="crew-certificate-capture"
          roomId={roomId}
          crew={crewForCertificate}
          isForCapture={!!crewForCertificate}
        />
      )}
    </div>
  );
}
