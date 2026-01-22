import type { Metadata } from "next";
import { Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Source Sans 3 is the closest free alternative to Proxima Nova
const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pack to Light Analyzer",
  description: "Analyze pending shipments to find the optimal SKUs for your pick area",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sourceSans.variable} ${jetbrainsMono.variable} font-sans antialiased bg-white min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
