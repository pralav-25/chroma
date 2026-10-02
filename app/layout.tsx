import type { Metadata } from "next";
import "./globals.css";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined);
export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: "/" } } : {}),
  title: "CHROMA — A playground for color and motion",
  description:
    "Create your own animated shader art. Explore curated presets, shape color in real time, and export high-resolution artwork from your browser.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "CHROMA — A playground for color and motion",
    description:
      "Create animated shader art, edit palettes in real time, and export up to 4K PNG. A browser-based visual studio by Pralav.",
    ...(siteUrl ? { url: siteUrl } : {}),
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
