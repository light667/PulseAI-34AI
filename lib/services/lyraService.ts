export interface LyraMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export async function sendLyraMessage(
  message: string,
  history: LyraMessage[],
  language = "fr"
): Promise<string> {
  const res = await fetch("/api/lyra", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Lyra request failed");
  }
  const data = await res.json();
  return data.reply as string;
}
