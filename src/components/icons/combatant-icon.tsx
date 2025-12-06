
import { cn } from "@/lib/utils";

export const CombatantIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    aria-label="Combatant Icon"
  >
    <path d="M14.5 2.5a2.5 2.5 0 0 0-3 5" />
    <path d="M9.5 7.5a2.5 2.5 0 0 1 3-5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m3 14 9.6-9.6" />
    <path d="M14 14h7v7" />
    <path d="M3 3v7h7" />
  </svg>
);
