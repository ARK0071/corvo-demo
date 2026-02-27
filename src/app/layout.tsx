import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import AppLayout from "@/components/app-layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corvo – Corvus",
  description: "Procurement analyst with access to 20 specialized tools for spend analysis, benchmarking, and savings identification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <TooltipProvider>
            <AppLayout>{children}</AppLayout>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
