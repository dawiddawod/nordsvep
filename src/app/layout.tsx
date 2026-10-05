import type { Metadata, Viewport } from "next";
import { Arimo } from "next/font/google";
import "./globals.css";

const arimo = Arimo({
  variable: "--font-arimo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NordSvep",
  description: "Swipe through every job on Platsbanken.",
};

export const viewport: Viewport = {
  themeColor: "#191a1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${arimo.variable} h-full font-sans antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
