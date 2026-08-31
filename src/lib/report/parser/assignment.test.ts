import { describe, expect, test } from "bun:test";
import { parseAssignmentLabel } from "./assignment";

describe("assignment title and description parsing", () => {
  test.each([
    ["Extra Credit Dress-Up Aloha", "Extra Credit Dress-Up Aloha", undefined],
    [
      "1.1 Homework: Worksheet in GC (all)",
      "1.1 Homework",
      "Worksheet in GC (all)",
    ],
    [
      "Signed Syllabus : Student shares syllabus with parent and/or guardian. Student signs and\nreturns.",
      "Signed Syllabus",
      "Student shares syllabus with parent and/or guardian. Student signs and returns.",
    ],
    [
      "signed syllabus: signed syllabus- only student signature required. Syllabus posted in google classroom.",
      "signed syllabus",
      "only student signature required. Syllabus posted in google classroom.",
    ],
    [
      "Lab Safety Creative Challenge : Lab Safety Creative Challenge",
      "Lab Safety Creative Challenge",
      undefined,
    ],
    [
      "Quiz 1.3-1.4: Quiz 1.3-1.4 from lessons 1.3 and 1.4",
      "Quiz 1.3-1.4",
      "from lessons 1.3 and 1.4",
    ],
    [
      "Apuntes: Repaso de Español 1 - más verbos: Apuntes: Repaso de Español 1 - más verbos (posted in google classroom)",
      "Apuntes: Repaso de Español 1 - más verbos",
      "posted in google classroom",
    ],
    [
      "Apuntes: Repaso de Español 1: Apuntes: Repaso de Español 1 (notes taken in class- posted in Google Classroom)",
      "Apuntes: Repaso de Español 1",
      "notes taken in class- posted in Google Classroom",
    ],
    [
      "Apuntes: Reg present & e:ie stem-changing verbs : Apuntes: regular present tense and stem-changing (e:ie) verbs (notes- posted in google classroom)",
      "Apuntes: Reg present & e:ie stem-changing verbs",
      "Apuntes: regular present tense and stem-changing (e:ie) verbs (notes- posted in google classroom)",
    ],
    [
      "Apuntes: Stem-changing verbs (e:i,o:ue,u:ue): Apuntes: Stem-changing verbs (e:i,o:ue,u:ue)",
      "Apuntes: Stem-changing verbs (e:i,o:ue,u:ue)",
      undefined,
    ],
    [
      "Corre en Circulos - stem-changers: Corre en Circulos - stem-changers (done in class)",
      "Corre en Circulos - stem-changers",
      "done in class",
    ],
    [
      "Tarea: Español 1 repaso (review): Tarea: Español 1 repaso (review) posted in google classroom",
      "Tarea: Español 1 repaso (review)",
      "posted in google classroom",
    ],
    [
      "Tarea: Present tense & e:ie stem-changers w.s: Present tense practice & e:ie stem-changers w.s (posted in google classroom)",
      "Tarea: Present tense & e:ie stem-changers w.s",
      "Present tense practice & e:ie stem-changers w.s (posted in google classroom)",
    ],
  ])("parses %s", (raw, name, description) => {
    expect(parseAssignmentLabel(raw)).toEqual({ name, description });
  });
});
