import { networkInterfaces } from "node:os";
import { CHUNK_BYTES, ingestToken } from "@/lib/ingest/ingest";
import { desktopBinary } from "@/lib/chain/cli-args";
import { PageTitle } from "@/app/page-title";
import { TransferBoard } from "./board";

export const dynamic = "force-dynamic";

/** Shown because discovery may fail (client isolation, guest VLAN, firewall) and then the user needs
 *  the one thing the phone cannot guess. Loopback is filtered out. */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

export default async function TransfersPage() {
  const token = await ingestToken();
  const port = process.env.PORT ?? "3000";

  return (
    <main className="space-y-4">
      <PageTitle title="Transfers" why="Was das Handy hierher schickt: Kopplung, laufende Übertragungen und der Pack-Job." />

      <details className="border-border rounded-lg border px-3 py-2 text-sm">
        <summary className="cursor-pointer max-sm:min-h-11">
          Kopplung <span className="text-muted-foreground font-mono select-all">{token}</span>
        </summary>
        <div className="text-muted-foreground mt-2 space-y-1 text-xs">
          <p>
            Im Tracker unter <span className="font-mono">Settings → Transfer</span> eintragen. Das Handy findet den Server
            im WLAN selbst; der Token muss einmal stimmen.
          </p>
          <p>
            Findet die Suche nichts, die Adresse von Hand:{" "}
            {lanAddresses().map((address) => (
              <span className="mr-2 font-mono select-all" key={address}>
                http://{address}:{port}
              </span>
            ))}
          </p>
          <p>
            Chunk {(CHUNK_BYTES / (1024 * 1024)).toFixed(0)} MiB · Pack-Binary{" "}
            <span className="font-mono">{desktopBinary()}</span>
          </p>
        </div>
      </details>

      <TransferBoard />
    </main>
  );
}
