import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface HeatBadgeProps {
  attendees: number;
  capacity?: number | null;
  className?: string;
}

export const HeatBadge = ({ attendees, capacity, className }: HeatBadgeProps) => {
  const ratio = capacity ? attendees / capacity : attendees / 100;

  let label = "Warm";
  let bg = "bg-gradient-warm";
  let pulse = "";

  if (ratio >= 0.7 || attendees >= 100) {
    label = "Inferno";
    bg = "bg-gradient-inferno";
    pulse = "animate-pulse";
  } else if (ratio >= 0.4 || attendees >= 40) {
    label = "Hot";
    bg = "bg-gradient-hot";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg",
        bg,
        pulse,
        className
      )}
    >
      <Flame className="h-3 w-3" />
      {label}
    </span>
  );
};
