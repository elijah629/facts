import type { Metadata } from "next";
import { CollegePlanner } from "@/components/college-planner";

export const metadata: Metadata = {
  title: "College GPA & A–G | facts",
  description: "Compare Garces courses and estimate college admissions GPAs.",
};

export default function CollegePage() {
  return <CollegePlanner />;
}
