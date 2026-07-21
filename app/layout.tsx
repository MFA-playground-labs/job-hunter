import type { Metadata } from "next";

import "./globals.css";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "CareerOS",
  description: "Verified facts, job scanning, and pipeline management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <div className="app-shell min-h-screen">
          <Nav />
          <main className="app-main min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
