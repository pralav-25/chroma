import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CHROMA — A playground for color and motion",
  description:
    "Create your own animated shader art. Explore curated presets, shape color in real time, and export high-resolution artwork from your browser.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>
        <a className="skip-link" href="#main">
          Skip to studio
        </a>
        {children}
      </body>
    </html>
  );
}
