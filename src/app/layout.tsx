import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ThemeApplier from "@/components/ThemeApplier";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NearSign - Meet people who communicate like you",
  description: "A friend-finding app for Deaf/HoH users to connect with nearby people who share communication preferences, interests, and comfort levels.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NearSign",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#e8f3ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ThemeApplier />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
