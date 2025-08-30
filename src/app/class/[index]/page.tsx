import { ClassReport } from "@/components/class-report";
import { notFound } from "next/navigation";

export default async function Class({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  const index = parseInt((await params).index);

  if (Number.isNaN(index)) {
    notFound();
  }

  return <ClassReport index={index} />;
}
