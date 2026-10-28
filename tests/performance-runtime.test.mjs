import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('the real image component renders generated responsive sources without a runtime optimizer', async()=>{
 const file=new URL('../components/store-image.tsx',import.meta.url)
 let js=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
 js=js.replaceAll('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime'))).replaceAll("from 'react'",'from '+JSON.stringify(import.meta.resolve('react'))).replaceAll("from 'react-dom'",'from '+JSON.stringify(import.meta.resolve('react-dom')))
 js=js.replaceAll("'@/lib/images/generated-manifest.json'",JSON.stringify(new URL('../lib/images/generated-manifest.json',import.meta.url).href))
 const {default:Image}=await import('data:text/javascript,'+encodeURIComponent(js))
 const html=renderToStaticMarkup(React.createElement(Image,{src:'/images/accessories-category-image.jpg',alt:'Accessories',width:640,height:640}))
 assert.match(html,/srcSet="[^"]*\/optimized\//i)
 assert.doesNotMatch(html,/\/_next\/image/)
})

test('image refresh removes a broken derivative mapping when its origin is unavailable',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'meister-images-'))
 try {
  for(const dir of ['scripts','lib/images','public/images','public/gear-finder'])mkdirSync(path.join(root,dir),{recursive:true})
  symlinkSync(new URL('../node_modules',import.meta.url),path.join(root,'node_modules'),'dir')
  writeFileSync(path.join(root,'scripts/prepare-images.mjs'),readFileSync(new URL('../scripts/prepare-images.mjs',import.meta.url)))
  const source='https://store.test/wp-content/uploads/photo.jpg'
  writeFileSync(path.join(root,'lib/images/generated-manifest.json'),JSON.stringify({[source]:[{width:320,src:'/optimized/aaaaaaaaaaaaaaaaaaaa-320.webp'}]}))
  writeFileSync(path.join(root,'preload.mjs'),`globalThis.fetch=async url=>{if(String(url)==='https://inventory.test/media')return Response.json({version:1,images:[{src:${JSON.stringify(source)}}]});throw new Error('origin unavailable')}`)
  const result=spawnSync(process.execPath,['--import',path.join(root,'preload.mjs'),path.join(root,'scripts/prepare-images.mjs')],{env:{...process.env,MEDIA_MANIFEST_URL:'https://inventory.test/media',NEXT_PUBLIC_WC_URL:'https://store.test'},encoding:'utf8'})
  assert.equal(result.status,0,result.stderr)
  assert.equal(JSON.parse(readFileSync(path.join(root,'lib/images/generated-manifest.json'),'utf8'))[source],undefined)
 } finally {rmSync(root,{recursive:true,force:true})}
})
