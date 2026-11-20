import type { Metadata } from "next";
import { CollegePlanner } from "@/components/college-planner";

export const metadata: Metadata = {
  title: "GPA & A–G | facts",
  description: "Compare school GPA and college admissions estimates.",
};

export default function GpaPage() {
  return <CollegePlanner />;
}
