"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Loader2, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomDomainsSection } from "@/components/builder/CustomDomainsSection";
import { DeploymentHistory } from "@/components/builder/DeploymentHistory";

type PublishModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
};

type Phase = "idle" | "cloudflare" | "build" | "uploading" | "deploy" | "done" | "error";

interface BuildEvent {
  stdout:      string;
  stderr:      string;
  exit_code:   number;
  duration_ms: number;
}

interface FilesEvent { count: number; total_bytes: number }
interface DeployEvent { url: string; deployment_id: string; file_count: number }
interface DoneEvent { success: boolean; url: string; deployment_id: string; total_duration_ms: number }

export function PublishModal({ open, onOpenChange, projectId }: PublishModalProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [phaseMessage, setPhaseMessage] = useState<string>("");
  const [buildEvent, setBuildEvent] = useState<BuildEvent | null>(null);
  const [filesEvent, setFilesEvent] = useState<FilesEvent | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const inFlight = !["idle", "done", "error"].includes(phase);

  async function startPublish() {
    setPhase("cloudflare");
    setPhaseMessage("Starting publish...");
    setErrorMsg(null);
    setUrl(null);
    setBuildEvent(null);
    setFilesEvent(null);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/publish/stream", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ projectId }),
        signal:  ac.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({ error: "Publish failed" })) as { error?: string };
        setErrorMsg(errBody.error ?? "Publish failed");
        setPhase("error");
        return;
      }

      await consumeSse(res.body, {
        onPhase: (data) => {
          setPhase(data.phase as Phase);
          setPhaseMessage(data.message);
        },
        onBuild:  (data) => { setBuildEvent(data); if (data.exit_code !== 0) setLogsOpen(true); },
        onFiles:  (data) => setFilesEvent(data),
        onDeploy: (data) => setUrl(data.url),
        onDone:   (data) => { setUrl(data.url); setPhase("done"); },
        onError:  (data) => { setErrorMsg(data.message); setPhase("error"); setLogsOpen(true); },
      });
    } catch (err) {
      if (ac.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Network error";
      setErrorMsg(msg);
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }

  function handleCopy() {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenChange(next: boolean) {
    if (inFlight) return;
    if (!next) {
      setPhase("idle");
      setUrl(null);
      setErrorMsg(null);
      setCopied(false);
      setBuildEvent(null);
      setFilesEvent(null);
      setLogsOpen(false);
      setPhaseMessage("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!inFlight}>
        <DialogHeader>
          <DialogTitle>Publish your app</DialogTitle>
          <DialogDescription>
            Builds your app and deploys it live to Cloudflare Pages.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Progress steps */}
          <ol className="flex flex-col gap-2 text-sm">
            <StepRow label="Cloudflare project"
              active={phase === "cloudflare"}
              done={["build", "uploading", "deploy", "done"].includes(phase)} />
            <StepRow label="Build"
              active={phase === "build"}
              done={["uploading", "deploy", "done"].includes(phase)} />
            <StepRow label="Upload"
              active={phase === "uploading"}
              done={["deploy", "done"].includes(phase)} />
            <StepRow label="Deploy"
              active={phase === "deploy"}
              done={phase === "done"} />
          </ol>

          {/* Live phase status */}
          {inFlight && phaseMessage && (
            <p className="text-xs text-muted-foreground italic">{phaseMessage}</p>
          )}

          {/* Build/file stats */}
          {(buildEvent || filesEvent) && (
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1 text-xs">
              {buildEvent && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Build</span>
                  <span className={buildEvent.exit_code === 0 ? "text-green-600" : "text-red-500"}>
                    {buildEvent.exit_code === 0 ? "succeeded" : `exited ${buildEvent.exit_code}`} · {(buildEvent.duration_ms / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
              {filesEvent && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Bundle</span>
                  <span>{filesEvent.count} files · {formatBytes(filesEvent.total_bytes)}</span>
                </div>
              )}
            </div>
          )}

          {/* Collapsible build log */}
          {buildEvent && (
            <div className="rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => setLogsOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-muted/40 text-xs"
              >
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Terminal size={11} /> Build log
                </span>
                {logsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {logsOpen && (
                <pre className="border-t bg-black/80 text-zinc-200 px-3 py-2 text-[10.5px] font-mono leading-relaxed overflow-x-auto max-h-64">
                  {(buildEvent.stdout || buildEvent.stderr || "(no output)").trim()}
                </pre>
              )}
            </div>
          )}

          {/* Success state */}
          {phase === "done" && url ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
              <span className="text-xs text-muted-foreground">Your app is live at</span>
              <div className="flex items-center gap-2">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 truncate text-sm font-medium text-primary underline">
                  {url}
                </a>
                <Button type="button" variant="outline" size="icon-sm" onClick={handleCopy} aria-label="Copy published URL">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              {copied ? <span className="text-xs text-green-600">Copied!</span> : null}
            </div>
          ) : null}

          {/* Custom domains */}
          {phase === "done" && url ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <CustomDomainsSection
                projectId={projectId}
                defaultCnameTarget={new URL(url).hostname}
              />
            </div>
          ) : null}

          {/* Deployment history + rollback (R4-2) — shown once anything is published */}
          {phase === "done" && url ? (
            <DeploymentHistory projectId={projectId} />
          ) : null}

          {/* Error */}
          {phase === "error" && errorMsg ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {phase === "idle" ? (
              <Button type="button" onClick={startPublish}>Publish</Button>
            ) : null}
            {inFlight ? (
              <Button type="button" disabled>
                <Loader2 className="animate-spin" size={16} /> Publishing...
              </Button>
            ) : null}
            {phase === "error" ? (
              <Button type="button" onClick={startPublish}>Retry</Button>
            ) : null}
            {phase === "done" ? (
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SSE consumer ───────────────────────────────────────────────────────────

interface SseHandlers {
  onPhase:  (d: { phase: string; message: string }) => void
  onBuild:  (d: BuildEvent) => void
  onFiles:  (d: FilesEvent) => void
  onDeploy: (d: DeployEvent) => void
  onDone:   (d: DoneEvent) => void
  onError:  (d: { message: string; detail?: string }) => void
}

async function consumeSse(body: ReadableStream<Uint8Array>, h: SseHandlers): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE events are separated by a blank line
    let idx: number
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      let event = "message"
      let dataText = ""
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        else if (line.startsWith("data:")) dataText += line.slice(5).trim()
      }
      if (!dataText) continue

      let data: unknown
      try { data = JSON.parse(dataText) } catch { continue }

      switch (event) {
        case "phase":  h.onPhase(data as { phase: string; message: string }); break
        case "build":  h.onBuild(data as BuildEvent); break
        case "files":  h.onFiles(data as FilesEvent); break
        case "deploy": h.onDeploy(data as DeployEvent); break
        case "done":   h.onDone(data as DoneEvent); break
        case "error":  h.onError(data as { message: string }); break
      }
    }
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

// ─── Step row ───────────────────────────────────────────────────────────────

function StepRow({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <Check size={16} className="text-green-600" />
      ) : active ? (
        <Loader2 size={16} className="animate-spin text-primary" />
      ) : (
        <span className="size-4 rounded-full border" />
      )}
      <span className={done ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </li>
  );
}
