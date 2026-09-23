import type { TFunction } from 'i18next';

export function getItemDisplayName(
  itemId: string,
  itemDef?: { name?: string } | null,
  t?: TFunction,
  isAdvanced?: boolean
): string {
  if (isAdvanced && (itemId === 'dog_food' || itemDef?.name === 'Canned Mystery Meat')) {
    if (t) {
      return t('item.dog_food_advanced', { defaultValue: itemDef?.name || 'Canned Mystery Meat' });
    }
    return itemDef?.name || 'Canned Mystery Meat';
  }

  if (t) {
    return t(`item.${itemId}`, { defaultValue: itemDef?.name || itemId });
  }

  return itemDef?.name || itemId;
}
