import { ArtifactCard } from "./ArtifactCard";
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

  const artifacts = "artifacts" in message ? message.artifacts : parseArtifacts(content);
  const assistantText = hasArtifact(content) ? extractPreamble(content) : content;

  return (
    <div className="assistant-block">
      <p className="assistant-copy">{assistantText}</p>
      {artifacts && artifacts.length > 0 ? <ArtifactCard artifacts={artifacts} defaultExpanded /> : null}
    </div>
  );
}
