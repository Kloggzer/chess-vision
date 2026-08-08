import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "chesslab relabel",
  description: "Local review front-end for chesslab real-game candidates.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark font-sans">
      <body className="mx-auto max-w-5xl px-6 py-8">{children}</body>
    </html>
  );
}
