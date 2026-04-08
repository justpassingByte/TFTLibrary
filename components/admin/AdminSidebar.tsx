'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAdminSet } from './AdminSetContext'

const ICONS = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>,
  analytics: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  comps: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  items: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  augments: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  champions: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  insights: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"></path></svg>,
  patchNotes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  sync: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
};

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true, icon: ICONS.dashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: ICONS.analytics },
  { href: '/admin/comps', label: 'Comps', icon: ICONS.comps },
  { href: '/admin/items', label: 'Items', icon: ICONS.items },
  { href: '/admin/augments', label: 'Augments', icon: ICONS.augments },
  { href: '/admin/champions', label: 'Champions', icon: ICONS.champions },
  { href: '/admin/insights', label: 'Insights', icon: ICONS.insights },
  { href: '/admin/patch-notes', label: 'Patch Notes', icon: ICONS.patchNotes },
  { href: '/admin/sync', label: 'Sync Data', icon: ICONS.sync },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentSet, availableSets, setCurrentSet, liveSet, setLabels } = useAdminSet()

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
    <aside className="premium-sidebar">
      {/* Brand area */}
      <div className="ps-brand-container">
        <div className="ps-brand">
          <div className="ps-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <span className="ps-brand-name">Grimoire Admin</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="ps-nav">
        <div className="ps-nav-label">Menu</div>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link key={item.href} href={item.href} className={`ps-nav-link ${active ? 'active' : ''}`}>
              <div className="ps-nav-icon">{item.icon}</div>
              <span className="ps-nav-text">{item.label}</span>
              {active && <div className="ps-active-indicator" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer Area: Profile + Set View */}
      <div className="ps-bottom">
        
        {/* Set Switcher Redesigned */}
        <div className="ps-set-switcher">
          <select
            className="ps-set-select"
            value={currentSet}
            onChange={e => setCurrentSet(e.target.value)}
          >
            {availableSets.map(s => (
              <option key={s} value={s}>
                {s ? (setLabels[s] || s.replace('TFT', 'Set ')) : 'Unknown'}{s === liveSet ? ' (Live)' : ''}
              </option>
            ))}
          </select>
          <div className="ps-set-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div className="ps-set-content">
            <span className="ps-set-label">Data Environment</span>
            <span className="ps-set-value">
              {currentSet ? currentSet.replace('TFT', 'Set ') : 'Unknown'}{currentSet === liveSet ? ' (Live)' : ''}
            </span>
          </div>
          <div className="ps-set-chevron">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <div className="ps-divider"></div>

        {/* Profile & Logout */}
        <div className="ps-profile-card">
          <div className="ps-user-info">
            <div className="ps-avatar">
              <img src="https://ui-avatars.com/api/?name=Admin&background=fff&color=000" alt="Admin" />
            </div>
            <div className="ps-user-text">
              <div className="ps-name">System Admin</div>
              <div className="ps-role">Data Director</div>
            </div>
          </div>
          <button onClick={handleLogout} className="ps-logout-btn" title="Log out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>

      </div>

      <style>{`
        .premium-sidebar {
          width: 260px;
          min-width: 260px;
          background-color: #F8F4EE; /* Soft sand beige */
          box-shadow: 1px 0 20px rgba(0,0,0,0.02);
          border-right: 1px solid #E8E4DE;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          z-index: 100;
          position: relative;
          color: #222;
        }

        .ps-brand-container {
          padding: 30px 24px 20px;
        }

        .ps-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #E8E4DE;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .ps-brand-icon {
          color: #EB5E28; /* Premium warm orange */
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ps-brand-name {
          font-weight: 800;
          font-size: 16px;
          letter-spacing: -0.3px;
          color: #222;
        }

        .ps-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 16px;
          overflow-y: auto;
        }

        .ps-nav::-webkit-scrollbar { width: 4px; }
        .ps-nav::-webkit-scrollbar-track { background: transparent; }
        .ps-nav::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 4px; }

        .ps-nav-label {
          font-size: 11px;
          font-weight: 700;
          color: #9A9A9A;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 10px 12px;
          margin-bottom: 4px;
        }

        .ps-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          color: #777;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          border-radius: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .ps-nav-link:hover {
          color: #222;
          background-color: rgba(0, 0, 0, 0.03);
        }

        .ps-nav-link.active {
          color: #EB5E28;
          background-color: rgba(235, 94, 40, 0.08); /* Subtle orange tint */
        }

        .ps-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .ps-nav-link:hover .ps-nav-icon, .ps-nav-link.active .ps-nav-icon {
          opacity: 1;
        }

        .ps-nav-link.active .ps-nav-icon {
          color: #EB5E28;
        }

        .ps-active-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background-color: #EB5E28;
          border-radius: 0 4px 4px 0;
        }

        .ps-bottom {
          margin-top: auto;
          padding: 0 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ps-divider {
          height: 1px;
          background-color: #E8E4DE;
          margin: 4px 0;
        }

        /* Set Switcher Redesigned */
        .ps-set-switcher {
          background: #FFFFFF;
          border: 1px solid #E8E4DE;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          position: relative;
        }

        .ps-set-switcher:hover {
          border-color: #EB5E28;
          box-shadow: 0 2px 8px rgba(235,94,40,0.1);
        }

        .ps-set-icon {
          color: #EB5E28;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(235, 94, 40, 0.08);
          padding: 8px;
          border-radius: 8px;
        }

        .ps-set-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .ps-set-label {
          font-size: 10px;
          font-weight: 700;
          color: #9A9A9A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ps-set-select {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          appearance: none;
        }

        .ps-set-value {
          font-size: 13px;
          font-weight: 700;
          color: #222;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .ps-set-select option {
          background: #FFF;
          color: #222;
        }

        .ps-set-chevron {
          color: #9A9A9A;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        
        .ps-set-switcher:hover .ps-set-chevron {
          color: #EB5E28;
        }

        /* Profile Area */
        .ps-profile-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }

        .ps-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ps-avatar {
          width: 36px; 
          height: 36px;
          border-radius: 10px; 
          overflow: hidden;
          background: #FFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .ps-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .ps-user-text {
          display: flex;
          flex-direction: column;
        }

        .ps-name { font-weight: 700; font-size: 13px; color: #222; }
        .ps-role { font-size: 11px; color: #9A9A9A; font-weight: 600; }

        .ps-logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFFFFF;
          border: 1px solid #E8E4DE;
          color: #777;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }

        .ps-logout-btn:hover { 
          color: #EF4444; /* Soft red for logout hover */
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </aside>
  )
}
