import { ArtifactCard } from "./ArtifactCard";
import { ScopingQuestionsCard } from "./ScopingQuestionsCard";
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

export function MessageItem({ message }: { message: MessageItemMessage }) {
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
