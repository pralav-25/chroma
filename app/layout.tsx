import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://chroma-visual-studio.websites4u.chatgpt.site"),
  title: "CHROMA — A playground for color and motion",
  description:
    "Create your own animated shader art. Explore curated presets, shape color in real time, and export high-resolution artwork from your browser.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  alternates: { canonical: "/" },
  openGraph: {
    title: "CHROMA — A playground for color and motion",
    description:
      "Create animated shader art, edit palettes in real time, and export up to 4K PNG. A browser-based visual studio by Pralav.",
    url: "/",
    siteName: "CHROMA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CHROMA — A playground for color and motion",
    description: "Create, save, and export original shader artwork in your browser.",
  },
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
