import { FinalCalculator } from "@/components/final-calculator";

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string | string[] }>;
}) {
  const { course } = await searchParams;
  const initialCourse = typeof course === "string" ? course : undefined;
  return <FinalCalculator key={initialCourse} initialCourse={initialCourse} />;
}
