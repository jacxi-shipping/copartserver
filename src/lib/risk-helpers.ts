export interface RiskInput {
  saleTitleType: string | null
  saleTitleState: string | null
  damageDescription: string | null
  secondaryDamage: string | null
  hasKeys: boolean | null
}

export function calculateTitleRisk(lot: RiskInput) {
  const title = `${lot.saleTitleType ?? ''} ${lot.saleTitleState ?? ''}`.toUpperCase()
  const damage = `${lot.damageDescription ?? ''} ${lot.secondaryDamage ?? ''}`.toUpperCase()
  const flags: string[] = []
  let score = 10
  if (title.includes('NON-REPAIRABLE') || title.includes('JUNK')) { score += 70; flags.push('Non-repairable or junk title') }
  else if (title.includes('SALVAGE')) { score += 35; flags.push('Salvage title') }
  if (damage.includes('FLOOD')) { score += 40; flags.push('Flood damage reported') }
  if (damage.includes('BURN') || damage.includes('FIRE')) { score += 40; flags.push('Fire damage reported') }
  if (damage.includes('ROLLOVER')) { score += 25; flags.push('Rollover damage reported') }
  if (damage.includes('MECHANICAL')) { score += 15; flags.push('Mechanical damage reported') }
  if (lot.hasKeys === false) { score += 10; flags.push('Keys are not included') }
  score = Math.min(score, 100)
  const level = score >= 75 ? 'high' : score >= 45 ? 'elevated' : score >= 25 ? 'review' : 'low'
  return { score, level, flags: flags.length > 0 ? flags : ['Review source title, condition, and sale announcements before bidding'] }
}