import type { HistoryChange } from "./history-changes";
export interface TimelineGrades {
  gpa: number | null;
  unweightedGpa: number | null;
  classes: Array<{
    id: string;
    name: string;
    percentage: number | null;
    letter: string | null;
  }>;
}
export interface TimelinePoint {
  id: string;
  sequence: number;
  observedAt: string;
  term: string;
  schoolYear: string;
  grades: TimelineGrades;
  previousGrades: TimelineGrades | null;
  changes: HistoryChange[];
}
export interface TimelinePage {
  points: TimelinePoint[];
  selectedId: string | null;
  before: number | null;
  hasNewer: boolean;
  unavailable: boolean;
}
