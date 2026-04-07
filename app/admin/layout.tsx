import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'

export const metadata: Metadata = {
  title: 'Admin — TFT Grimoire',
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <main className="admin-content">
          {children}
        </main>
      </div>

      <style>{`
        .admin-shell {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          background: #ECAE97; /* Soft peach dribbble background */
          padding: 40px; /* Creates the dribbble "canvas" wrapper effect */
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          overflow: hidden;
        }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #FFFFFF;
          border-top-right-radius: 30px;
          border-bottom-right-radius: 30px;
          box-shadow: 20px 20px 60px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .admin-content {
          flex: 1;
          overflow-y: auto;
          padding: 50px;
        }

        @media (max-width: 768px) {
          .admin-content {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  )
}
