/** One line per thing in every list — name, facts, one control; the same frame on every page. */
export function ListRow({ id, dim = false, children }: { id?: string; dim?: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`border-border group hover:bg-muted/20 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
        dim ? "opacity-60" : ""
      }`}
      id={id}
    >
      {children}
    </li>
  );
}
