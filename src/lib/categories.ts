import type { CategoryId } from "./types";

export interface CategoryDefinition {
  id: CategoryId;
  label: string;
  icon: string;
  accent: string;
}

export const categories: Record<CategoryId, CategoryDefinition> = {
  house: { id: "house", label: "Haus & Wohnung", icon: "Home", accent: "#ff6a1a" },
  renovation: { id: "renovation", label: "Renovierung & Bau", icon: "Hammer", accent: "#d28a42" },
  furnishing: { id: "furnishing", label: "Einrichtung & Ausstattung", icon: "Armchair", accent: "#b983d7" },
  garden: { id: "garden", label: "Garten", icon: "Leaf", accent: "#52bd78" },
  mobility: { id: "mobility", label: "Mobilität & Fahrzeuge", icon: "Car", accent: "#5ca4e8" },
  finance: { id: "finance", label: "Finanzen & Verträge", icon: "WalletCards", accent: "#d7a642" },
  health: { id: "health", label: "Gesundheit & Wellness", icon: "HeartPulse", accent: "#e05d64" },
  education: { id: "education", label: "Bildung & Wissen", icon: "GraduationCap", accent: "#55b8c4" },
  travel: { id: "travel", label: "Reisen & Freizeit", icon: "Plane", accent: "#7f9fe7" },
  other: { id: "other", label: "Organisation & Sonstiges", icon: "Package", accent: "#9b8f89" }
};

export function categoryOf(id: CategoryId) {
  return categories[id] ?? categories.other;
}
