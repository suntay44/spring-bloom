const DIFF_LINES = [
  "+ Added dashboard shell and project navigation",
  "+ Added Kanban board columns and task cards",
  "- Removed starter template shopping code"
] as const;

export function DiffPanel() {
  return (
    <div className="workspace-panel">
      <h2>Latest run</h2>
      <p>12 files changed - +842 -119</p>
      <div className="diff-lines">
        {DIFF_LINES.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    </div>
  );
}
