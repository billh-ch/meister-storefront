import Image from 'next/image'
import Link from '@/components/i18n/localized-link'
import { formatPrice } from '@/lib/mock-data'
import type { LiveSuit, LiveFin, Mode } from '@/lib/gear-finder/types'
import type { Locale } from '@/lib/i18n'
import { guideCopy } from './copy'
import styles from './guide.module.css'

interface Props { product: LiveSuit | LiveFin; mode: Mode; locale: Locale; best?: boolean; reasons?: string[]; thickness?: number | null }
export default function GuideProductCard({ product: p, mode, locale, best, reasons = [], thickness }: Props) {
  const { u, e } = guideCopy(mode, locale)
  const construction = 'outer' in p
    ? locale === 'el' ? `${p.outer === 'smooth' ? 'Λείο' : 'Φόδρα'} εξωτερικά · ${p.inner === 'open' ? 'ξυρισμένο' : 'φόδρα'} εσωτερικά` : `${p.outer === 'smooth' ? 'Smooth' : 'Fabric'} outside · ${p.inner === 'open' ? 'open cell' : 'fabric lining'} inside`
    : [e(p.material === 'plastic' ? 'Plastic' : 'Carbon fibre'), e(p.long ? 'Long version' : 'Standard-name version'), ...(p.angle ? [e('30° blade angle')] : [])].join(' · ')
  return <article className={best ? styles.best : styles.card} data-gear-best={best || undefined}>
    <div className={styles.productImage}>
      {p.commerce.image ? <Image src={p.commerce.image} alt={p.commerce.name} width={600} height={600} sizes={best ? '(max-width: 700px) 90vw, 450px' : '(max-width: 700px) 90vw, 350px'} /> : <span>MEISTER</span>}
    </div>
    <div className={styles.productBody}>
      {best && <span className={styles.eyebrow}>{u('best')}</span>}
      {best ? <h2>{p.commerce.name}</h2> : <h3>{p.commerce.name}</h3>}
      <p className={styles.muted}>{construction}</p>
      <p>{p.description[locale]}</p>
      <p className={p.stock === 'listed' ? styles.stock : styles.stockWarning}>{e(p.stock === 'out' ? 'Sold out · check with Meister' : p.stock === 'backorder' ? 'On backorder · confirm delivery' : 'Listed as orderable · verify your options')}</p>
      <p className={styles.price}>{p.commerce.priceFrom && <small>{locale === 'el' ? 'Από ' : 'From '}</small>}{formatPrice(p.price[0])}</p>
      <p className={styles.small}>{'material' in p && p.material === 'plastic' ? e('Listed price · confirm size and availability') : u('priceNote')}</p>
      {best && reasons.length > 0 && <ul className={styles.reasons}>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      {!best && thickness && <p>{u('thicknessTitle')}: <strong>{thickness}mm</strong></p>}
      <Link className={`${styles.button} ${best ? styles.primary : ''}`} href={p.commerce.href}>{locale === 'el' ? 'Δες το προϊόν →' : 'View product →'}</Link>
    </div>
  </article>
}
