import { cn } from "@/lib/utils";

const StrawHatIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-16 h-16", className)}
    aria-label="Straw Hat Icon"
  >
    <g>
      <path
        d="M50,15 C25,15 10,30 10,30 C10,30 20,45 50,45 C80,45 90,30 90,30 C90,30 75,15 50,15 Z"
        fill="#F4D03F"
        stroke="#A0522D"
        strokeWidth="3"
      />
      <path
        d="M10,30 C10,30 5,60 50,60 C95,60 90,30 90,30"
        fill="none"
        stroke="#A0522D"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="50" cy="28" rx="15" ry="5" fill="#E63946" />
      <path
        d="M5,58 C5,75 95,75 95,58 L10,30 L90,30 L95,58"
        fill="#F4D03F"
        stroke="#A0522D"
        strokeWidth="3"
      />
      <path
        d="M5,58 C5,75 95,75 95,58"
        fill="none"
        stroke="#A0522D"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

export const Logo = () => {
  return (
    <div className="flex flex-col items-center">
      <StrawHatIcon />
      <h1 className="text-4xl font-headline font-bold text-center mt-2">
        BeatMyCrew
      </h1>
      <p className="text-muted-foreground mt-2 text-center">
        Assemble your ultimate One Piece crew and get rated!
      </p>
    </div>
  );
};
