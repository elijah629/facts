import { AccountStatus } from "@/components/account-status";
import { GradebookLoader } from "@/components/gradebook-loader";
import { MobileNavigation } from "@/components/mobile-navigation";
import { ReportSidebar } from "@/components/report-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GradebookLoader />
      <SidebarProvider>
        <ReportSidebar />
        <SidebarInset>
          <header className="flex min-h-12 sm:min-h-14 items-center gap-2 border-b px-3 py-2 sm:px-4">
            <SidebarTrigger className="shrink-0" />
            <Separator className="hidden h-6 sm:block" orientation="vertical" />
            <AccountStatus />
          </header>
          <MobileNavigation />
          <main className="min-w-0 p-3 sm:p-5">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
