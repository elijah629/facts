const SIDEBAR_CLASS_NAMES: Readonly<Record<string, string>> = {
  "Agri-Design: Ag Mech & Engineering Design": "Ag Mechanics",
};

export function sidebarClassName(displayName: string): string {
  return SIDEBAR_CLASS_NAMES[displayName] ?? displayName;
}
