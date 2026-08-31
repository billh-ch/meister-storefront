import { useEffect, useState } from 'react'

/** Shared by every Embla carousel on the site (`ProductCarousel`,
 *  `CategoriesSection`) so the responsive breakpoints only live in one place. */
export function useSlideWidth() {
  const [slideWidth, setSlideWidth] = useState('33.333%')

  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) setSlideWidth('85%')
      else if (window.innerWidth < 1024) setSlideWidth('50%')
      else setSlideWidth('33.333%')
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return slideWidth
}
