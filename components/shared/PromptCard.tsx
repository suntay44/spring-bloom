import type { ReactNode } from "react";

type PromptCardProps = {
  tabs: ReactNode;
  children: ReactNode;
};

export function PromptCard({ tabs, children }: PromptCardProps) {
  return (
    <div className="prompt-card">
      <div className="app-tabs">{tabs}</div>
      <div className="prompt-body">{children}</div>
    </div>
  );
}
