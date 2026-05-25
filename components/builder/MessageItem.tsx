import { ArtifactCard } from "./ArtifactCard";
import { ScopingQuestionsCard } from "./ScopingQuestionsCard";
import { PlanCard } from "./PlanCard";
import type { UIMessage } from "ai";
import { extractPreamble, hasArtifact, parseArtifacts } from "@/lib/ai/artifact-parser";
import type { MockMessage } from "@/lib/mock/messages";

type MessageItemMessage = MockMessage | UIMessage;

function getMessageText(message: MessageItemMessage): string {
  if ("content" in message) return message.content;
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export interface MessageItemProps {
  message:    MessageItemMessage;
  // G1: when this is a plan-mode message, these handlers let PlanCard
  // approve or discard. Optional — defaults to no-op for read-only contexts
  // (e.g. mock messages, history view, etc.).
  onApprovePlan?:  (planId: string, markdown: string) => Promise<void> | void;
  onDiscardPlan?:  (planId: string) => void;
}

export function MessageItem({ message, onApprovePlan, onDiscardPlan }: MessageItemProps) {
  const content = getMessageText(message);

  if (message.role === "user") {
    return <div className="user-bubble">{content}</div>;
  }

  // Scoping questions card (Emergent-style structured Q&A)
  if ("questions" in message && message.questions && message.questions.length > 0) {
    return (
      <ScopingQuestionsCard
        content={content}
        questions={message.questions}
        onSubmit={() => {/* mock messages are read-only */}}
      />
    );
  }

  // G1: Plan-mode messages render as an editable PlanCard.
  if (
    "mode" in message && message.mode === "plan" &&
    "planId" in message && typeof message.planId === "string"
  ) {
    const status = (message.planStatus ?? "draft") as "draft" | "approved" | "executed" | "discarded";
    const planId = message.planId;
    return (
      <PlanCard
        initialMarkdown={content}
        status={status}
        readOnly={status !== "draft" || !onApprovePlan}
        onApprove={async (md) => onApprovePlan?.(planId, md)}
        onDiscard={() => onDiscardPlan?.(planId)}
      />
    );
  }

  const artifacts = "artifacts" in message ? message.artifacts : parseArtifacts(content);
  const assistantText = hasArtifact(content) ? extractPreamble(content) : content;

  return (
    <div className="assistant-block">
      <p className="assistant-copy">{assistantText}</p>
      {artifacts && artifacts.length > 0 ? <ArtifactCard artifacts={artifacts} defaultExpanded /> : null}
    </div>
  );
}
