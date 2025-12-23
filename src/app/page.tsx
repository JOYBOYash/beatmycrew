
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 overflow-hidden">
      {/* Top Right Title */}
      <div className="absolute top-10 right-10">
        <Image
          src="/main-logo.png"
          alt="Beat My Crew Title"
          width={450}
          height={100}
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
        <div className="absolute inset-0 flex flex-col items-center justify-between py-14 px-20 text-center">
          {/* Welcome Header */}
          <div className="relative mb-6">
            <Image
              src="/head.png"
              alt="Welcome Header"
              width={300}
              height={80}
              className="mx-auto"
            />
            <h2
              className="absolute inset-0 flex items-center font-bold justify-center text-3xl font-bold"
              style={{
                background:
                  "linear-gradient(180deg, #b7341d 0%, #762112 50%, #5a1a0f 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              WELCOME
            </h2>
          </div>

          {/* How To Play */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#9c6d43] font-bold text-lg">HOW TO PLAY</span>
            <Image
              className="rounded-[100px]"
              src="/tooltip-icon.png"
              alt="Tooltip"
              width={18}
              height={18}
            />
          </div>

          <p className="text-[#9c6d43] text-2xl font-bold leading-relaxed max-w-xl">
            RANDOMLY PICK YOUR CREWMATES FROM THE HUGE WORLD OF ONE-PIECE,
            ASSIGN THEM KEY ROLES AND COMPARE/PIT THEM AGAINST YOUR FRIEND'S CREW. <br/>
            SEE WHO'S GOT THE BEST CREW!
          </p>

          {/* Why */}
          <div className="flex items-center gap-2 mt-6">
            <span className="text-[#9c6d43] text-lg">WHY</span>
            <Image
            className="rounded-[100px]"
              src="/tooltip-icon.png"
              alt="Tooltip"
              width={18}
              height={18}
            />
          </div>

          <p className="text-[#9c6d43] font-bold text-3xl mt-2">
            &apos;CUZ IT&apos;S FUN!
          </p>

          {/* Join Fight Button */}
          <Link href="/build" className="relative mt-10">
            <Image
              src="/head.png"
              alt="Join Fight"
              width={260}
              height={70}
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
          </Link>
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
