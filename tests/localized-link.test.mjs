import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
registerHooks({
 resolve(s,c,n){
  if(s==='next/link')return n('next/link.js',c)
  if(s.startsWith('.')&&c.parentURL){const u=new URL(s+'.tsx',c.parentURL);if(existsSync(fileURLToPath(u)))return n(u.href,c)}
  return n(s,c)
 },
 load(u,c,n){if(u.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(u),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};return n(u,c)}
})
test('actual Greek LocalizedLink renders its localized display alias with query/hash intact',async()=>{
 const {LocaleProvider}=await import('../components/i18n/locale-provider.tsx')
 const {LocalizedLink}=await import('../components/i18n/localized-link.tsx')
 for(const as of ['/products/%cf%80?q=2#options',{pathname:'/products/%cf%80',query:{q:'2'},hash:'options'}]) {
  const html=renderToStaticMarkup(createElement(LocaleProvider,{locale:'el'},createElement(LocalizedLink,{href:'/shop',as},'Catalog')))
  assert.match(html,/href="\/el\/products\/%cf%80\?q=2#options"/)
 }
})
