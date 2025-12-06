import { cn } from "@/lib/utils";

export const CaptainIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-6 h-6", className)}
    aria-label="Captain Icon"
  >
    <g transform="translate(0, 10)">
      <path
        d="M50,15 C25,15 10,30 10,30 C10,30 20,45 50,45 C80,45 90,30 90,30 C90,30 75,15 50,15 Z"
        fill="currentColor"
      />
      <ellipse cx="50" cy="28" rx="15" ry="5" fill="#E63946" />
      <path
        d="M5,58 C5,75 95,75 95,58 L10,30 L90,30 L95,58"
        fill="currentColor"
      />
    </g>
  </svg>
);
