"use client";

interface LyraSuggestionsProps {
  onSelect: (text: string) => void;
}

const suggestions = [
  { emoji: "😔", text: "I feel anxious" },
  { emoji: "😴", text: "I can't sleep" },
  { emoji: "😢", text: "I feel alone" },
  { emoji: "😤", text: "I'm stressed" },
];

export default function LyraSuggestions({ onSelect }: LyraSuggestionsProps) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button
          key={s.text}
          onClick={() => onSelect(s.text)}
          className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--lyra-violet)] hover:text-[var(--lyra-violet)]"
        >
          {s.emoji} {s.text}
        </button>
      ))}
    </div>
  );
}
