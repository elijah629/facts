import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReportInput } from "@/components/report-input";
import { ReportSidebar } from "@/components/report-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "facts tool",
  description:
    "small tool to efficiently predict and accurately calculate grades managed by FactsMGT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <SidebarProvider>
          <ReportSidebar />
          <SidebarInset>
            <header className="flex min-h-16 items-center gap-2 border-b px-3 py-2 sm:px-4">
              <SidebarTrigger className="shrink-0" />
              <Separator
                className="hidden h-6 sm:block"
                orientation="vertical"
              />
              <ReportInput />
            </header>
            <main className="p-3 sm:p-5">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
