import type { Assignment } from "@/types/report";

export function parseAssignment(row: HTMLTableRowElement): Assignment {
  let [
    rawName,
    points,
    maxPoints,
    _average,
    status,
    rawDue,
    _curve,
    _bonus,
    _penalty,
    note,
  ] = Array.from(row.children).map(
    (cell) => (cell as HTMLTableCellElement).innerText,
  );

  const [month, day] = rawDue.split("/").map(Number);
  const due = new Date(0, month - 1, day);

  const [name, _description] = rawName.split(": ");
  const description = name === _description ? undefined : _description;

  status = status.toLowerCase() as Assignment["status"];

  if (status === "valid") {
    return {
      status: "valid",
      name,
      description,

      points: Number(points),
      maxPoints: Number(maxPoints),

      due,

      note: note || undefined,
    };
  }

  if (status === "excuse") {
    return {
      status: "excuse",
      name,
      description,

      due,
      note: note || undefined,
    };
  }

  if (status === "missing") {
    return {
      status: "missing",
      name,
      description,

      maxPoints: Number(maxPoints),

      due,
      note: note || undefined,
    };
  }

  return {
    status: "excuse", // fallback
    name,
    description,

    due,
    note: note || undefined,
  };
}
