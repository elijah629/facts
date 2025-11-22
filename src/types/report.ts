/// Gradebook report
export type Report = {
  classes: Class[];
} & ReportHeader;

/// Header for the report
export interface ReportHeader {
  /// Name of the person the report is for
  for: string;
  /// Term the report is for
  term: string;
  /// Year range for the report
  yearRange: { min: number; max: number };
}

/// Class
export type Class = {
  /// Grading sections with weights
  sections: Section[];

  /// How many decimals after the decimal point (optional: 0 if not present). this is used to maintain accuracy with oddly rounded classes with the mixed grading method
  roundingPrecision: number;
} & ClassHeader;

export interface ClassHeader {
  /// Display name of class
  displayName: string;

  /// Expanded name of the class, eg. ENG 102 - 3
  fullName: string;

  /// Instructor of the class
  instructor: string;

  /// How the class is graded
  gradingMethod: "points" | "mixed" | "percent";
}

export type Section = {
  assignments: Assignment[];
} & SectionHeader;

export interface SectionHeader {
  name: string;
  description?: string;

  /// Weight of the section in the interval [0, 1]. The sum of all sections must be 1.
  /// NOTE: This does not apply to every grading method (all but POINTS)
  weight?: number;
}

export type Assignment = (
  | {
      status: "valid";

      points: number;
      maxPoints: number;
    }
  | {
      // 0/0
      status: "excuse";
    }
  | {
      // 0/maxPoints
      maxPoints: number;
      status: "missing";
    }
) & {
  name: string;
  description?: string;

  due: Date;
  note?: string;
};
