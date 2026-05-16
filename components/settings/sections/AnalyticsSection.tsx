const EVENTS = ["session_started", "signup_completed", "project_created", "key_feature_used", "runtime_error"] as const;

export function AnalyticsSection() {
  return (
    <div className="card p-6">
      <h2 className="text-2xl font-semibold">Generated app analytics enabled</h2>
      <p className="mt-2 text-slate-300">Anonymous event collection by default. PII collection disabled.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {EVENTS.map((event) => <span className="pill" key={event}>{event}</span>)}
      </div>
    </div>
  );
}
