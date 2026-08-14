import { networkInterfaces } from "node:os";
import { CHUNK_BYTES, ingestToken } from "@/lib/ingest";
import { desktopBinary } from "@/lib/jobs";
import { TransferBoard } from "./board";

export const dynamic = "force-dynamic";

/**
 * The addresses the phone can reach this machine on.
 *
 * Shown because discovery is allowed to fail: a router with client isolation, a guest VLAN or a
 * firewall rule that was never added all end the same way, and then the user needs the one thing
 * the phone cannot guess. Loopback is filtered — an address that only this machine can reach is
 * worse than none on this page.
 */
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
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Transfers from the phone</h1>

      <section className="rounded-lg border p-4 text-sm space-y-2">
        <h2 className="font-medium">Pairing</h2>
        <p className="text-muted-foreground">
          Enter this in the tracker under <span className="font-mono">Settings → Transfer</span>. The phone
          finds the server on the Wi-Fi by itself; the token has to match once.
        </p>
        <p>
          Token: <span className="font-mono select-all">{token}</span>
        </p>
        <p className="text-muted-foreground">
          If the search finds nothing, the address by hand:{" "}
          {lanAddresses().map((address) => (
            <span className="font-mono mr-2 select-all" key={address}>
              http://{address}:{port}
            </span>
          ))}
        </p>
        <p className="text-muted-foreground">
          Chunk {(CHUNK_BYTES / (1024 * 1024)).toFixed(0)} MiB · pack binary{" "}
          <span className="font-mono">{desktopBinary()}</span>
        </p>
      </section>

      <TransferBoard />
    </main>
  );
}
