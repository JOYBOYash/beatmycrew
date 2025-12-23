
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Wand2 } from "lucide-react";
import { createRoom, joinRoom } from "@/lib/rooms";
import { useUser } from "@/firebase";

export default function HomePage() {
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    const savedName = localStorage.getItem("beatmycrew_displayName");
    if (savedName) {
      setDisplayName(savedName);
    }
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setDisplayName(newName);
    localStorage.setItem("beatmycrew_displayName", newName);
  };

  const handleCreateRoom = async () => {
    if (!user) {
        toast({
            title: "Authentication Error",
            description: "Please wait a moment and try again.",
            variant: "destructive",
        });
        return;
    }
    const newRoomCode = await createRoom(user.uid, displayName);
    router.push(`/room/${newRoomCode}`);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
         toast({
            title: "Authentication Error",
            description: "Please wait a moment and try again.",
            variant: "destructive",
        });
        return;
    }

    if (roomCode.length === 5) {
      await joinRoom(roomCode.toUpperCase(), user, displayName);
      router.push(`/room/${roomCode.toUpperCase()}`);
    } else {
      toast({
        title: "Invalid Code",
        description: "Room codes must be 5 characters long.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-md animate-map-open bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/20">
      <div className="text-center">
        <Logo />
      </div>
      <div className="grid gap-6 mt-8">
        <div className="grid gap-2">
            <Label htmlFor="display-name" className="font-bold text-white/90">
              Your Pirate Name
            </Label>
            <Input
              id="display-name"
              placeholder="e.g., 'Red-Haired Bob'"
              value={displayName}
              onChange={handleNameChange}
              className="text-center bg-black/20 border-white/20 text-white placeholder:text-white/40"
            />
        </div>

        <Button onClick={handleCreateRoom} className="w-full" size="lg" disabled={!user}>
          <Wand2 className="mr-2" />
          Create a New Room
        </Button>
        <div className="flex items-center gap-4">
          <Separator className="flex-1 bg-white/20" />
          <span className="text-muted-foreground text-sm font-bold text-white/60">OR</span>
          <Separator className="flex-1 bg-white/20" />
        </div>
        <form onSubmit={handleJoinRoom} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="room-code" className="font-bold text-white/90">
              Join with a code
            </Label>
            <Input
              id="room-code"
              placeholder="Enter 5-character code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={5}
              className="text-center tracking-widest uppercase bg-black/20 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <Button type="submit" variant="secondary" className="w-full" disabled={!user || roomCode.length !== 5}>
            Join Room
            <ArrowRight className="ml-2" />
          </Button>
        </form>
      </div>
    </div>
  );
}
