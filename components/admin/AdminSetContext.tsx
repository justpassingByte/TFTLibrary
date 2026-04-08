'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface SetCounts {
  champions: number
  traits: number
  augments: number
  items: number
}

interface AdminSetContextValue {
  currentSet: string
  availableSets: string[]
  setCurrentSet: (set: string) => void
  liveSet: string
  setLiveSet: (set: string) => void
  publishLiveSet: () => Promise<void>
  isPublishing: boolean
  setCounts: Record<string, SetCounts>
  setLabels: Record<string, string>
  refreshSets: () => void
}

const AdminSetContext = createContext<AdminSetContextValue | null>(null)

export function useAdminSet() {
  const ctx = useContext(AdminSetContext)
  if (!ctx) throw new Error('useAdminSet must be used within AdminSetProvider')
  return ctx
}

export function AdminSetProvider({ children }: { children: ReactNode }) {
  const [availableSets, setAvailableSets] = useState<string[]>([])
  const [currentSet, setCurrentSetState] = useState<string>('')
  const [liveSet, setLiveSet] = useState<string>('TFT16')
  const [isPublishing, setIsPublishing] = useState(false)
  const [setCounts, setSetCounts] = useState<Record<string, SetCounts>>({})
  const [setLabels, setSetLabels] = useState<Record<string, string>>({})

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Persist currentSet to localStorage
  const setCurrentSet = useCallback((set: string) => {
    setCurrentSetState(set)
    try { localStorage.setItem('admin_current_set', set) } catch {}
  }, [])

  const fetchSets = useCallback(async () => {
    try {
      const [setsRes, settingsRes, adminSetsRes] = await Promise.all([
        fetch(`${apiUrl}/api/meta/sets`).catch(e => { console.error('meta/sets error', e); return null; }),
        fetch(`${apiUrl}/api/admin/settings`).catch(e => { console.error('admin/settings error', e); return null; }),
        fetch(`${apiUrl}/api/admin/sets`).catch(e => { console.error('admin/sets error', e); return null; }),
      ])
      
      if (adminSetsRes && (adminSetsRes as any).ok) {
        const data = await (adminSetsRes as any).json()
        const labels: Record<string, string> = {}
        if (data.sets) {
          data.sets.forEach((s: any) => { labels[s.prefix] = s.label })
        }
        setSetLabels(labels)
      }

      if (setsRes && (setsRes as any).ok) {
        let sets: string[] = await (setsRes as any).json()
        setAvailableSets(sets)

        // Restore from localStorage or default to last set
        const stored = localStorage.getItem('admin_current_set')
        if (stored && sets.includes(stored)) {
          setCurrentSetState(stored)
        } else if (sets.length > 0) {
          const defaultSet = sets[sets.length - 1] // Default to the latest set
          setCurrentSetState(defaultSet)
          try { localStorage.setItem('admin_current_set', defaultSet) } catch {}
        } else {
          setCurrentSetState('TFT16')
        }

        // Fetch per-set counts
        const countsMap: Record<string, SetCounts> = {}
        await Promise.all(sets.map(async (prefix) => {
          try {
            const [champsRes, traitsRes, augRes, itemsRes] = await Promise.all([
              fetch(`${apiUrl}/api/meta/champions?set_prefix=${prefix}`),
              fetch(`${apiUrl}/api/meta/traits?set_prefix=${prefix}`),
              fetch(`${apiUrl}/api/meta/augments?set_prefix=${prefix}`),
              fetch(`${apiUrl}/api/meta/items?set_prefix=${prefix}`),
            ])
            const champs = champsRes.ok ? await champsRes.json() : []
            const traits = traitsRes.ok ? await traitsRes.json() : []
            const augs = augRes.ok ? await augRes.json() : []
            const items = itemsRes.ok ? await itemsRes.json() : []
            countsMap[prefix] = {
              champions: champs.length,
              traits: traits.length,
              augments: augs.length,
              items: items.length,
            }
          } catch {
            countsMap[prefix] = { champions: 0, traits: 0, augments: 0, items: 0 }
          }
        }))
        setSetCounts(countsMap)
      }

      if (settingsRes && (settingsRes as any).ok) {
        const settings = await (settingsRes as any).json()
        if (settings?.active_set) setLiveSet(settings.active_set)
      }
    } catch (e) {
      console.error('AdminSetProvider: failed to fetch sets', e)
    }
  }, [apiUrl])

  useEffect(() => { fetchSets() }, [fetchSets])

  const publishLiveSet = useCallback(async () => {
    setIsPublishing(true)
    try {
      const res = await fetch(`${apiUrl}/api/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_set: liveSet }),
      })
      if (!res.ok) throw new Error('Failed to update live set')
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setIsPublishing(false)
    }
  }, [apiUrl, liveSet])

  return (
    <AdminSetContext.Provider value={{
      currentSet,
      availableSets,
      setCurrentSet,
      liveSet,
      setLiveSet,
      publishLiveSet,
      isPublishing,
      setCounts,
      setLabels,
      refreshSets: fetchSets,
    }}>
      {children}
    </AdminSetContext.Provider>
  )
}
