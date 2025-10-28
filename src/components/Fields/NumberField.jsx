export default function NumberField({ label, value, setValue, min = 0, step = 1 }) {
  return (
    <label className="block text-sm">
      <span className="text-stone-700">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => setValue(parseInt(e.target.value || "0"))}
        className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
    </label>
  );
}