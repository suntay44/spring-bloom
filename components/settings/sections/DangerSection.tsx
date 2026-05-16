export function DangerSection() {
  return (
    <div className="card border-rose-900 p-6">
      <h2 className="text-2xl font-semibold text-rose-300">Danger Zone</h2>
      <p className="mt-2 text-slate-300">Destructive actions stay disabled in the mock UI.</p>
      <button className="button secondary mt-5" disabled type="button">Delete workspace</button>
    </div>
  );
}
