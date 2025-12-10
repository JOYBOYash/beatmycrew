'use client';

import { useUser, useCollection, useDocument } from '@/firebase';
import { Player, Room, setPlayerCount, startGame } from '@/lib/rooms';
import { useRouter } from 'next/navigation';
import { useEffect, use } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Balancer from 'react-wrap-balancer';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied!",
      description: "You can now share the link with your friends.",
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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg text-center animate-map-open bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/20">
        <h1 className='font-headline text-3xl text-white [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]'>
          Lobby
        </h1>

        <Balancer className="text-white/80 mt-2 [text-shadow:_0_1px_10px_rgb(0_0_0_/_50%)]">
          Waiting for players to join your crew...
        </Balancer>

        <div className="space-y-6 mt-8">
          {isHost && (
            <div className='text-left'>
              <Label className="font-bold text-white/90">Game Mode</Label>
              <RadioGroup
                defaultValue={room.playerCount.toString()}
                className="grid grid-cols-3 gap-4 mt-2"
                onValueChange={handlePlayerCountChange}
              >
                {[1, 2, 4].map(count => (
                  <Label
                    key={count}
                    htmlFor={`player-count-${count}`}
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                  >
                    <RadioGroupItem
                      value={count.toString()}
                      id={`player-count-${count}`}
                      className="sr-only"
                    />
                    <Users className="mb-3 h-6 w-6" />
                    {count} Player{count > 1 ? 's' : ''}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <p className='text-sm text-white/70 text-left'>Room Code</p>
              <div className="flex items-center justify-between rounded-lg border border-white/20 bg-black/20 p-3">
                <span className="font-mono text-lg tracking-widest text-white">{roomId}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyLink}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* FIXED PLAYER LIST */}
          <div className='text-left'>
            <h3 className="text-lg font-semibold mb-2 text-white/90">
              Players ({players.length}/{room.playerCount})
            </h3>

            <div className="grid grid-cols-2 gap-2 text-left">
              {players.map((player, index) => {
                const safeKey = player?.id ?? `player-${index}`;
                return (
                  <div
                    key={safeKey}
                    className="bg-black/20 p-3 rounded-md border border-white/10"
                  >
                    <p className="font-semibold truncate text-white/90">
                      {player.displayName ?? "Unknown Player"}
                    </p>
                  </div>
                );
              })}

              {Array.from({ length: Math.max(0, room.playerCount - players.length) })
                .map((_, i) => (
                  <div
                    key={`empty-slot-${i}`}
                    className="bg-black/10 p-3 rounded-md animate-pulse border border-dashed border-white/10"
                  >
                    <p className="text-white/50">Waiting...</p>
                  </div>
                ))}
            </div>
          </div>

          {isHost ? (
            <Button
              onClick={handleStartGame}
              size="lg"
              className="w-full"
              disabled={!canStart}
            >
              Start Game ({players.length}/{room.playerCount} players)
              <ArrowRight className="ml-2" />
            </Button>
          ) : (
            <p className="text-sm text-white/60">
              Waiting for the host to start the game...
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
