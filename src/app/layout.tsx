import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ProfileProvider } from "@/components/profile-provider";
import { TenantProvider } from "@/contexts/tenant-context";
import AppLayout from "@/components/app-layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corvo – Grant Intelligence",
  description: "Grant intelligence platform with AI-powered tools for grant discovery, drafting, award management, and compliance reporting.",
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
        <SessionProvider>
          <ThemeProvider>
            <TenantProvider>
              <ProfileProvider>
                <TooltipProvider>
                  <AppLayout>{children}</AppLayout>
                </TooltipProvider>
              </ProfileProvider>
            </TenantProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
