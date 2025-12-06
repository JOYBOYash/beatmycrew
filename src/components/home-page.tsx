"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Wand2 } from "lucide-react";

export default function HomePage() {
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateRoom = () => {
    const newRoomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    router.push(`/room/${newRoomCode}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 5) {
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
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="items-center text-center">
        <Logo />
      </CardHeader>
      <CardContent className="grid gap-6">
        <Button onClick={handleCreateRoom} className="w-full" size="lg">
          <Wand2 className="mr-2" />
          Create a New Room
        </Button>
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-sm">OR</span>
          <Separator className="flex-1" />
        </div>
        <form onSubmit={handleJoinRoom} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="room-code" className="font-bold">
              Join with a code
            </Label>
            <Input
              id="room-code"
              placeholder="Enter 5-character code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={5}
              className="text-center tracking-widest uppercase"
            />
          </div>
          <Button type="submit" variant="secondary" className="w-full">
            Join Room
            <ArrowRight className="ml-2" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
