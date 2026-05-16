export function BriefFields({ title, fields, values }: { title: string; fields: string[]; values: string[] }) {
  return (
    <div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="mt-5 grid gap-4">
        {fields.map((field, index) => (
          <label className="field" key={field}>
            <span>{field}</span>
            <input defaultValue={values[index] ?? ""} />
          </label>
        ))}
      </div>
    </div>
  );
}
