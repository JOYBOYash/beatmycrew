import RoomPage from "@/components/room-page";

export default function Page({ params }: { params: { roomId: string } }) {
  return (
    <main className="container mx-auto py-8 px-4">
      <RoomPage roomId={params.roomId} />
    </main>
  );
}
