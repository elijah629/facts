export function courseLevel(name: string) {
  if (/\b(?:AP|Advanced Placement)\b/i.test(name)) return "AP";
  if (/\(\s*H\s*\)|\bHonou?rs?\b/i.test(name)) return "Honors";
  if (/\b(?:DE|Dual Enrollment)\b/i.test(name)) return "Dual enrollment";
  return "Standard";
}
