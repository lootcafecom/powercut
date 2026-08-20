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
        className="rounded-md border border-alert/40 bg-alert/5 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-alert hover:bg-alert/10"
      >
        Report a power cut
      </button>
    );
  }

  if (status === "done") {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        Thanks — your report has been added. It&rsquo;ll show up in the
        community reports below.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-line bg-white p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Report a power cut
      </p>
      <p className="mt-1 text-xs text-muted">
        This is a crowd signal, not an official report — used to flag
        possible unscheduled outages nobody has announced yet.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={localityId}
          onChange={(e) => setLocalityId(e.target.value)}
          required
          className="flex-1 rounded-md border border-line px-3 py-2 text-sm focus:border-signal focus:outline-none"
        >
          <option value="">Select your locality</option>
          {localities.map((l) => (
            <option key={l.id} value={l.id}>
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
          className="flex-1 rounded-md border border-line px-3 py-2 text-sm focus:border-signal focus:outline-none"
        />
      </div>
      {errorMsg && <p className="mt-2 text-xs text-alert">{errorMsg}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={status === "pending" || !localityId}
          className="rounded-md bg-alert px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-alert/90 disabled:opacity-50"
        >
          {status === "pending" ? "Submitting…" : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
