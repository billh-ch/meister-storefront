'use client'

import Image from '@/components/store-image'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocale, useTranslation } from '@/components/i18n/locale-provider'
import { QUESTIONS, FIN_QUESTIONS } from '@/lib/gear-finder/reference'
import { browserFinderStore } from '@/lib/gear-finder/session'
import type { FinderSession } from '@/lib/gear-finder/session'
import type { Catalogue, Mode } from '@/lib/gear-finder/types'
import GuideResults from './results'
import { guideCopy } from './copy'
import styles from './guide.module.css'

function subscribeMode(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}
const currentMode = (): Mode => window.location.hash === '#fins' ? 'fins' : 'wetsuits'
const serverMode = (): Mode => 'wetsuits'

export default function GearFinder({ catalogue }: { catalogue: Catalogue | null }) {
  const locale = useLocale(), translate = useTranslation()
  const mode = useSyncExternalStore(subscribeMode, currentMode, serverMode)
  const [store] = useState(browserFinderStore)
  const sessions = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const session = sessions[mode]
  const { t, u } = guideCopy(mode, locale)
  const questions = mode === 'fins' ? FIN_QUESTIONS : QUESTIONS
  const question = questions[session.step]
  const root = useRef<HTMLDivElement>(null)
  const shouldFocus = useRef(false)
  const previousMode = useRef(mode)
  function update(patch: Partial<FinderSession>, focus = true) {
    shouldFocus.current = focus
    store.update(mode, { ...session, ...patch })
  }
  useEffect(() => {
    if (!shouldFocus.current && previousMode.current === mode) return
    previousMode.current = mode
    shouldFocus.current = false
    const heading = root.current?.querySelector<HTMLElement>('#gear-question')
    heading?.focus({ preventScroll: true })
    heading?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [mode, session.step, session.results])

  const hero = u('hero').replace(/<br\s*\/?>/g, '\n').replace(/<\/?em>/g, '')
  return <div ref={root} className={styles.finder} data-gear-mode={mode}>
    <div className={styles.modeBar}>
      <span className={styles.eyebrow}>{translate('Gear Finder')}</span>
      <nav className={styles.modeLinks} aria-label={locale === 'el' ? 'Επίλεξε οδηγό' : 'Choose a finder'}>
        {(['wetsuits', 'fins'] as const).map(item => <a key={item} data-mode-link={item} href={`#${item}`} aria-current={mode === item ? 'page' : undefined}>
          <span>{item === 'wetsuits' ? locale === 'el' ? 'Στολές' : 'Wetsuits' : locale === 'el' ? 'Πέδιλα' : 'Fins'}</span>
          <small>{item === 'wetsuits' ? locale === 'el' ? 'Ζεστασιά & εφαρμογή' : 'Warmth & fit' : locale === 'el' ? 'Λάκτισμα & άνεση' : 'Kick & comfort'}</small>
        </a>)}
      </nav>
    </div>
    <section className={styles.hero}>
      <div><p className={styles.eyebrow}>{u('eyebrow')}</p><h1>{hero}</h1><p className={styles.intro}>{u('intro')}</p><ul className={styles.meta}><li>{u('minutes')}</li><li>{u('questions')}</li><li>{u('noSignup')}</li></ul></div>
      <div className={styles.heroArt} aria-hidden="true"><Image src={`/gear-finder/${mode === 'fins' ? 'fin-evo' : 'lined'}.jpg`} alt="" width={400} height={500} sizes="(max-width: 700px) 0px, 260px" /><span>{u('art')}</span></div>
    </section>
    {session.results ? <GuideResults mode={mode} answers={session.answers} catalogue={catalogue} locale={locale} showAll={session.showAll}
      onEdit={() => update({ results: false, step: 0 })}
      onRestart={() => update({ answers: {}, step: 0, results: false, showAll: false })}
      onToggleAll={() => update({ showAll: !session.showAll }, false)} /> : <>
      <section className={styles.quiz} aria-label={u('guide')}>
        <aside className={styles.rail}><p className={styles.eyebrow}>{u('yourGuide')}</p><ol>{questions.map((q, i) => <li key={q.id} aria-current={session.step === i ? 'step' : undefined} data-complete={Boolean(session.answers[q.id])}><span>{i < session.step && session.answers[q.id] ? '✓' : i + 1}</span>{t(q.short)}</li>)}</ol><p className={styles.small}>{u('railNote')}</p></aside>
        <div className={styles.quizMain}>
          <div className={styles.progressRow}><span>{u('step')} <strong>{session.step + 1}</strong> {u('of')} {questions.length}</span><span>{t(question.short)}</span></div>
          <div className={styles.progress} role="progressbar" aria-label={u('step')} aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={session.step + 1}><span style={{ width: `${(session.step + 1) / questions.length * 100}%` }} /></div>
          <fieldset className={styles.question} key={`${mode}-${question.id}`} aria-describedby="gear-question-hint">
            <legend id="gear-question" tabIndex={-1}>{t(question.title)}</legend>
            <p id="gear-question-hint" className={styles.hint}>{t(question.hint)}</p>
            <div className={styles.options}>{question.options.map(([value, , label, help]) => <label className={styles.option} key={value} data-selected={session.answers[question.id] === value}>
              <input type="radio" name={question.id} value={value} checked={session.answers[question.id] === value} onChange={() => update({ answers: { ...session.answers, [question.id]: value } }, false)} />
              <span><strong>{t(label)}</strong><span className={styles.optionHelp}>{t(help)}</span></span>
            </label>)}</div>
          </fieldset>
          <div className={styles.controls}>
            <button className={styles.button} disabled={session.step === 0} onClick={() => update({ step: session.step - 1 })}>← {u('back')}</button>
            <button className={`${styles.button} ${styles.primary}`} disabled={!session.answers[question.id]} onClick={() => session.step === questions.length - 1 ? update({ results: true }) : update({ step: session.step + 1 })}>{u(session.step === questions.length - 1 ? 'finish' : 'next')}</button>
          </div>
        </div>
      </section>
      <p className={styles.quizNote}>{u('quizNote')}</p>
    </>}
    <section className={styles.learn}><div className={styles.learnHeading}><h2>{u('learn')}</h2><span>{u('learnSub')}</span></div><div className={styles.learnGrid}>{['lined', 'open', 'smooth'].map(key => <details key={`${mode}-${key}`}><summary>{u(key + 'Title')}</summary><p>{u(key + 'Text')}</p></details>)}</div></section>
  </div>
}
