import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { getSiteUrl } from "@/utils/siteUrl";

const spaceMono = localFont({
  src: "./fonts/space-mono-v17-latin_latin-ext-regular.woff2",
  variable: "--font-space-mono",
  display: "swap",
  adjustFontFallback: false,
});

const jetBrainsMono = localFont({
  src: "./fonts/jetbrains-mono-v24-cyrillic_cyrillic-ext_latin-regular.woff2",
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sphere",
    template: "%s | Sphere",
  },
  description:
    "Sphere is an experimental kanban board with a calm interface, fast interactions, and clear task context.",
  applicationName: "Sphere",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} ${jetBrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
