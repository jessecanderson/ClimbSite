"use client";

import { useState } from "react";
import { Clipboard, Check } from "lucide-react";

export function ShareTripButton({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="ghost-button" type="button" onClick={copySummary}>
      {copied ? <Check size={17} /> : <Clipboard size={17} />}
      {copied ? "Copied" : "Copy trip summary"}
    </button>
  );
}
