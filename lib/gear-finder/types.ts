export type Bilingual = { en: string; el: string }
export type Mode = 'wetsuits' | 'fins'
export type Answers = Record<string, string>
export interface Question { id: string; short: Bilingual; title: Bilingual; hint: Bilingual; options: [string, string, Bilingual, Bilingual][] }
export interface SuitModel {
  id: string; name: Bilingual; outer: string; inner: string; uses: string[]; price: number[];
  thickness: number[]; description: Bilingual; advantage: Bilingual; care: Bilingual; url: string
}
export interface FinModel {
  id: string; name: Bilingual; family: string; material: string; angle: number | null;
  long: boolean; price: number[]; stock: string; description: Bilingual; url: string;
  stiffness: string[]; sizes: string[] | null
}
export interface Commerce { href: string; name: string; image: string; priceFrom: boolean }
export type LiveSuit = SuitModel & { commerce: Commerce; stock: string }
export type LiveFin = FinModel & { commerce: Commerce }
export interface Catalogue { suits: LiveSuit[]; fins: LiveFin[] }
