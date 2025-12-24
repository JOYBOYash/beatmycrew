'use client';

import { useUser, useCollection, useDocument } from '@/firebase';
import { Player, Room, setPlayerCount, startGame, joinRoom } from '@/lib/rooms';
import { useRouter } from 'next/navigation';
import { useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import BackButton from '@/components/BackButton';

export default function LobbyPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const { data: room, isLoading: isRoomLoading } = useDocument<Room>(
    `rooms/${roomId}`
  );
  const { data: players, isLoading: arePlayersLoading } = useCollection<Player>(
    `rooms/${roomId}/players`
  );
  const { toast } = useToast();

  useEffect(() => {
    // If the user lands here but isn't a player yet, try to join them.
    if (user && !isUserLoading && players.length > 0 && !players.find(p => p.id === user.uid)) {
        const displayName = localStorage.getItem("beatmycrew_displayName") || undefined;
        joinRoom(roomId, user, displayName).catch(err => {
            toast({
                title: "Could not join lobby",
                description: err.message,
                variant: 'destructive'
            });
            router.push('/build');
        });
    }
  }, [user, isUserLoading, players, roomId, router, toast]);

  useEffect(() => {
    if (!isRoomLoading && room?.status === 'drafting') {
      router.push(`/room/${roomId}/draft`);
    }
    if (!isRoomLoading && (room?.status === 'voting' || room?.status === 'finished')) {
      router.push(`/room/${roomId}/draft`);
    }
  }, [room, isRoomLoading, router, roomId]);

  if (isUserLoading || isRoomLoading || arePlayersLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen text-white text-xl">
        Loading Lobby...
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-screen">
        Room not found.
      </div>
    );
  }

  const isHost = room.hostId === user.uid;
  const canStart = players.length === room.playerCount;

  const handleStartGame = () => {
    if (isHost && canStart) {
      startGame(roomId, players);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Room Code Copied!",
      description: "You can now share the code with your friends.",
    });
  };

  const handlePlayerCountChange = (value: string) => {
    if (isHost) {
      const count = parseInt(value, 10);
      if ([1, 2, 4].includes(count)) {
        setPlayerCount(roomId, count);
      }
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 overflow-hidden">
        <BackButton />
        {/* Top Title */}
      <div className="absolute top-10">
        <Image
          src="/main-logo.png"
          alt="Beat My Crew Title"
          width={550}
          height={120}
          priority
        />
      </div>
      
      {/* Main Content Wrapper */}
      <div className="relative w-[900px] max-w-[95%]">
        {/* Section Background */}
        <Image
          src="/section.png"
          alt="Parchment Section"
          width={900}
          height={520}
          className="w-full h-auto"
          priority
        />

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center py-10 px-20">
          <div className="relative mb-8">
             <Image
              src="/head.png"
              alt="Lobby Header"
              width={280}
              height={75}
            />
            <h2
              className="absolute inset-0 flex items-center font-bold justify-center text-2xl"
              style={{
                background:
                  "linear-gradient(180deg, #ffd3a5, #6b451e, #472a0d)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
              }}
            >
              LOBBY
            </h2>
          </div>

          <div className="w-full max-w-lg space-y-6 text-center">

            {isHost && (
              <div className="flex flex-col items-center gap-2">
                <label className="flex items-center gap-2 text-[#9c6d43] font-bold text-lg">
                  FIGHT MODE
                  <Image
                      className="rounded-[100px]"
                      src="/tooltip-icon.png"
                      alt="Tooltip"
                      width={18}
                      height={18}
                    />
                </label>
                <div className="flex justify-center gap-4">
                  {[1, 2, 4].map(count => (
                    <Button
                      key={count}
                      onClick={() => handlePlayerCountChange(count.toString())}
                      className={cn(
                        'bg-[#cba47e] border-[#9c6d43] border-2 text-[#6b451e] font-bold text-lg h-12 w-28 rounded-full hover:bg-[#b9936d]',
                        room.playerCount === count ? 'bg-[#9c6d43] text-white' : ''
                      )}
                      disabled={players.length > count}
                    >
                      <Users className="mr-2" /> {count}P
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex flex-col items-center gap-2">
              <label className="flex items-center gap-2 text-[#9c6d43] font-bold text-lg">
                YOUR FIGHT ID
                  <Image
                    className="rounded-[100px]"
                    src="/tooltip-icon.png"
                    alt="Tooltip"
                    width={18}
                    height={18}
                  />
              </label>
              <div 
                className="flex items-center justify-center gap-2 bg-[#cba47e] border-[#9c6d43] border-2 text-[#6b451e] font-bold text-lg h-12 px-6 rounded-full cursor-pointer"
                onClick={handleCopyCode}
                title="Click to copy Room ID"
              >
                <span className="tracking-[0.3em]">{roomId}</span>
                <Copy className="h-5 w-5" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label className="flex items-center gap-2 text-[#9c6d43] font-bold text-lg">
                PIRATES IN FIGHT ({players.length}/{room.playerCount})
                <Image
                    className="rounded-[100px]"
                    src="/tooltip-icon.png"
                    alt="Tooltip"
                    width={18}
                    height={18}
                  />
              </label>
              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                {players.map((player) => (
                  <div key={player.id} className="bg-[#cba47e] border-[#9c6d43] border-2 text-[#6b451e] font-bold text-center h-10 flex items-center justify-center rounded-full truncate px-2">
                     {player.displayName}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, room.playerCount - players.length) })
                  .map((_, i) => (
                    <div key={`empty-${i}`} className="bg-[#cba47e]/50 border-[#9c6d43]/50 border-2 text-[#6b451e]/70 font-bold text-center h-10 flex items-center justify-center rounded-full animate-pulse">
                      WAITING...
                    </div>
                ))}
              </div>
            </div>
            
            {isHost ? (
               <button onClick={handleStartGame} disabled={!canStart} className="relative bg-transparent border-none p-0 w-[260px] h-[70px] disabled:opacity-50 mx-auto">
                    <Image
                    src="/head.png"
                    alt="Start Fight"
                    layout="fill"
                    objectFit="contain"
                    />
                    <span
                    className="absolute inset-0 flex items-center font-bold justify-center text-xl"
                    style={{
                        background:
                        "linear-gradient(180deg, #ffd3a5, #6b451e, #472a0d)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                    >
                    BUILD CREW
                    </span>
                </button>
            ) : (
              <p className="text-sm text-[#9c6d43] font-bold">
                Waiting for the host to start the game...
              </p>
            )}
          </div>
        </div>
      </div>
      
       {/* Bottom Left Logo */}
      <div className="absolute bottom-[-100px] left-[-100px] rotate-[-15deg] opacity-40">
        <Image
          src="/logo-colored.png"
          alt="App Logo"
          width={400}
          height={250}
        />
      </div>

      {/* Bottom Right Credit */}
      <div className="absolute bottom-6 right-10 text-sm font-bold">
        <span
          style={{
            background: "linear-gradient(180deg, #ffd3a5, #6b451e, #472a0d)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          CREATED BY JOYBOY
        </span>
      </div>
    </main>
  );
}
