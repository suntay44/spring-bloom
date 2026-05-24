"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomDomainsSection } from "@/components/builder/CustomDomainsSection";

type PublishModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
};

type Phase = "idle" | "publishing" | "done" | "error";

export function PublishModal({ open, onOpenChange, projectId }: PublishModalProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inFlight = phase === "publishing";

  async function startPublish() {
    setPhase("publishing");
    setErrorMsg(null);
    setUrl(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await res.json()) as { url?: string; error?: string; detail?: string };
      if (!res.ok || !data.url) {
        setErrorMsg(data.detail ?? data.error ?? "Publish failed");
        setPhase("error");
        return;
      }
      setUrl(data.url);
      setPhase("done");
    } catch {
      setErrorMsg("Network error — could not reach the publish service");
      setPhase("error");
    }
  }

  function handleCopy() {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenChange(next: boolean) {
    // Non-dismissable while the request is in flight
    if (inFlight) return;
    if (!next) {
      // Reset on close so the next open starts fresh
      setPhase("idle");
      setUrl(null);
      setErrorMsg(null);
      setCopied(false);
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
          <ol className="flex flex-col gap-2 text-sm">
            <StepRow
              label="Building"
              active={inFlight}
              done={phase === "done"}
            />
            <StepRow
              label="Uploading"
              active={inFlight}
              done={phase === "done"}
            />
            <StepRow
              label="Live"
              active={false}
              done={phase === "done"}
            />
          </ol>

          {phase === "done" && url ? (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
              <span className="text-xs text-muted-foreground">Your app is live at</span>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm font-medium text-primary underline"
                >
                  {url}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={handleCopy}
                  aria-label="Copy published URL"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              {copied ? (
                <span className="text-xs text-green-600">Copied!</span>
              ) : null}
            </div>
          ) : null}

          {/* Custom domains — shown once the project is published */}
          {phase === "done" && url ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <CustomDomainsSection
                projectId={projectId}
                defaultCnameTarget={new URL(url).hostname}
              />
            </div>
          ) : null}

          {phase === "error" && errorMsg ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            {phase === "idle" ? (
              <Button type="button" onClick={startPublish}>
                Publish
              </Button>
            ) : null}
            {inFlight ? (
              <Button type="button" disabled>
                <Loader2 className="animate-spin" size={16} /> Publishing...
              </Button>
            ) : null}
            {phase === "error" ? (
              <Button type="button" onClick={startPublish}>
                Retry
              </Button>
            ) : null}
            {phase === "done" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <Check size={16} className="text-green-600" />
      ) : active ? (
        <Loader2 size={16} className="animate-spin text-primary" />
      ) : (
        <span className="size-4 rounded-full border" />
      )}
      <span
        className={
          done
            ? "text-foreground"
            : active
              ? "text-foreground"
              : "text-muted-foreground"
        }
      >
        {label}
      </span>
    </li>
  );
}
