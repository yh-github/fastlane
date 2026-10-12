/**
 * Calculate the chance of getting robbed at home.
 *
 * @param relaxation — Current relaxation stat
 * @returns            Probability (0.0 to 1.0)
 */
export function calcRobberyChance(relaxation: number): number {
  return 1 / (relaxation + 1);
}

/**
 * Calculate theoretical robbery chance ignoring current turn start week restrictions.
 * Includes homeTimeThisTurn for real-time feedback during turns.
 */
export function calcTheoreticalRobberyChance(
  player: { currentHousingId: string; relaxation?: number; homeTimeHistory?: number[]; homeTimeThisTurn?: number },
  rules?: { useHomeTimeRobbery?: boolean }
): number {
  if (player.currentHousingId === 'security' || player.currentHousingId === 'security_apartments' || player.currentHousingId === 'penthouse') return 0;

  if (rules?.useHomeTimeRobbery) {
    const history = [...(player.homeTimeHistory || []), player.homeTimeThisTurn || 0];
    const sum = history.reduce((acc, val) => acc + val, 0);
    const mean = history.length > 0 ? sum / history.length : 0;
    return 1 / (11 + mean);
  }

  return calcRobberyChance(player.relaxation || 0);
}

/**
 * Calculate the effective home robbery chance taking into account housing type,
 * Willy robbery start week, and home-time rules.
 */
export function calcEffectiveRobberyChance(
  player: { currentHousingId: string; relaxation?: number; homeTimeHistory?: number[]; homeTimeThisTurn?: number },
  rules?: { useHomeTimeRobbery?: boolean },
  turn: number = 1,
  campaign?: { config?: { eventRules?: { willyRobberyStartWeek?: number } } }
): number {
  const startWeek = campaign?.config?.eventRules?.willyRobberyStartWeek ?? 4;
  if (turn < startWeek) return 0;
  return calcTheoreticalRobberyChance(player, rules);
}
