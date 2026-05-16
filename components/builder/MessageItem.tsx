import { ArtifactCard } from "./ArtifactCard";
import type { MockMessage } from "@/lib/mock/messages";

export function MessageItem({ message }: { message: MockMessage }) {
  if (message.role === "user") {
    return <div className="user-bubble">{message.content}</div>;
  }

  return (
    <div className="assistant-block">
      <p className="assistant-copy">{message.content}</p>
      {message.artifacts && message.artifacts.length > 0 ? <ArtifactCard artifacts={message.artifacts} defaultExpanded /> : null}
    </div>
  );
}
