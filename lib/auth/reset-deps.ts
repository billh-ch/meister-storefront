import { sendPasswordChangedEmail, sendPasswordResetEmail } from '@/lib/email/account-mail'
import { findWcCustomerForReset, setWcCustomerPassword } from '@/lib/woocommerce/queries/create-customer'
import { newToken, type ResetDeps } from './password-reset'
import { redisResetStore } from './reset-store'
import { allowResetRequestForEmail } from './reset-rate-limit'
import { revokeSessionsBefore } from './session-validity'

export const realResetDeps: ResetDeps = {
  store: redisResetStore,
  findCustomer: findWcCustomerForReset,
  setPassword: setWcCustomerPassword,
  revokeSessions: (customerId, at) => revokeSessionsBefore(customerId, at),
  allowEmail: allowResetRequestForEmail,
  sendReset: sendPasswordResetEmail,
  sendChanged: sendPasswordChangedEmail,
  now: () => Date.now(),
  token: newToken,
}
