"use client";

import { useState } from "react";
import { CheckCircle2, Clock, FileText, Loader2, Terminal } from "lucide-react";
import type { ParsedArtifact } from "@/lib/ai/artifact-parser";
import type { MockArtifact } from "@/lib/mock/messages";

const STATUS_ICON: Record<MockArtifact["status"], React.ReactNode> = {
  complete: <CheckCircle2 color="var(--green)" size={14} />,
  streaming: <Loader2 className="animate-spin text-purple-400" size={14} />,
  queued: <Clock className="text-slate-500" size={14} />,
  error: <span className="text-xs font-bold text-rose-400">ERR</span>
};

type ArtifactCardProps = {
  artifacts: MockArtifact[] | ParsedArtifact[];
  defaultExpanded?: boolean;
};

type DisplayArtifact = MockArtifact;

function toDisplayArtifacts(artifacts: MockArtifact[] | ParsedArtifact[]): DisplayArtifact[] {
  return artifacts.flatMap((artifact) => {
    if ("actions" in artifact) {
      return artifact.actions.map((action) => ({
        type: action.type,
        path: action.filePath,
        command: action.type === "shell" || action.type === "start" ? action.content : undefined,
        status: "complete" as const,
      }));
    }

    return artifact;
  });
}

export function ArtifactCard({ artifacts, defaultExpanded = false }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const displayArtifacts = toDisplayArtifacts(artifacts);
  const complete = displayArtifacts.filter((artifact) => artifact.status === "complete").length;

  return (
    <div className="result-card">
      <div className="result-card-head">
        <strong>{complete}/{displayArtifacts.length} files generated</strong>
        <button aria-label={expanded ? "Collapse artifacts" : "Expand artifacts"} onClick={() => setExpanded((value) => !value)} type="button">
          {expanded ? "−" : "+"}
        </button>
      </div>
      {expanded ? (
        <div className="space-y-2 px-5 py-3">
          {displayArtifacts.map((artifact, index) => (
            <div className="flex items-center gap-2 text-sm" key={`${artifact.path ?? artifact.command}-${index}`}>
              {artifact.type === "shell" ? <Terminal size={14} /> : <FileText size={14} />}
              <span className="font-mono">{artifact.path ?? artifact.command}</span>
              <span className="ml-auto">{STATUS_ICON[artifact.status]}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
