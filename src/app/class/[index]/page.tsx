import { notFound } from "next/navigation";
import { ClassReport } from "@/components/class-report";

export default async function Class({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  const index = parseInt((await params).index, 10);

  if (Number.isNaN(index)) {
    notFound();
  }

  return <ClassReport index={index} />;
}
