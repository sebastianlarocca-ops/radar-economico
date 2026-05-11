export function Section({
  title,
  chip,
  children,
}: {
  title: string;
  chip?: { text: string; tone?: "live" | "pending" };
  children: React.ReactNode;
}) {
  const chipColor = chip?.tone === "pending"
    ? "bg-amber-100 text-amber-800"
    : "bg-emerald-100 text-emerald-800";
  return (
    <section className="mt-6">
      <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2.5 flex items-center gap-2">
        <span>{title}</span>
        {chip && (
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${chipColor}`}>
            {chip.text}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}
