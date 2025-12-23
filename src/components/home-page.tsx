
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createRoom, joinRoom } from "@/lib/rooms";
import { useUser } from "@/firebase";
import Image from "next/image";

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
    if (!displayName) {
        toast({
            title: "Pirate Name Required",
            description: "Please enter a name for your pirate crew.",
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
    if (!displayName) {
        toast({
            title: "Pirate Name Required",
            description: "Please enter a name for your pirate crew.",
            variant: "destructive",
        });
        return;
    }
    if (roomCode.length === 5) {
      try {
        await joinRoom(roomCode.toUpperCase(), user, displayName);
        router.push(`/room/${roomCode.toUpperCase()}`);
      } catch(error: any) {
         toast({
          title: "Failed to Join Room",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid Code",
        description: "Room codes must be 5 characters long.",
        variant: "destructive",
      });
    }
  };

  return (
     <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 overflow-hidden">
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
              alt="Join Fight Header"
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
              JOIN FIGHT
            </h2>
          </div>

          <form onSubmit={handleJoinRoom} className="w-full max-w-lg space-y-6">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 w-48 shrink-0 text-[#9c6d43] font-bold text-lg">
                PIRATE CREW NAME
                 <Image
                    className="rounded-[100px]"
                    src="/tooltip-icon.png"
                    alt="Tooltip"
                    width={18}
                    height={18}
                  />
              </label>
              <Input
                placeholder="ENTER PIRATES CREW NAME"
                value={displayName}
                onChange={handleNameChange}
                className="bg-[#cba47e] border-[#9c6d43] border-2 placeholder:text-[#8c5d33] text-[#6b451e] font-bold text-center text-lg h-12 rounded-full"
              />
            </div>
             <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 w-48 shrink-0 text-[#9c6d43] font-bold text-lg">
                JOIN ID
                 <Image
                    className="rounded-[100px]"
                    src="/tooltip-icon.png"
                    alt="Tooltip"
                    width={18}
                    height={18}
                  />
              </label>
              <Input
                placeholder="ENTER FIGHT ID"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="bg-[#cba47e] border-[#9c6d43] border-2 placeholder:text-[#8c5d33] text-[#6b451e] font-bold text-center text-lg h-12 rounded-full tracking-[0.2em]"
              />
            </div>

            <p className="text-center text-[#9c6d43] text-sm font-bold">
                *NEW FIGHT? CLICK ON CREATE FIGHT BUTTON TO INVITE OTHERS INSTEAD.
            </p>

             <div className="flex justify-center gap-8 pt-4">
                <button type="button" onClick={handleCreateRoom} className="relative bg-transparent border-none p-0 w-[260px] h-[70px] disabled:opacity-50" disabled={!user}>
                    <Image
                    src="/head.png"
                    alt="Create Fight"
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
                    CREATE FIGHT
                    </span>
                </button>
                <button type="submit" className="relative bg-transparent border-none p-0 w-[260px] h-[70px] disabled:opacity-50" disabled={!user || roomCode.length !== 5}>
                     <Image
                        src="/head.png"
                        alt="Join Fight"
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
                    JOIN FIGHT
                    </span>
                </button>
            </div>
          </form>

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
    </div>
  );
}
