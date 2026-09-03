export type DecimalValue = string;

export interface CanonicalAssignment {
  name: string;
  description: string | null;
  categoryId: string;
  earned: DecimalValue | null;
  possible: DecimalValue | null;
  status: "valid" | "missing" | "excuse";
  excluded: boolean;
  extraCredit: boolean;
  dueDate: string;
  note: string | null;
  weight: DecimalValue | null;
  curve: DecimalValue | null;
  bonus: DecimalValue | null;
  penalty: DecimalValue | null;
}

export interface CanonicalCategory {
  name: string;
  description: string | null;
  weight: DecimalValue | null;
}

export interface CanonicalClass {
  name: string;
  displayName: string;
  teacher: string;
  term: string;
  grading: {
    mode: "points" | "mixed" | "percent";
    roundingPrecision: number;
    categories: Record<string, CanonicalCategory>;
  };
  assignments: Record<string, CanonicalAssignment>;
}

export interface GradebookState {
  studentName: string;
  term: string;
  yearRange: { min: number; max: number };
  classes: Record<string, CanonicalClass>;
}

export interface ClassDelta {
  set?: Partial<Omit<CanonicalClass, "grading" | "assignments">>;
  grading?: {
    set?: Partial<Omit<CanonicalClass["grading"], "categories">>;
    categoriesAdded?: Record<string, CanonicalCategory>;
    categoriesChanged?: Record<string, Partial<CanonicalCategory>>;
    categoriesRemoved?: string[];
  };
  assignments?: {
    added?: Record<string, CanonicalAssignment>;
    changed?: Record<string, Partial<CanonicalAssignment>>;
    removed?: string[];
  };
}

export interface GradebookDelta {
  set?: Partial<Omit<GradebookState, "classes">>;
  classesAdded?: Record<string, CanonicalClass>;
  classesChanged?: Record<string, ClassDelta>;
  classesRemoved?: string[];
}
