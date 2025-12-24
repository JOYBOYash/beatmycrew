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
  Check,
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
  finishDrafting,
  randomizeCrew,
  selectCharacterForPlayer,
  submitVotes,
  swapCharacterRoles,
  Vote,
  updateRoomStatus,
} from '@/lib/rooms';
import BackButton from './BackButton';

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
  role: Role | null;
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

const getThreatLevel = (score: number) => {
    if (score >= 9.5) return { name: 'Yonko', color: 'text-red-400' };
    if (score >= 7) return { name: 'Warlord', color: 'text-purple-400' };
    if (score >= 4) return { name: 'Supernova', color: 'text-blue-400' };
    return { name: 'Rookie', color: 'text-green-400' };
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
      className="w-full h-full bg-[url(/card_bg.png)] bg-cover bg-center p-2 pt-1 flex flex-col items-center gap-0.5 shadow-lg relative group"
      {...props}
    >
      <h3 className="font-bold text-xs tracking-wider text-[#7f5b3b]">
        WANTED
      </h3>
      <div className="w-full h-[70%] relative bg-black/10 border-2 border-[#b9936d]">
        <Image
          src={showFallback ? '/bmc_logo.png' : character.imageUrl}
          alt={character.info.name}
          data-ai-hint={character.info.imageHint}
          fill
          className={cn(
            'object-cover',
            showFallback ? 'object-contain p-1' : 'object-top'
          )}
          sizes="(max-width: 768px) 100px, 150px"
          onError={onImageError}
        />
      </div>
      <p className="text-[8px] text-[#9c6d43]/70 mt-1">
        DEAD OR ALIVE
      </p>
      <p className="font-bold text-sm leading-tight truncate w-full text-center text-[#9c6d43]">
        {character.info.name}
      </p>
      {isApiFallback && !getReportedIssues().includes(character.info.name) && (
        <Button
          size="sm"
          variant="destructive"
          className="absolute bottom-1 right-1 h-auto p-1 text-[10px] leading-none opacity-0 group-hover:opacity-100 z-20"
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

const LargeWantedPoster = ({ character, onImageError, hasError, ...props }: { character: DraftedCharacterState; onImageError: () => void; hasError: boolean; [key: string]: any;}) => {
    const isApiFallback = character.imageUrl.includes('bmc_logo.png');
    const showFallback = isApiFallback || hasError;

    return (
        <div className="w-full h-full bg-[url(/card_bg.png)] bg-cover bg-center p-4 flex flex-col items-center gap-1 shadow-lg" {...props}>
             <h3 className="font-bold text-2xl tracking-wider text-[#7f5b3b]">
                WANTED
            </h3>
            <div className="w-full flex-1 relative bg-black/10 border-4 border-[#b9936d] my-1">
                 <Image
                    src={showFallback ? '/bmc_logo.png' : character.imageUrl}
                    alt={character.info.name}
                    data-ai-hint={character.info.imageHint}
                    fill
                    className={cn(
                        'object-cover',
                        showFallback ? 'object-contain p-4' : 'object-top'
                    )}
                    sizes="250px"
                    onError={onImageError}
                />
            </div>
            <p className="text-sm text-[#9c6d43]/70">DEAD OR ALIVE</p>
            <p className="font-bold text-2xl leading-tight w-full text-center text-[#9c6d43]">
                {character.info.name}
            </p>
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

  const myCrewIsFull = useMemo(() => {
    if (!myCrew) return false;
    return ROLES.every(role => myCrew[role] !== null);
  }, [myCrew]);
  
  const sortedPlayersForDisplay = useMemo(() => {
    if (!user) return players;
    return [...players].sort((a, b) => {
      if (a.id === user.uid) return -1;
      if (b.id === user.uid) return 1;
      return 0;
    });
  }, [players, user]);


  const otherPlayers = useMemo(
    () => players.filter((p) => p.id !== user?.uid),
    [players, user]
  );

  useEffect(() => {
    if (room?.status === 'voting') {
      setPhase('voting');
    } else if (room?.status === 'finished') {
      setPhase('result');
    } else {
      setPhase('drafting');
    }
  }, [room?.status]);


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
    setDraftedCharacter({ id: 'new-draft', info: character, imageUrl, role: null , playerId: user.uid});
  };

  const handleDraft = () => {
    if (draftedCharacter || !isMyTurn || myCrewIsFull) return;
    drawCharacter();
  };
  
  const handleFinishDrafting = async () => {
    if (!room || !user || !room.turnOrder) return;
    await finishDrafting(roomId, user.uid, room.turnOrder, room.playerCount);
  }

  const handleReroll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!draftedCharacter || !isMyTurn) return;
    drawCharacter();
  };

  const handleImageError = (characterName: string) => {
    setImageErrors((prev) => ({ ...prev, [characterName]: true }));
  };

  const assignCharacterToRole = async (role: Role) => {
    if (!draftedCharacter || !room || !user ) return;

    await selectCharacterForPlayer(
      roomId,
      user.uid,
      role,
      draftedCharacter.info.name,
      draftedCharacter.info.description,
      draftedCharacter.imageUrl
    );

    setDraftedCharacter(null);
    setMobileCharSelected(false);
  };

  const handlePlayAgain = () => {
    router.push('/');
  };

  const { voters, hasVoted } = useMemo(() => {
    if (!votes) return { voters: new Set(), hasVoted: false };
    const voterIds = new Set(votes.map(v => v.voterId));
    return {
      voters: voterIds,
      hasVoted: user ? voterIds.has(user.uid) : false,
    };
  }, [votes, user]);

  const handleSubmitVotes = async () => {
    if (!user || !room || hasVoted) return;

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

    await submitVotes(roomId, votesToSubmit, room.playerCount, voters.size + 1);
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
      } else {
        // In single player mode, get the self-vote score
        const selfVote = votes.find(v => v.targetPlayerId === playerId && v.voterId === playerId);
        scores[playerId].avg = selfVote ? selfVote.score : 0;
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
    const target = e.currentTarget as HTMLDivElement;
    if (target.dataset.slotEmpty === 'true') {
        target.classList.add('bg-[#cba47e]/30');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).classList.remove('bg-[#cba47e]/30');
  };
  
  const handleDrop = (e: React.DragEvent, targetRole: Role) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).classList.remove('bg-[#cba47e]/30');
    (document.querySelector('.opacity-50') as HTMLElement)?.classList.remove('opacity-50');
    
    const draggedCharString = e.dataTransfer.getData('application/json');
    if (!draggedCharString || !myCrew) return;
    
    const draggedChar: DraftedCharacterState = JSON.parse(draggedCharString);
    const targetChar = myCrew[targetRole];

    if (draggedChar.playerId !== user?.uid) return;

    if (!targetChar) {
        // If it's a new character being dragged to an empty slot
        if (draggedChar.id === 'new-draft' && draftedCharacter) {
             assignCharacterToRole(targetRole);
        }
        // If it's an existing character being moved to an empty slot
        else if (draggedChar.id !== 'new-draft' && draggedChar.role) {
            swapCharacterRoles(roomId, draggedChar.id, draggedChar.role, null, targetRole);
        }
    } else {
        // If dropping on an occupied slot, perform a swap
        if (targetChar.playerId !== user?.uid || !draggedChar.role) return;
        swapCharacterRoles(roomId, draggedChar.id, draggedChar.role, targetChar.id, targetChar.role);
    }
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
     (e.currentTarget as HTMLElement).classList.remove('opacity-50');
  }


  const renderCrewMemberSlot = (
    crewMember: DraftedCharacterState | null,
    role: Role,
    isMySlot: boolean
  ) => {
    const isAssignable = !crewMember && draftedCharacter && isMyTurn;
    const isOwner = crewMember?.playerId === user?.uid;
    const RoleIcon = roleIcons[role];

    return (
      <div
        key={role}
        className="flex flex-col items-center gap-1 w-full h-full relative"
        onClick={() => isMySlot && isAssignable && assignCharacterToRole(role)}
        onDragOver={isMySlot ? handleDragOver : undefined}
        onDragLeave={isMySlot ? handleDragLeave : undefined}
        onDrop={(e) => isMySlot ? handleDrop(e, role) : undefined}
        data-slot-empty={!crewMember}
      >
        <div
          draggable={isOwner && !!crewMember}
          onDragStart={(e) => crewMember && isOwner && handleDragStart(e, crewMember)}
          onDragEnd={handleDragEnd}
          className={cn('w-[150px] h-[180px] transition-all duration-200', {
            'hover:scale-105 hover:shadow-lg': isAssignable,
            'cursor-grab active:cursor-grabbing': isOwner && crewMember
          })}
        >
            {crewMember ? (
              <WantedPosterCard
                character={crewMember}
                onImageError={() => handleImageError(crewMember.info.name)}
                hasError={imageErrors[crewMember.info.name]}
              />
            ) : (
              <div
                className={cn(
                  'w-full h-full flex items-center justify-center relative bg-[#cba47e]/20 border-2 border-dashed border-[#9c6d43]/50 rounded-md text-[#9c6d43]/40 text-3xl font-bold',
                  isAssignable && 'cursor-pointer'
                )}
              >
                ?
              </div>
            )}
        </div>
        <div className="flex items-center justify-center gap-2 mt-1 text-sm font-bold text-[#9c6d43]">
           <RoleIcon className="w-4 h-4" />
           <span>{role}</span>
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
    <div className="w-full h-screen p-4 sm:p-6 lg:p-8 overflow-hidden relative">
      <BackButton />
      {phase === 'drafting' && (
        <main className="w-full h-full flex flex-col">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Left Drafting Column */}
                <div className="lg:col-span-1 relative flex flex-col p-6 items-center">
                     <Image src="/section.png" alt="Parchment Background" layout="fill" objectFit="cover" className="absolute inset-0 -z-10"/>
                    <div className="relative mb-4">
                        <Image src="/head.png" alt="Draft Crew" width={400} height={100} className="w-72 md:w-96"/>
                        <h1 className="absolute inset-0 flex items-center justify-center text-3xl md:text-4xl font-bold" style={{background: "linear-gradient(180deg, #b7341d, #762112, #5a1a0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            DRAFT CREW
                        </h1>
                    </div>

                    <div className='text-center'>
                         <h2 className="font-bold text-2xl text-[#b7341d]">
                           {isMyTurn ? 'YOUR TURN!' : `${room?.players.find(p => p.id === room.currentPlayerId)?.displayName || 'Player'}'s Turn`}
                        </h2>
                        <p className="text-[#9c6d43] font-bold">
                            {isMyTurn ? (myCrewIsFull ? 'Your crew is full! Swap roles or finish drafting.' : 'DRAFT A CHARACTER TO YOUR CREW') : 'Waiting for opponent...'}
                        </p>
                    </div>

                    <div 
                        className="flex-1 my-4 w-full"
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                            (e.currentTarget as HTMLDivElement).classList.remove('bg-[#cba47e]/30');
                            const draggedCharString = e.dataTransfer.getData('application/json');
                             if(draggedCharString && draftedCharacter) {
                                const draggedChar: DraftedCharacterState = JSON.parse(draggedCharString);
                                if(draggedChar.id !== 'new-draft' && draggedChar.role) { // only allow dropping existing chars here
                                    swapCharacterRoles(roomId, draftedCharacter.id, null, draggedChar.id, draggedChar.role);
                                    setDraftedCharacter(draggedChar);
                                }
                             }
                        }}
                    >
                         {draftedCharacter ? (
                            <div 
                                className="w-full h-full max-w-sm mx-auto"
                                draggable={isMyTurn}
                                onDragStart={(e) => draftedCharacter && handleDragStart(e, draftedCharacter)}
                                onDragEnd={handleDragEnd}
                            >
                                <LargeWantedPoster
                                    character={draftedCharacter}
                                    onImageError={() => handleImageError(draftedCharacter.info.name)}
                                    hasError={imageErrors[draftedCharacter.info.name]}
                                />
                            </div>
                        ) : (
                            <button
                                className="w-full h-full max-w-sm mx-auto bg-[#cba47e]/20 border-4 border-dashed border-[#9c6d43]/50 rounded-lg flex flex-col items-center justify-center text-[#9c6d43]/60 hover:bg-[#cba47e]/30 transition-colors"
                                onClick={handleDraft}
                                disabled={!isMyTurn || myCrewIsFull}
                            >
                                <Dices className="w-16 h-16" />
                                <span className='font-bold text-xl mt-2'>DRAFT CHARACTER</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-auto w-full max-w-sm mx-auto">
                        {myCrewIsFull && isMyTurn && (
                             <button 
                                onClick={handleFinishDrafting}
                                className="flex items-center justify-center gap-2 rounded-full px-6 py-2 text-white font-bold text-lg shadow-lg hover:scale-105 transition-transform"
                                style={{
                                    background:
                                    'linear-gradient(180deg, #b7341d 0%, #762112 50%, #5a1a0f 100%)',
                                }}
                            >
                                <Check /> DRAFTING DONE
                            </button>
                        )}
                        <button 
                            onClick={handleReroll} 
                            disabled={!draftedCharacter || !isMyTurn} 
                            className="bg-[#cba47e] border-2 border-[#9c6d43] text-[#6b451e] font-bold px-8 py-2 rounded-full hover:bg-[#b9936d] disabled:opacity-50 disabled:cursor-not-allowed text-lg ml-auto"
                        >
                            RE-ROLL
                        </button>
                     </div>
                </div>

                {/* Right Crews Column */}
                <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-y-auto pr-2">
                    {sortedPlayersForDisplay.map(player => (
                        <div key={player.id} className="relative p-6 flex-1 flex flex-col min-h-[600px]">
                            <Image src="/section.png" alt="Parchment Background" layout="fill" objectFit="cover" className="absolute inset-0 -z-10"/>
                            
                            <div className="relative self-center mb-4">
                                <Image src="/head.png" alt="Roster" width={300} height={80} className="w-64"/>
                                <h3 className="absolute inset-0 flex items-center justify-center text-xl font-bold pr-4" style={{background: "linear-gradient(180deg, #ffd3a5, #6b451e, #472a0d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                    {player.displayName}'S ROSTER
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-4 p-4 gap-x-4 gap-y-6">
                                {ROLES.map(role => (
                                    <div className="w-full h-full" key={role}>
                                        {renderCrewMemberSlot(playerCrews[player.id]?.[role] || null, role, player.id === user.uid)}
                                    </div>
                                ))}
                            </div>

                        </div>
                    ))}
                </div>
            </div>
             <div className="absolute bottom-[-100px] left-[-100px] rotate-[-15deg] opacity-40">
                <Image
                src="/logo-colored.png"
                alt="App Logo"
                width={300}
                height={185}
                />
            </div>
             <div className="absolute bottom-6 right-10 text-sm font-bold">
                <span style={{ background: "linear-gradient(180deg, #ffd3a5, #6b451e, #472a0d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    CREATED BY JOYBOY
                </span>
            </div>
        </main>
      )}

      {phase === 'voting' && (
         <main className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 overflow-hidden">
            <style>
              {`
                .voting-slider .bg-primary {
                  background-color: #613525 !important;
                }
                .voting-slider span[role="slider"] {
                   border-color: #9c6d43 !important;
                   background-color: #9c6d43 !important;
                }
              `}
            </style>
            <div className="relative w-[1400px] max-w-[95%] h-[800px]">
                <Image src="/section.png" alt="Parchment" fill objectFit="contain" />
                <div className="absolute inset-0 flex flex-col items-center py-10 px-20">
                     <div className="relative mb-8">
                        <Image src="/head.png" alt="Rate Crews" width={300} height={80} />
                        <h1 className="absolute inset-0 flex items-center justify-center text-3xl font-bold" style={{background: "linear-gradient(180deg, #b7341d, #762112, #5a1a0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            RATE CREWS
                        </h1>
                    </div>
                    
                    <div className="w-full space-y-12">
                        {otherPlayers.map((player) => {
                             const rating = playerRatings[player!.id] ?? 5;
                             const threatLevel = getThreatLevel(rating);
                            return (
                           <div key={player!.id} className="w-full">
                                <div className='flex items-center justify-between mb-4'>
                                    <div className="relative">
                                        <Image src="/head.png" alt="Crew Roster" width={240} height={60} />
                                        <h3 className="absolute inset-0 flex items-center justify-center text-xl font-bold" style={{background: "linear-gradient(180deg, #ffd3a5, #6b451e, #472a0d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                            {`${player!.displayName}'s Roster`}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className='flex items-center gap-2'>
                                             <span className="text-[#9c6d43] font-bold text-sm">CREW LEVEL</span>
                                             <Image className="rounded-[100px]" src="/tooltip-icon.png" alt="Tooltip" width={14} height={14} />
                                        </div>
                                        <div className='bg-[#cba47e] border-2 border-[#9c6d43] rounded-full px-4 py-1 flex items-center gap-2'>
                                            <span className='font-bold text-lg' style={{ background: "linear-gradient(180deg, #b7341d, #762112, #5a1a0f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{threatLevel.name}</span>
                                            <span className='font-bold text-lg text-[#9c6d43]'>{rating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-8 gap-4 mb-4">
                                    {ROLES.map((role) => {
                                        const crewMember = playerCrews[player!.id]?.[role];
                                        return (
                                        <div key={role} className="w-full h-[140px] relative">
                                            {crewMember ? (
                                                <WantedPosterCard character={crewMember} onImageError={() => handleImageError(crewMember.info.name)} hasError={imageErrors[crewMember.info.name]}/>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-[#cba47e]/20 border-2 border-dashed border-[#9c6d43]/50 rounded-md text-[#9c6d43]/40 text-2xl font-bold">
                                                ?
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-4 max-w-full mx-auto">
                                    <span className="font-bold text-lg text-[#9c6d43]">0</span>
                                    <Slider
                                        defaultValue={[5]}
                                        min={0}
                                        max={10}
                                        step={0.5}
                                        onValueChange={([value]) => setPlayerRatings((prev) => ({...prev, [player!.id]: value, }))}
                                        className="w-full voting-slider"
                                    />
                                    <span className="font-bold text-lg text-[#9c6d43]">10</span>
                                </div>
                           </div>
                        )})}
                    </div>
                    
                    <button onClick={handleSubmitVotes} disabled={hasVoted} className="absolute bottom-10 right-20 bg-transparent border-none p-0 w-[260px] h-[70px] disabled:opacity-50">
                        <Image src="/head.png" alt="Submit Votes" layout="fill" objectFit="contain"/>
                        <span className="absolute inset-0 flex items-center font-bold justify-center text-xl" style={{ background: "linear-gradient(180deg, #ffd3a5, #6b451e, #472a0d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            {hasVoted ? 'VOTES SUBMITTED' : 'SUBMIT VOTES'}
                        </span>
                    </button>
                    <p className="absolute bottom-2 right-20 text-xs text-[#9c6d43]">
                       ({voters.size}/{players.length} pirates have voted)
                  </p>
                </div>
            </div>
            <div className="absolute bottom-[-100px] left-[-100px] rotate-[-15deg] opacity-40">
                <Image src="/logo-colored.png" alt="App Logo" width={300} height={185} />
            </div>
             <div className="absolute bottom-6 right-10 text-sm font-bold">
                <span style={{ background: "linear-gradient(180deg, #ffd3a5, #6b451e, #472a0d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    CREATED BY JOYBOY
                </span>
            </div>
         </main>
      )}

      {phase === 'result' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          <div className="w-full h-full animate-map-open bg-black/30 backdrop-blur-sm border-white/20 rounded-lg p-4 md:p-8 overflow-y-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-5xl font-headline text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
                {isSinglePlayer ? 'Your Assembled Crew' : 'Final Standings'}
              </h1>
              <p className="text-white/70 mt-2">
                {isSinglePlayer ? "You've assembled your crew! Save it or try again." : "The results are in! Here's how the crews stacked up."}
              </p>
            </div>

            <div className="space-y-6">
              {sortedPlayers.map((player, index) => {
                  const score = finalScores[player.id]?.avg ?? 0;
                  const threatLevel = getThreatLevel(score);
                  const cardHeightClass = players.length === 1 ? 'h-[240px]' : players.length === 2 ? 'h-[200px]' : 'h-[180px]';

                  return (
                  <div
                    key={player.id}
                    className="p-4 rounded-lg bg-black/20 border border-white/10 flex flex-col md:flex-row gap-6 items-center"
                  >
                     {!isSinglePlayer && (
                        <div className="flex items-center gap-4">
                          <span className="text-4xl font-bold font-headline text-yellow-500 w-12 text-center">
                            #{index + 1}
                          </span>
                          <div className="text-center border-r px-4 border-yellow-800/30">
                            <p className="text-5xl font-bold font-headline text-white">
                              {score.toFixed(1)}
                            </p>
                            <p className="text-sm text-white/60">Avg. Score</p>
                          </div>
                           <div className="text-center">
                            <p className={cn("text-3xl font-bold font-headline", threatLevel.color)}>
                                {threatLevel.name}
                            </p>
                            <p className="text-sm text-white/60">Threat Level</p>
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
                          const RoleIcon = roleIcons[role];
                          return (
                            <div
                              key={role}
                              className="flex flex-col items-center gap-1 text-center"
                            >
                              <div className={cn("w-full relative", cardHeightClass)}>
                                {crewMember ? (
                                   <WantedPosterCard character={crewMember} onImageError={() => handleImageError(crewMember.info.name)} hasError={imageErrors[crewMember.info.name]}/>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-black/20 border-2 border-dashed border-white/20 p-2 text-white/40 text-xl font-bold">
                                    ?
                                  </div>
                                )}
                              </div>
                               <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-white/70 mt-1">
                                    <RoleIcon className="w-4 h-4" />
                                    <span>{role}</span>
                                </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  )
                }
              )}
            </div>
            
            <div className="text-center mt-8 space-y-2">
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
