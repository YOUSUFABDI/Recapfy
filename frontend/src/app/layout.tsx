import type { Metadata } from "next";
import Script from "next/script";

import { CONFIG } from "@/../global-config";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Head from "./head";
import Providers from "./providers";
import { Suspense } from "react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: CONFIG.appName,
  description: "The best trading tool!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Head />
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <Suspense>
          <Script
            id="theme-init"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
              (function() {
                try {
                  var setting = localStorage.getItem('ui:color-scheme') || 'system';
                  var mode = setting;
                  if (setting === 'system') {
                    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', mode);
                  document.documentElement.style.colorScheme = mode;
                } catch (e) {}
              })();
            `,
            }}
          />

          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
