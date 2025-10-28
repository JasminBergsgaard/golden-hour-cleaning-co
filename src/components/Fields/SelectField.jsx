export default function SelectField({ label, value, setValue, options }) {
  return (
    <label className="block text-sm">
      {label && <span className="text-stone-700">{label}</span>}
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
