export function Badge({ icon, label }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2">
      <span className="grid h-5 w-5 place-items-center rounded-md bg-amber-100/80">{icon}</span>
      <span className="text-[13px] font-medium text-stone-800">{label}</span>
    </div>
  );
}

export function Step({ number, title, desc }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-stone-900 font-semibold">{number}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-stone-700">{desc}</p>
    </div>
  );
}

export function Row({ label, a, b }) {
  return (
    <tr>
      <td className="px-4 py-3 text-stone-700">{label}</td>
      <td className="px-4 py-3 font-medium text-stone-900">{a}</td>
      <td className="px-4 py-3 text-stone-600">{b}</td>
    </tr>
  );
}

export function BadgeDot() {
  return (
    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
      <span className="h-2 w-2 rounded-full bg-amber-400" />
    </span>
  );
}