"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitFork, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export function ForkProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    if (!window.confirm("Fork this project? This will create a full copy you can edit independently.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/fork`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Fork failed" }));
        throw new Error(err.error ?? "Fork failed");
      }
      const json = await res.json() as { projectId: string };
      toast.success("Project forked");
      router.push(`/project/${json.projectId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fork failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button disabled={busy} onClick={onClick} type="button" variant="outline">
      {busy ? <Loader2 className="animate-spin" size={16} /> : <GitFork size={16} />}
      <span>{busy ? "Forking…" : "Fork"}</span>
    </Button>
  );
}
