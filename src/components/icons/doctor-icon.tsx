
import { cn } from "@/lib/utils";

export const DoctorIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    aria-label="Doctor Icon"
  >
    <path d="M12 10V4a2 2 0 0 0-4 0v6" />
    <path d="M12 10h4" />
    <path d="M14 8v4" />
    <path d="m20 10-4.5 4.5" />
    <path d="m4 10 4.5 4.5" />
    <path d="M12 21a7 7 0 0 0-7-7h14a7 7 0 0 0-7 7Z" />
  </svg>
);
