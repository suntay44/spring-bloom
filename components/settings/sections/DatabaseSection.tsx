const DATABASE_OPTIONS = ["Managed Supabase", "Connect my own Supabase", "Decide later"] as const;

export function DatabaseSection() {
  return (
    <div className="grid gap-4">
      {DATABASE_OPTIONS.map((item, index) => (
        <div className="card p-5" key={item}>
          <label className="flex items-center gap-3 font-semibold">
            <input defaultChecked={index === 0} name="db" type="radio" /> {item}
          </label>
          {index === 0 ? (
            <div className="ml-7 mt-3 text-sm font-bold text-slate-300">
              Your database is provisioned and managed for you.{" "}
              <a className="text-purple-300 underline underline-offset-2" href="#" onClick={(event) => event.preventDefault()}>
                View database dashboard ↗
              </a>
              <span className="ml-2 text-slate-500">(available after backend is wired)</span>
            </div>
          ) : null}
        </div>
      ))}
      <div className="card p-5">
        <label className="field"><span>Supabase URL</span><input placeholder="https://project.supabase.co" /></label>
        <label className="field"><span>Anon key</span><input placeholder="Paste key later" /></label>
      </div>
    </div>
  );
}
