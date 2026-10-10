import { useEffect, useState } from 'react'

/**
 * Returns true only if `active` has been continuously true for `ms`
 * milliseconds. Resets to false as soon as `active` becomes false.
 *
 * Use this for slow-network banners: pass `isLoading` as `active` so the
 * timer restarts on every new fetch, not once at component mount.
 */
export function useDelayed(ms: number, active: boolean): boolean {
  const [exceeded, setExceeded] = useState(false)

  useEffect(() => {
    if (!active) {
      setExceeded(false)
      return
    }
    const id = setTimeout(() => setExceeded(true), ms)
    return () => clearTimeout(id)
  }, [ms, active])

  return exceeded
}
