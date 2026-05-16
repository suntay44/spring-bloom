const METRICS = [
  { label: "Credits used", value: "85" },
  { label: "Build time", value: "6m 12s" },
  { label: "Review pass", value: "91%" },
  { label: "Sessions", value: "124" },
  { label: "Signups", value: "18" },
  { label: "Runtime errors", value: "2" }
] as const;

export function AnalyticsPanel() {
  return (
    <div className="workspace-panel">
      <h2>Build and product analytics</h2>
      <div className="metric-grid">
        {METRICS.map(({ label, value }) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}
