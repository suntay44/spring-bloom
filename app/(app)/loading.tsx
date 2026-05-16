export default function Loading() {
  return (
    <section className="app-content">
      <div className="grid gap-5">
        {[1, 2, 3].map((i) => (
          <div className="card h-32 animate-pulse bg-zinc-900" key={i} />
        ))}
      </div>
    </section>
  );
}
