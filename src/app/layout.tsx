import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/HeaderBar";
import { Footer } from "@/components/Footer";
import ModalHandler from "@/features/actions/ui/ModalHandler";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/constants/site";
import { getCurrentUser } from "@/features/auth/service";
import "./globals.css";

// https://fonts.google.com/specimen/Roboto
// 100 (Thin), 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold), 900 (Black)
const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#009edb", // UN Blue
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${roboto.className} antialiased`}>
      <body>
        <div className="flex min-h-screen flex-col">
          <Header user={user} />
          {children}
          <Footer />
        </div>
        <Suspense fallback={null}>
          <ModalHandler />
        </Suspense>
        <GoogleAnalytics gaId="G-XYZ" />
      </body>
    </html>
  );
}
