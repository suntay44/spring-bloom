import type { ReviewFinding } from "@/lib/mock/reviews";
import type { SecurityFinding } from "@/lib/mock/security";

type FindingItem = ReviewFinding | SecurityFinding;

type FindingsPanelProps = {
  title: string;
  items: FindingItem[];
};

export function FindingsPanel({ title, items }: FindingsPanelProps) {
  return (
    <div className="workspace-panel">
      <h2>{title}</h2>
      <div className="finding-list">
        {items.map((item) => (
          <article key={item.title}>
            <span>{item.severity}</span>
            <strong>{item.title}</strong>
            <small>{item.file}</small>
          </article>
        ))}
      </div>
    </div>
  );
}
