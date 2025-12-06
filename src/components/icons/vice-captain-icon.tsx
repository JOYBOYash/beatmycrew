import { cn } from "@/lib/utils";

export const ViceCaptainIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    aria-label="Vice-Captain Icon"
  >
    <path d="m14.5 2.5-8 8" />
    <path d="M14 3h7v7" />
    <path d="m5.5 16.5 8-8" />
    <path d="M18 10h.01" />
    <path d="M21 7h.01" />
    <path d="M10 14h.01" />
    <path d="M7 17h.01" />
    <path d="m9.5 2.5 8 8" />
    <path d="M10 3H3v7" />
  </svg>
);
