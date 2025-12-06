import { cn } from "@/lib/utils";

export const CookIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    aria-label="Cook Icon"
  >
    <path d="M18 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.5a2.5 2.5 0 0 1-5 0H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2" />
    <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    <path d="M6 20v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
    <path d="M12 10v6" />
    <path d="M12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
  </svg>
);
