"use client";

export default function VideoBackground() {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden bg-black">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover opacity-50"
      >
        <source src="/bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
