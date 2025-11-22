import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GPA_WEIGHTS, LETTER_RANGES, LetterGrade } from "@/lib/grades";

export default function GPA() {
  const grades = Object.values(LetterGrade).map((grade) => {
    const regularGPA = GPA_WEIGHTS.regular[grade];
    const weightedGPA = GPA_WEIGHTS.weighted[grade];

    const { min, max } = LETTER_RANGES[grade];

    let percentage = "";

    if (grade === "F") {
      percentage = `Below ${max * 100}`;
    } else if (grade === "A+") {
      percentage = `100-${min * 100}`;
    } else {
      percentage = `${max * 100 - 1}-${min * 100}`;
    }

    return {
      grade,
      weighted: weightedGPA.toString(),
      regular: regularGPA.toString(),
      percentage,
    };
  });

  return (
    <>
      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
        GPA Guide
      </h1>
      <p className="leading-7 not-first:mt-6 italic text-sm text-muted-foreground">
        For users who have used the app before version 9/17/2025, the GPA
        calculation system has recently changed. Extra credit no longer boosts
        your GPA above the threshold. Your GPA may be lower — this is expected,
        do not panic. The previous number was inaccurately high.
      </p>
      <p className="leading-7 not-first:mt-6">
        This app follows these rules to calculate the seen GPA. First you find
        the GPA value for each class via the table below, then you average them
        all. Congratulations! You have successfully calculated your GPA.{" "}
        <i>Note:</i> To my surprise, extra credit above 100% does{" "}
        <strong>NOT</strong> give you a GPA above 5.3/4.3 (depending on class
        level). If you are shocked, as I too was, think of it as padding — or a
        "crash pad" — in case you do poorly on a major assignment.
      </p>

      <Card className="mt-2">
        <CardHeader>
          <CardTitle>Complete Grading Scale</CardTitle>
          <CardDescription>
            GPA points and percentage ranges for all course types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Grade</TableHead>
                <TableHead className="text-center">AP/Honors GPA</TableHead>
                <TableHead className="text-center">Regular GPA</TableHead>
                <TableHead className="text-center">Percentage Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((item) => (
                <TableRow key={item.grade}>
                  <TableCell className="font-medium text-center">
                    {item.grade}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {item.weighted}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {item.regular}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {item.percentage}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="leading-7 not-first:mt-6">
        This is not AI — I just like em-dashes
      </p>
    </>
  );
}
