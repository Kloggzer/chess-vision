import type { Metadata } from "next";
import "./globals.css";
import { intakeCount } from "@/lib/chain/intake";
import { queueRows, splitQueues } from "@/lib/chain/queues";
import { Shell } from "./shell";

export const metadata: Metadata = {
  title: "chesslab",
  description: "Local review front-end for chesslab real-game candidates.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const rows = await queueRows();
  const queues = splitQueues(rows);
  return (
    <html className="dark font-sans" lang="de">
      <body>
        <Shell counts={{ zuege: queues.confirm.length, labeln: queues.labeln.length, einpflegen: intakeCount(rows) }}>{children}</Shell>
      </body>
    </html>
  );
}
