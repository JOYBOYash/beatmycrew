
import { cn } from "@/lib/utils";

export const ShipwrightIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    aria-label="Shipwright Icon"
  >
    <path d="M14.5 2.5a2.5 2.5 0 0 0-3 5" />
    <path d="M12 12 2 22" />
    <path d="m22 2-2 2-7.5 7.5" />
    <path d="m14 6 6 6" />
  </svg>
);
