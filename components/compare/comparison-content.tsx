'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { buildComparisonRows, type CompareProduct, type MeasurementUnits } from '@/lib/compare/model'
import { useCompare } from './provider'

export default function ComparisonContent() {
  const { items, ready, remove, clear, error: storageError, reconcile, retry } = useCompare()
  const [catalog, setCatalog] = useState<{ key: string; products: CompareProduct[]; units: MeasurementUnits; error: boolean }>({ key: '', products: [], units: {}, error: false })
  const [attempt, setAttempt] = useState(0)
  const [highlight, setHighlight] = useState(false)
  const key = items.map(item => item.id).join(',')
  useEffect(() => {
    if (!ready || !key) return
    const controller = new AbortController()
    void fetch(`/api/compare?ids=${key}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error('Comparison unavailable')
      return response.json() as Promise<{ products: CompareProduct[]; units: MeasurementUnits }>
    }).then(data => { if (!controller.signal.aborted) { reconcile(data.products); setCatalog({ ...data, key, error: false }) } })
      .catch(() => { if (!controller.signal.aborted) setCatalog({ key, products: [], units: {}, error: true }) })
    return () => controller.abort()
  }, [key, ready, attempt, reconcile])
  if (!ready) return <p role="status" className="py-12 text-sm text-[#999999]">Loading your comparison…</p>
  const storageWarning = storageError && <div role="status" className="mb-4 text-xs text-[#FFD700]"><p>{storageError}</p><button type="button" onClick={retry} className="min-h-11 underline">Retry comparison save</button></div>
  if (!items.length) return <>{storageWarning}<div className="flex flex-col items-center gap-4 border border-[#444444] px-4 py-20 text-center"><p className="text-lg">No products selected for comparison</p><p className="text-sm text-[#999999]">Add two to four products from the same category.</p><Link href="/shop" className="btn-gold min-h-11 px-6 py-3 text-xs uppercase">Continue shopping</Link></div></>
  if (catalog.key !== key) return <p role="status" className="py-12 text-sm text-[#999999]">Loading product specifications…</p>
  if (catalog.error) return <div className="border border-[#444444] p-6"><p role="status" className="text-sm">Could not load products. Your comparison selection is still here.</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="btn-gold mt-4 min-h-11 px-4 text-xs">Retry comparison</button><button type="button" onClick={clear} aria-label="Clear comparison" className="ml-4 min-h-11 px-3 text-xs underline">Clear</button></div>
  const products = items.flatMap(item => catalog.products.filter(product => product.id === item.id))
  const missing = items.filter(item => !products.some(product => product.id === item.id))
  const mixedCategories = new Set(products.map(product => product.category)).size > 1
  const rows = buildComparisonRows(products, catalog.units)
  return <>
    {storageWarning}
    {missing.map(item => <div key={item.id} className="mb-4 flex items-center justify-between gap-3 border border-[#444444] p-3 text-xs"><p>{item.name} is no longer available for comparison.</p><button type="button" aria-label={`Remove unavailable ${item.name} from comparison`} onClick={() => remove(item.id)} className="min-h-11 shrink-0 px-3 text-[#FFD700] underline">Remove</button></div>)}
    {mixedCategories ? <div className="border border-[#444444] p-4"><p className="text-sm">These products are now in different categories. Remove products to keep one category.</p>{products.map(product => <button key={product.id} type="button" onClick={() => remove(product.id)} className="block min-h-11 text-xs text-[#FFD700] underline">Remove {product.name}</button>)}</div> : <>
      {products.length < 2 && <p className="mb-4 text-sm text-[#FFD700]">Add one more product to compare.</p>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={highlight} onChange={event => setHighlight(event.target.checked)} className="h-4 w-4 accent-[#FFD700]" />Highlight differences</label>
        <div className="flex gap-2"><button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 px-3 text-[#999999] underline">Refresh products</button><button type="button" onClick={clear} aria-label="Clear comparison" className="min-h-11 px-3 text-[#999999] underline">Clear</button></div>
      </div>
      {products.some(product => product.type === 'variable') && <p className="mb-4 text-xs text-[#999999]">Available options are listed for each product. Choose your size or colour on its product page. “From” prices show the lowest available variant price.</p>}
      {products.length > 0 && <div role="region" aria-label="Scrollable product comparison" tabIndex={0} className="overflow-x-auto border border-[#444444] focus-visible:outline focus-visible:outline-[#FFD700]">
        <table aria-label="Product comparison" className="w-full table-fixed border-collapse text-xs" style={{ minWidth: 128 + products.length * 220 }}>
          <colgroup><col style={{ width: 128 }} />{products.map(product => <col key={product.id} />)}</colgroup>
          <thead><tr><th scope="col" className="sticky left-0 z-10 border-r border-b border-[#444444] bg-[#1B1B18] p-3 text-left align-bottom">Specification</th>
            {products.map(product => <th key={product.id} scope="col" className="border-r border-b border-[#444444] p-3 text-left align-top last:border-r-0">
              <Link href={`/products/${product.slug}`} className="relative mb-3 block h-32 bg-[#222222]">{product.image ? <Image src={product.image} alt={product.name} fill sizes="240px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-[10px] text-[#999999]">No image available</span>}</Link>
              <p className="min-h-12 break-words text-sm font-bold">{product.name}</p>
              <Link href={`/products/${product.slug}`} className="btn-gold mt-2 flex min-h-11 items-center justify-center px-2 text-center text-xs uppercase">View product</Link>
              <button type="button" aria-label={`Remove ${product.name} from comparison`} onClick={() => remove(product.id)} className="mt-1 min-h-11 w-full text-center text-[11px] font-normal text-[#999999] underline">Remove</button>
            </th>)}
          </tr></thead>
          <tbody>{rows.map(row => <tr key={row.key} data-different={highlight && row.different ? 'true' : undefined} className={highlight && row.different ? 'bg-[#FFD700]/10' : ''}>
            <th scope="row" className={`sticky left-0 z-10 break-words border-r border-b border-[#444444] p-3 text-left ${highlight && row.different ? 'bg-[#38301A] text-[#FFD700]' : 'bg-[#1B1B18]'}`}>{row.label}</th>
            {row.values.map((value, index) => <td key={products[index].id} className="break-words border-r border-b border-[#444444] p-3 align-top text-[#CCCCCC] last:border-r-0">{value}</td>)}
          </tr>)}</tbody>
        </table>
      </div>}
      <p className="mt-4 text-xs text-[#999999]">Specifications appear as they are added to the store. “Not specified” means no value has been provided for that product.</p>
    </>}
  </>
}
