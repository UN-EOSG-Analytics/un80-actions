import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AnimatedCornerLogo } from "@/components/AnimatedCornerLogo";
import Footer from "@/components/Footer";
import { Providers } from "@/components/Providers";
import ModalHandler from "@/components/ModalHandler";

// https://fonts.google.com/specimen/Roboto
// 100 (Thin), 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold), 900 (Black)
const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

const siteUrl = "https://un80actions.un.org";
const description =
  "This Dashboard complements the UN80 Initiative Action Plan. It provides a consolidated reference of the work packages across the three UN80 Initiative workstreams. The Dashboard shows the designated leads for each work package, along with the corresponding indicative actions, as drawn from the Secretary-General's reports on the UN80 Initiative [and the Action Plan and its annex].";

export const metadata: Metadata = {
  title: "UN80 Initiative Actions Dashboard",
  description,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "UN80 Initiative Actions Dashboard",
    description,
    url: siteUrl,
    siteName: "UN80 Initiative Actions Dashboard",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.className} antialiased`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <AnimatedCornerLogo />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </Providers>
        <Suspense fallback={null}>
          <ModalHandler />
        </Suspense>
        <GoogleAnalytics gaId="G-7BS4GDJ7ZQ" />
      </body>
    </html>
  );
}
