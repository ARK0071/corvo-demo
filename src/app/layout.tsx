import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ProfileProvider } from "@/components/profile-provider";
import { TenantProvider } from "@/contexts/tenant-context";
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
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <TenantProvider>
            <ProfileProvider>
              <TooltipProvider>
                <AppLayout>{children}</AppLayout>
              </TooltipProvider>
            </ProfileProvider>
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
