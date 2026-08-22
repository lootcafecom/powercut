"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Locality {
  id: number;
  name: string;
}

export function ReportOutageForm({ localities }: { localities: Locality[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localityId, setLocalityId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!localityId) return;
    setStatus("pending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localityId: Number(localityId),
          description: description || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Something went wrong. Try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
      setDescription("");
      router.refresh();
    } catch {
      setErrorMsg("Network error. Try again.");
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-pink/40 bg-pink/8 px-4 py-2 text-sm font-bold text-pink hover:shadow-[0_0_20px_rgba(248,113,113,0.3)] transition-shadow"
      >
        Report a power cut
      </button>
    );
  }

  if (status === "done") {
    return (
      <div className="glass border-mint/30 bg-mint/10 p-4 text-sm text-mint">
        Thanks — your report has been added. It&rsquo;ll show up in the
        community reports above.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass w-full p-4 sm:w-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-dim">
        Report a power cut
      </p>
      <p className="mt-1 text-xs text-gray-dim">
        This is a crowd signal, not an official report — used to flag
        possible unscheduled outages nobody has announced yet.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={localityId}
          onChange={(e) => setLocalityId(e.target.value)}
          required
          className="flex-1 rounded-md border border-glass-border bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-amber-status focus:outline-none"
        >
          <option value="">Select your locality</option>
          {localities.map((l) => (
            <option key={l.id} value={l.id} className="text-ink">
              {l.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note"
          maxLength={300}
          className="flex-1 rounded-md border border-glass-border bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-gray-dim focus:border-amber-status focus:outline-none"
        />
      </div>
      {errorMsg && <p className="mt-2 text-xs text-pink">{errorMsg}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={status === "pending" || !localityId}
          className="rounded-md bg-pink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:brightness-90 disabled:opacity-50"
        >
          {status === "pending" ? "Submitting…" : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-dim hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
