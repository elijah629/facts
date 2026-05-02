import { notFound } from "next/navigation";
import { ClassReport } from "@/components/class-report";

export default async function Class({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  const { index: indexParam } = await params;

  if (!/^\d+$/.test(indexParam)) {
    notFound();
  }

  const index = Number(indexParam);

  return <ClassReport index={index} />;
}
