import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const {getBaseUrl}=await import('../lib/url.ts')
test('checkout redirects use the explicitly configured Cloudflare origin',()=>{
 assert.equal(getBaseUrl({NEXT_PUBLIC_SITE_URL:'https://meister-storefront-test.example.workers.dev',VERCEL_ENV:'preview'}),'https://meister-storefront-test.example.workers.dev')
})
test('explicit deployment origins reject credentials, paths and insecure external URLs',()=>{
 for(const value of ['https://user:password@example.com','https://example.com/path','https://example.com?redirect=bad','https://example.com/#bad','http://example.com']) assert.throws(()=>getBaseUrl({NEXT_PUBLIC_SITE_URL:value}))
})
test('existing Vercel and local redirect origins retain their previous behavior',()=>{
 assert.equal(getBaseUrl({VERCEL_ENV:'production',VERCEL_PROJECT_PRODUCTION_URL:'store.example.com',VERCEL_URL:'preview.example.com'}),'https://store.example.com')
 assert.equal(getBaseUrl({VERCEL_ENV:'preview',VERCEL_URL:'preview.example.com'}),'https://preview.example.com')
 assert.equal(getBaseUrl({}),'http://localhost:3000')
})
test('Vercel payment redirects retain deployment isolation when SEO uses the production origin',()=>{
 const shared={NEXT_PUBLIC_SITE_URL:'https://store.example.com'}
 assert.equal(getBaseUrl({...shared,VERCEL_ENV:'preview',VERCEL_URL:'preview.example.com'}),'https://preview.example.com')
 assert.equal(getBaseUrl({...shared,VERCEL_ENV:'production',VERCEL_PROJECT_PRODUCTION_URL:'live.example.com'}),'https://live.example.com')
})
