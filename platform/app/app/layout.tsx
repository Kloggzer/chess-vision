import type { Metadata } from "next";
import "./globals.css";
import { AutopilotStrip } from "./autopilot-strip";

export const metadata: Metadata = {
  title: "chesslab relabel",
  description: "Local review front-end for chesslab real-game candidates.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark font-sans">
      {/* The side margin is 48 px of a 390 px phone — a tenth of the screen the crops need. */}
      <body className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
        {/* On every page: the machine works whether or not a tab is open on the right one. */}
        <AutopilotStrip />
        {children}
      </body>
    </html>
  );
}
