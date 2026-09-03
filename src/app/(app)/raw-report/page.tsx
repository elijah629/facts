import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";

export default async function RawReportPage() {
  if (!(await currentSession())) redirect("/sign-in");

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Raw FACTS report</h1>
      <iframe
        className="min-h-[calc(100vh-10rem)] w-full rounded-lg border bg-white"
        referrerPolicy="no-referrer"
        sandbox=""
        src="/api/grades/raw"
        title="Raw FACTS grade report"
      />
    </div>
  );
}
