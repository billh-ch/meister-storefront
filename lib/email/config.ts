import { BUSINESS_CONTACT } from '@/lib/business-contact'

/** Sender must belong to a domain verified in Resend (orders.meister.gr). */
export const emailFrom = () => process.env.EMAIL_FROM || 'Meister & Meister Dive <orders@orders.meister.gr>'
export const emailReplyTo = () => process.env.EMAIL_REPLY_TO || BUSINESS_CONTACT.email
/** Where the shop owner's "new order" alert goes. */
export const orderAlertRecipient = () => process.env.ORDER_ALERT_EMAIL || BUSINESS_CONTACT.email

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

/** Email clients ignore CSS variables, so the brand palette lives here once. */
export const emailTheme = {
  page: '#F2F2EF', card: '#FFFFFF', header: '#1B1B18', gold: '#FFD700',
  text: '#222222', muted: '#6B6B66', line: '#E3E3DE',
  font: "Helvetica, Arial, 'Segoe UI', sans-serif",
} as const
