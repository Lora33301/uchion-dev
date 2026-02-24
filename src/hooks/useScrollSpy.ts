import { useState, useEffect } from 'react'

/**
 * Tracks which worksheet page section is currently in view based on scroll position.
 * Watches #page1–#page4 anchors and updates activePage accordingly.
 */
export function useScrollSpy(): { activePage: number } {
  const [activePage, setActivePage] = useState(1)

  useEffect(() => {
    const handleScroll = () => {
      const p1 = document.getElementById('page1')
      const p2 = document.getElementById('page2')
      const p3 = document.getElementById('page3')
      const p4 = document.getElementById('page4')

      const scrollY = window.scrollY + 200 // offset

      if (p4 && scrollY >= p4.offsetTop) setActivePage(4)
      else if (p3 && scrollY >= p3.offsetTop) setActivePage(3)
      else if (p2 && scrollY >= p2.offsetTop) setActivePage(2)
      else setActivePage(1)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { activePage }
}
