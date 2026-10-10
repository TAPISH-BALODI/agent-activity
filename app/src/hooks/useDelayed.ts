import { useEffect, useState } from 'react'

/**
 * Returns true after `ms` milliseconds. Used to show slow-network states
 * without flashing skeletons on fast connections.
 */
export function useDelayed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), ms)
    return () => clearTimeout(id)
  }, [ms])

  return elapsed
}
