"use client";

import { useState } from "react";
import { Clipboard, Check } from "lucide-react";

export function ShareTripButton({ summary }: { summary: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copySummary() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = summary;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Copy command failed");
      }

      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    window.setTimeout(() => setStatus("idle"), 2400);
  }

  return (
    <button className="ghost-button" type="button" onClick={copySummary} aria-live="polite">
      {status === "copied" ? <Check size={17} /> : <Clipboard size={17} />}
      {status === "copied"
        ? "Copied"
        : status === "failed"
          ? "Copy failed—try again"
          : "Copy trip summary"}
    </button>
  );
}
