import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Head } from "nextra/components";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shard.sh"),
  title: {
    default: "Shard Launcher",
    template: "%s | Shard Launcher",
  },
  description: "A minimal, content-addressed Minecraft launcher focused on stability and reproducibility",
  applicationName: "Shard Launcher",
  generator: "Next.js",
  twitter: {
    card: "summary_large_image",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Shard Launcher",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        <meta name="theme-color" content="#0c0b0a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <body className="min-h-dvh bg-mesh-subtle">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
