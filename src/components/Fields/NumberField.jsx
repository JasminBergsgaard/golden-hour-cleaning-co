export default function NumberField({
  label,
  value,        // numeric value from parent
  setValue,
  min = 0,
  step = 1,
}) {
  // Convert numeric 0 into empty string for display
  const displayValue = value === 0 ? "" : value;

  return (
    <label className="block text-sm">
      <span className="text-stone-700">{label}</span>

      <input
        type="number"
        min={min}
        step={step}
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value;

          if (raw === "") {
            // Show blank, but do NOT overwrite the real numeric state yet
            setValue(0);
          } else {
            setValue(parseInt(raw, 10));
          }
        }}
        className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
    </label>
  );
}
