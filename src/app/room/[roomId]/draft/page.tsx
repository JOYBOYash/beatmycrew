'use client';
import { use } from 'react';
import RoomPage from "@/components/room-page";

export default function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);

  return (
    <main className="h-screen w-full">
      <RoomPage roomId={roomId} />
    </main>
  );
}
