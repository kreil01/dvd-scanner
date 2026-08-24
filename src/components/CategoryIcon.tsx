import {
  Armchair,
  Car,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Leaf,
  Package,
  Plane,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { categoryOf } from "../lib/categories";
import type { CategoryId } from "../lib/types";

const icons: Record<string, LucideIcon> = {
  Home,
  Hammer,
  Armchair,
  Leaf,
  Car,
  WalletCards,
  HeartPulse,
  GraduationCap,
  Plane,
  Package,
};

export function CategoryIcon({ category, size = "md" }: { category: CategoryId; size?: "sm" | "md" | "lg" }) {
  const cat = categoryOf(category);
  const Icon = icons[cat.icon] ?? Home;
  return (
    <span className={`category-icon category-icon-${size}`} style={{ color: cat.accent }} aria-hidden>
      <Icon />
    </span>
  );
}

export function CategoryChip({ category }: { category: CategoryId }) {
  const cat = categoryOf(category);
  return (
    <span className="chip category-chip" style={{ color: cat.accent }}>
      {cat.label}
    </span>
  );
}
