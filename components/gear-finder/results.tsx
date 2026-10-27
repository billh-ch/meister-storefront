import Link from '@/components/i18n/localized-link'
import { QUESTIONS, FIN_QUESTIONS, FIN_REASONS } from '@/lib/gear-finder/reference'
import { rankFins, rankSuits, finStiffness } from '@/lib/gear-finder/engine'
import type { Answers, Catalogue, Mode, LiveSuit } from '@/lib/gear-finder/types'
import type { Locale } from '@/lib/i18n'
import GuideProductCard from './product-card'
import { guideCopy } from './copy'
import styles from './guide.module.css'
import type { ReactNode } from 'react'

export function Note({ title, children, warm = false }: { title: string; children: ReactNode; warm?: boolean }) {
  return <section className={`${styles.note} ${warm ? styles.warm : ''}`}><h3>{title}</h3><p>{children}</p></section>
}
function SuitAdvice({ product: p, answers, locale, thickness }: { product: LiveSuit; answers: Answers; locale: Locale; thickness: number | null }) {
  const { u, e } = guideCopy('wetsuits', locale)
  const plan = rankSuits(answers, [p]).plan
  return <>
    <div className={styles.noteGrid}>
      <Note title={`${u('thicknessTitle')}: ${thickness ? thickness + 'mm' : u('pending')}`} warm>{plan.range ? `${plan.adjusted ? u('adjusted') + ' ' : ''}${u('thicknessNote')}` : u('unknown')}</Note>
      <Note title={u('careTitle')}>{p.care[locale]}</Note>
    </div>
    {answers.use === 'scuba' && <Note title={e('Your scuba setup')} warm>{u('scubaNotice')}</Note>}
    <Note title={u('fitTitle')}>{p.id === 'fire' ? e('This Fire Camo edition lists S, M, L, XL and XXL. Confirm measurements and availability with Meister. The quiz does not assign a size.') : u('fit')} <Link href="/contact">{u('contact')}</Link></Note>
  </>
}
export default function GuideResults({ mode, answers, catalogue, locale, showAll, onEdit, onRestart, onToggleAll }: {
  mode: Mode; answers: Answers; catalogue: Catalogue | null; locale: Locale; showAll: boolean;
  onEdit: () => void; onRestart: () => void; onToggleAll: () => void
}) {
  const { t, u, e } = guideCopy(mode, locale)
  const questions = mode === 'fins' ? FIN_QUESTIONS : QUESTIONS
  const suits = catalogue?.suits ?? [], fins = catalogue?.fins ?? []
  const suitMatches = rankSuits(answers, suits.filter(p => p.stock !== 'out')).matches
  const finMatches = rankFins(answers, fins)
  const bestSuit = suitMatches[0], bestFin = finMatches[0]
  const best = mode === 'fins' ? bestFin?.product : bestSuit?.product
  const all = mode === 'fins' ? fins : suits
  let suitReasons: string[] = []
  if (bestSuit) {
    const p = bestSuit.product
    const activity = t(QUESTIONS[0].options.find(o => o[0] === answers.use)![2]).toLowerCase()
    suitReasons = [locale === 'el' ? `Η Meister τη διαθέτει για ${activity}.` : `Listed by Meister for ${activity}.`]
    suitReasons.push(answers.care === 'easy' ? e('A fabric interior meets your preference for dressing without lubricant.') : answers.care === 'rugged' ? e('The fabric exterior matches your preference for everyday durability.') : answers.care === 'smooth' ? e('The smooth exterior matches your preference for glide.') : t(p.advantage))
    if (p.inner === 'open' && answers.care === 'unsure') suitReasons.push(e('This choice needs lubricant inside; choose “Easy to put on” if you prefer to avoid that.'))
    if (answers.budget !== 'any') suitReasons.push(u('budgetCaveat'))
  }
  return <div data-gear-results>
    <div className={styles.resultHeading}>
      <div><p className={styles.eyebrow}>{u('resultEyebrow')}</p><h2 id="gear-question" tabIndex={-1}>{u('resultTitle')}</h2></div>
      <button className={styles.button} onClick={onEdit}>{u('edit')} ↗</button>
    </div>
    <ul className={styles.pills} aria-label={locale === 'el' ? 'Οι απαντήσεις σου' : 'Your answers'}>{questions.map(q => <li key={q.id}>{t(q.options.find(o => o[0] === answers[q.id])![2])}</li>)}</ul>
    {catalogue === null ? <Note title={locale === 'el' ? 'Προσωρινά μη διαθέσιμος κατάλογος' : 'Catalogue temporarily unavailable'}>{locale === 'el' ? 'Οι απαντήσεις σου διατηρούνται. Δοκίμασε ξανά σε λίγο για τρέχουσες προτάσεις προϊόντων.' : 'Your answers are saved. Try again shortly for current product recommendations.'} <a href="#" onClick={event => { event.preventDefault(); window.location.reload() }}>{locale === 'el' ? 'Δοκίμασε ξανά' : 'Try again'}</a></Note> : best ? <>
      {mode === 'fins' && bestFin ? <>
        <GuideProductCard product={bestFin.product} mode={mode} locale={locale} best reasons={(bestFin.reasons.length ? bestFin.reasons.map(key => t(FIN_REASONS[key])) : [t(bestFin.product.description)]).slice(0, 3)} />
        <div className={styles.noteGrid}>
          <Note title={`${e('Blade stiffness to discuss')}: ${bestFin.product.material === 'plastic' ? e('Factory blade') : finStiffness(answers)}`} warm>{bestFin.product.material === 'plastic' ? e('The plastic listing has no selectable stiffness. The carbon S–H scale does not apply to this product.') : e('An editorial starting range, not a Meister prescription. The carbon listings offer S, MS, M, MH and H, but no official body-weight chart. Try the blade or discuss your technique and leg strength with Meister.')}</Note>
          <Note title={e('Foot-pocket fit')}><strong>{t(FIN_QUESTIONS.find(q => q.id === 'socks')!.options.find(o => o[0] === answers.socks)![2])}. </strong>{e('Try with these socks. The pocket should hold your foot without numbness or painful pressure. Confirm the size with Meister.')}{bestFin.product.material === 'plastic' && <> {e('Listed sizes:')} {bestFin.product.sizes?.join(', ')} EU.</>}</Note>
        </div>
        {answers.use === 'pool' && <Note title={e('For pool training')} warm>{e('This is a closest-match suggestion from the Meister sea-fin range. The product pages do not state pool-specific suitability. Confirm with Meister and your instructor before buying for pool use.')}</Note>}
        <Note title={e('Before you order')}>{e('“Long” is a model label, not a published length. Check blade dimensions against your bag. Carbon starting prices may be for blades without pockets; confirm the complete setup and current stock.')} {answers.travel === 'standard' && bestFin.product.long ? e('Your price cap leads to a Long model despite your standard-version preference.') : ''} <Link href="/contact">{u('contact')}</Link></Note>
      </> : bestSuit && <>
        <GuideProductCard product={bestSuit.product} mode={mode} locale={locale} best reasons={suitReasons.slice(0, 3)} />
        <SuitAdvice product={bestSuit.product} answers={answers} locale={locale} thickness={bestSuit.thickness} />
      </>}
      {(mode === 'fins' ? finMatches.length : suitMatches.length) > 1 ? <section className={styles.alternatives}><h2>{u('alternatives')}</h2><div className={styles.cards}>
        {mode === 'fins' ? finMatches.slice(1, 3).map(m => <GuideProductCard key={m.product.id} product={m.product} mode={mode} locale={locale} />) : suitMatches.slice(1, 3).map(m => <GuideProductCard key={m.product.id} product={m.product} mode={mode} locale={locale} thickness={m.thickness} />)}
      </div></section> : <p className={styles.muted}>{u('noAlt')}</p>}
    </> : <Note title={u('noMatchTitle')}>{u(mode === 'wetsuits' && answers.temp === 'cold' ? 'coldNotice' : 'noMatch')} <Link href="/contact">{u('contact')}</Link></Note>}
    <div className={styles.resultActions}>
      {catalogue && all.length > 0 && <button className={styles.button} onClick={onToggleAll}>{showAll ? u('hide') : locale === 'el' ? `Δες και τα ${all.length} μοντέλα` : `Browse all ${all.length} models`}</button>}
      {best && catalogue && <button className={styles.button} onClick={() => window.print()}>{u('print')}</button>}
      <button className={`${styles.button} ${styles.primary}`} onClick={onRestart}>{u('restart')} ↻</button>
    </div>
    {showAll && <section className={styles.alternatives}><h2>{u('allNotice')}</h2><div className={styles.cards}>{all.map(p => <GuideProductCard key={p.id} product={p} mode={mode} locale={locale} />)}</div></section>}
    <div className={styles.disclosure}>
      <p>{mode === 'fins' ? e('“Long” is a model label, not a published length. Check blade dimensions against your bag. Carbon starting prices may be for blades without pockets; confirm the complete setup and current stock.') : u('disclosure')}</p>
      <details><summary>{u('sources')}</summary>
        <p>{mode === 'fins' ? e('We reviewed the supplied fin finder and rechecked the nine official shop pages. We first exclude sold-out models and starting prices above your cap, then rank by diving style, usual depth, kick preference and standard/Long preference. Experience has a small model effect and helps the stiffness discussion; socks affect only the fit advice. Backorder models carry a delivery warning. Rankings are editorial, not manufacturer approval or performance-test scores.') : u('method')}</p>
        <p>{mode === 'fins' ? e('Only F1 30° listings state an angle. Exact blade lengths, an official weight-to-stiffness chart, and a pool-use rating were not found. We do not infer other angles, promise a bag fit, or recommend a fin size.') : e('Temperature bands are our conservative guide: 24°C+ → 3–3.5mm; 19–23°C → 5–5.5mm; 15–18°C → 7–7.5mm. Long sessions or feeling cold moves up one level, once, with 8–9mm as the upper discussion range. These are not validated Meister thermal ratings.')}</p>
        <ul>{all.map(p => <li key={p.id}><Link href={p.commerce.href}>{p.commerce.name}</Link></li>)}<li><a href={mode === 'fins' ? 'https://blog.padi.com/choosing-fins-for-freediving/' : 'https://www.padi.com/gear/wetsuits'} target="_blank" rel="noopener noreferrer">PADI · {mode === 'fins' ? e('PADI · choosing fins for freediving').replace(/^PADI · /, '') : u('thermalSource').replace(/^PADI · /, '')}</a></li></ul>
      </details>
    </div>
  </div>
}
