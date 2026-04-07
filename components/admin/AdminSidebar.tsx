'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAdminSet } from './AdminSetContext'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/comps', label: 'Comps' },
  { href: '/admin/items', label: 'Items' },
  { href: '/admin/augments', label: 'Augments' },
  { href: '/admin/champions', label: 'Champions' },
  { href: '/admin/insights', label: 'Insights' },
  { href: '/admin/patch-notes', label: 'Patch Notes' },
  { href: '/admin/sync', label: 'Sync Data' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentSet, availableSets, setCurrentSet, liveSet } = useAdminSet()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="dribbble-sidebar">
      <div className="ds-top">
        <div className="ds-brand">
          <div className="ds-dots">
            <span className="dot dot-blue"></span>
            <span className="dot dot-orange"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-teal"></span>
          </div>
          <span className="ds-brand-name">Grimoire</span>
        </div>

        <div className="ds-profile">
          <div className="ds-avatar">
            <img src="https://ui-avatars.com/api/?name=Admin&background=fff&color=000" alt="Admin" />
          </div>
          <div className="ds-name">Admin</div>
          <div className="ds-role">Data Director</div>
        </div>
      </div>

      <nav className="ds-nav">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link key={item.href} href={item.href} className={`ds-nav-link ${active ? 'active' : ''}`}>
              {item.label}
              {active && <span className="ds-active-dot" />}
            </Link>
          );
        })}
      </nav>

      <div className="ds-bottom">
        {/* Set Switcher */}
        {availableSets.length > 0 && (
          <div className="ds-set-switcher">
            <label className="ds-set-label">Viewing Set</label>
            <select
              className="ds-set-select"
              value={currentSet}
              onChange={e => setCurrentSet(e.target.value)}
            >
              {availableSets.map(s => (
                <option key={s} value={s}>
                  {s.replace('TFT', 'Set ')}{s === liveSet ? ' (Live)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <button onClick={handleLogout} className="ds-logout-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Log out
        </button>
      </div>

      <style>{`
        .dribbble-sidebar {
          width: 250px;
          min-width: 250px;
          background-color: #F8F4EE; /* Soft sand beige from mockup */
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          z-index: 100;
          border-top-left-radius: 30px;
          border-bottom-left-radius: 30px;
          padding: 40px 0;
          position: relative;
        }

        .ds-top { padding: 0 40px; margin-bottom: 50px; }

        .ds-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
        }
        
        .ds-dots { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; width: 14px; }
        .dot { width: 5px; height: 5px; border-radius: 50%; }
        .dot-blue { background-color: #4A90E2; }
        .dot-orange { background-color: #F5A623; }
        .dot-yellow { background-color: #F8E71C; }
        .dot-teal { background-color: #50E3C2; }

        .ds-brand-name { font-weight: 700; font-size: 16px; color: #222; }

        .ds-profile {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .ds-avatar {
          width: 60px; height: 60px;
          border-radius: 50%; overflow: hidden;
          margin-bottom: 15px; border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .ds-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .ds-name { font-weight: 700; font-size: 15px; color: #222; margin-bottom: 4px; }
        .ds-role { font-size: 11px; color: #9A9A9A; font-weight: 500; }

        .ds-nav {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .ds-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 40px;
          color: #777;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .ds-nav-link:hover { color: #222; }

        .ds-nav-link.active {
          color: #222;
          font-weight: 700;
        }

        .ds-active-dot {
          width: 16px; height: 16px;
          background-color: #EB5E28;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 10px; font-weight: bold;
        }
        .ds-active-dot::after {
           content: '1';
        }

        .ds-bottom {
          margin-top: auto;
          padding: 0 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ds-set-switcher {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ds-set-label {
          font-size: 10px;
          font-weight: 700;
          color: #9A9A9A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ds-set-select {
          background: #FFF;
          border: 1px solid #E8E4DE;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #222;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
        }
        .ds-set-select:focus { border-color: #EB5E28; }

        .ds-logout-btn {
          display: flex;
          align-items: center;
          background: none;
          border: none;
          color: #777;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
          padding: 0;
        }
        .ds-logout-btn:hover { color: #222; }
      `}</style>
    </aside>
  )
}
