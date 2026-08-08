import Link from "next/link";
import { listGames } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const games = await listGames();
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Real-game candidates</h1>
      <ul className="space-y-1">
        {games.map((name) => (
          <li key={name}>
            <Link className="underline underline-offset-4" href={`/confirm/${name}`}>
              {name}
            </Link>
          </li>
        ))}
      </ul>
      {games.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nothing under <code>$CHESSLAB_DATA_DIR/realgames</code>. Check <code>.env.local</code>.
        </p>
      )}
    </main>
  );
}
