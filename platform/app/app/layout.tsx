import type { Metadata } from "next";
import "./globals.css";
import { queueRows, splitQueues } from "@/lib/queues";
import { Shell } from "./shell";

export const metadata: Metadata = {
  title: "chesslab",
  description: "Local review front-end for chesslab real-game candidates.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const queues = splitQueues(await queueRows());
  return (
    <html className="dark font-sans" lang="de">
      <body>
        <Shell counts={{ zuege: queues.confirm.length, labeln: queues.labeln.length }}>{children}</Shell>
      </body>
    </html>
  );
}
