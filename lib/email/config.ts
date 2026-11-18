import { BUSINESS_CONTACT } from '@/lib/business-contact'
import { getBaseUrl } from '@/lib/url'

/** Sender must belong to a domain verified in Resend (orders.meister.gr). */
export const emailFrom = () => process.env.EMAIL_FROM || 'Meister & Meister Dive <orders@orders.meister.gr>'
export const emailReplyTo = () => process.env.EMAIL_REPLY_TO || BUSINESS_CONTACT.email
/** Where the shop owner's "new order" alert goes. */
export const orderAlertRecipient = () => process.env.ORDER_ALERT_EMAIL || BUSINESS_CONTACT.email

/** Where email images are hosted (the storefront's public/ folder). Overridable for local previews. */
export const emailAssetBase = () => (process.env.EMAIL_ASSET_BASE_URL || getBaseUrl()).replace(/\/$/, '')

/** Seller identity shown in every customer email footer. VAT number only when configured. */
export function sellerIdentity() {
  return {
    legalName: process.env.BUSINESS_LEGAL_NAME || 'Meister & Meister Dive',
    vatNumber: process.env.BUSINESS_VAT_NUMBER || '',
    address: `${BUSINESS_CONTACT.streetAddress}, ${BUSINESS_CONTACT.postalCode} ${BUSINESS_CONTACT.addressLocality}, ${BUSINESS_CONTACT.addressCountry}`,
    email: BUSINESS_CONTACT.email,
    telephone: BUSINESS_CONTACT.displayTelephone,
    privacyUrl: BUSINESS_CONTACT.privacySource,
  }
}

/** Email clients ignore CSS variables, so the storefront palette (app/globals.css) lives here once. */
export const emailTheme = {
  page: '#DCDEE2', card: '#1B1B18', header: '#000000', gold: '#FFD700',
  text: '#FFFFFF', soft: '#CCCCCC', muted: '#999999', line: '#6A6A66', onGold: '#1B1B18',
  /** Space Mono is the storefront body font; Courier is the safe monospace fallback. */
  font: "'Space Mono', 'Cascadia Mono', 'Courier New', Courier, monospace",
  displayEn: "'Zalando Sans Expanded', 'Arial Black', Arial, sans-serif",
  displayEl: "'Syne', 'Arial Black', Arial, sans-serif",
} as const
