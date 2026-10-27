'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

/** Two identical, viewport-sized groups keep the loop seamless without giant layers. */
export default function Marquee({ text, className = '', speed = 140 }: {
  text: string
  className?: string
  /** CSS pixels per second, independent of label length and repeat count. */
  speed?: number
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const unit = useRef<HTMLSpanElement>(null)
  const [layout, setLayout] = useState({ count: 1, distance: 0 })

  useEffect(() => {
    const container = viewport.current
    const sample = unit.current
    if (!container || !sample) return
    let disposed = false
    let fontsReady = false
    const measure = () => {
      if (disposed || !fontsReady) return
      const width = sample.getBoundingClientRect().width
      const visible = container.clientWidth
      if (!width || !visible) return
      const count = Math.max(1, Math.ceil(visible / width))
      const distance = count * width
      setLayout(current => current.count === count && current.distance === distance ? current : { count, distance })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    observer.observe(sample)
    void document.fonts.ready.then(() => { fontsReady = true; measure() })
    return () => { disposed = true; observer.disconnect() }
  }, [text])

  const style = {
    '--marquee-distance': `${layout.distance}px`,
    '--marquee-duration': `${layout.distance / speed}s`,
  } as CSSProperties

  return (
    <div ref={viewport} className={`marquee-viewport ${className}`} aria-hidden="true">
      <div key={text} className="marquee-track" data-ready={layout.distance > 0 ? 'true' : 'false'} style={style}>
        {[0, 1].map(group => (
          <div className="marquee-group" key={group}>
            {Array.from({ length: layout.count }, (_, index) => (
              <span className="marquee-unit" key={index} ref={group === 0 && index === 0 ? unit : undefined}>{text}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
