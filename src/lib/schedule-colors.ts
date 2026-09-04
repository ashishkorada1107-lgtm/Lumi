import type { ScheduledTimelineItem } from "@/lib/timeline";

export type ScheduleTone = {
  label: "Lab" | "Theory" | "Activity" | "Other";
  dot: string;
  softDot: string;
  accent: string;
  mutedText: string;
  weeklyCard: string;
  dailyCard: string;
  dailyBadge: string;
};

const tones: Record<ScheduleTone["label"], ScheduleTone> = {
  Lab: {
    label: "Lab",
    dot: "bg-cyan-400 border-cyan-300",
    softDot: "bg-cyan-950 border-cyan-500",
    accent: "border-l-cyan-400",
    mutedText: "text-cyan-200/70",
    weeklyCard:
      "border-cyan-700/60 border-l-cyan-400 bg-cyan-950/65 text-cyan-50 shadow-cyan-950/30",
    dailyCard:
      "border-cyan-800/60 border-l-cyan-400 bg-cyan-950/25 ring-cyan-500/15",
    dailyBadge: "border-cyan-700/60 text-cyan-300",
  },
  Theory: {
    label: "Theory",
    dot: "bg-indigo-400 border-indigo-300",
    softDot: "bg-indigo-950 border-indigo-500",
    accent: "border-l-indigo-400",
    mutedText: "text-indigo-200/70",
    weeklyCard:
      "border-indigo-700/60 border-l-indigo-400 bg-indigo-950/65 text-indigo-50 shadow-indigo-950/30",
    dailyCard:
      "border-indigo-800/60 border-l-indigo-400 bg-indigo-950/25 ring-indigo-500/15",
    dailyBadge: "border-indigo-700/60 text-indigo-300",
  },
  Activity: {
    label: "Activity",
    dot: "bg-amber-400 border-amber-300",
    softDot: "bg-amber-950 border-amber-500",
    accent: "border-l-amber-400",
    mutedText: "text-amber-200/70",
    weeklyCard:
      "border-amber-700/60 border-l-amber-400 bg-amber-950/60 text-amber-50 shadow-amber-950/30",
    dailyCard:
      "border-amber-800/60 border-l-amber-400 bg-amber-950/25 ring-amber-500/15",
    dailyBadge: "border-amber-700/60 text-amber-300",
  },
  Other: {
    label: "Other",
    dot: "bg-teal-400 border-teal-300",
    softDot: "bg-teal-950 border-teal-500",
    accent: "border-l-teal-400",
    mutedText: "text-teal-200/70",
    weeklyCard:
      "border-teal-700/60 border-l-teal-400 bg-teal-950/60 text-teal-50 shadow-teal-950/30",
    dailyCard:
      "border-teal-800/60 border-l-teal-400 bg-teal-950/25 ring-teal-500/15",
    dailyBadge: "border-teal-700/60 text-teal-300",
  },
};

export function getScheduleTone(title: string, kind?: ScheduledTimelineItem["type"]) {
  const normalized = title.toLowerCase();

  if (kind === "activity") return tones.Activity;

  if (
    /\b(lab|laboratory|practical|workshop|experiment|studio)\b/.test(normalized)
  ) {
    return tones.Lab;
  }

  if (/\b(seminar|project|tutorial|club|event|sports|exam)\b/.test(normalized)) {
    return tones.Other;
  }

  return tones.Theory;
}
