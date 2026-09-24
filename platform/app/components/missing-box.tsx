/** Steht, wo ein Bild nicht geladen hat — der Text nennt, was fehlt. */
export function MissingBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-destructive/60 bg-destructive/10 text-destructive flex h-full w-full items-center justify-center border p-3 text-center font-mono text-sm">
      {children}
    </div>
  );
}
