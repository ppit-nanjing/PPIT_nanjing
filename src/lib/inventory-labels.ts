// Single source for inventory condition labels. This map used to be duplicated
// in /inventory and /console/inventory; when inventoryConditionEnum grew from 3
// to 5 values (Advanced Features §5) only the console copy was updated, so the
// public catalog rendered "Kondisi: undefined" for any item marked new or fair.
// Keep this keyed off the enum so adding a value fails the typecheck here
// rather than silently rendering undefined to members.

export const INVENTORY_CONDITIONS = ["new", "good", "fair", "damaged", "retired"] as const;

export type InventoryCondition = (typeof INVENTORY_CONDITIONS)[number];

export const CONDITION_LABEL: Record<InventoryCondition, string> = {
  new: "Baru",
  good: "Baik",
  fair: "Cukup Baik",
  damaged: "Rusak",
  retired: "Pensiun",
};

// Falls back to the raw value rather than undefined, so an unexpected DB value
// is visible as itself instead of disappearing.
export function conditionLabel(condition: string): string {
  return CONDITION_LABEL[condition as InventoryCondition] ?? condition;
}
