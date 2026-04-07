import type { ReactNode } from 'react'

interface Props {
  id: string
  title: string
  description: string
  badge?: string
  badgeColor?: string
  actionLabel: string
  actionLoading?: boolean
  actionDisabled?: boolean
  onAction: () => void
  secondaryActionLabel?: string
  secondaryActionLoading?: boolean
  secondaryActionDisabled?: boolean
  onSecondaryAction?: () => void
  children?: ReactNode
}

export function ActionCard({
  id, title, description, badge, badgeColor = '#50E3C2',
  actionLabel, actionLoading, actionDisabled, onAction,
  secondaryActionLabel, secondaryActionLoading, secondaryActionDisabled, onSecondaryAction,
  children
}: Props) {
  return (
    <div className="action-card" id={id}>
      <div className="ac-body">
        <div className="ac-header">
          <h3 className="ac-title">{title}</h3>
          {badge && (
            <span className="ac-badge" style={{ color: badgeColor, borderColor: `${badgeColor}40`, background: `${badgeColor}12` }}>
              {badge}
            </span>
          )}
        </div>
        <p className="ac-desc">{description}</p>
        {children && <div className="ac-children">{children}</div>}
        <div className="ac-actions">
          <button
            id={`${id}-btn`}
            className="ac-btn"
            onClick={onAction}
            disabled={actionDisabled || actionLoading}
          >
            {actionLoading ? (
              <>
                <span className="ac-spinner" />
                Running...
              </>
            ) : actionLabel}
          </button>
          
          {secondaryActionLabel && onSecondaryAction && (
             <button
                id={`${id}-sec-btn`}
                className="ac-btn secondary"
                onClick={onSecondaryAction}
                disabled={secondaryActionDisabled || secondaryActionLoading}
             >
                {secondaryActionLoading ? (
                  <>
                    <span className="ac-spinner" />
                    Running...
                  </>
                ) : secondaryActionLabel}
             </button>
          )}
        </div>
      </div>

      <style>{`
        .action-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 25px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: flex-start;
          transition: 0.2s;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          border: 1px solid transparent;
          height: 100%;
          justify-content: space-between;
        }

        .action-card:hover {
          border-color: #EEE8E0;
        }

        .ac-body {
          flex: 1;
          width: 100%;
        }

        .ac-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .ac-title {
          font-family: 'Courier New', Courier, serif;
          font-size: 20px;
          font-weight: 800;
          color: #222;
          margin: 0;
        }

        .ac-badge {
          font-size: 11px;
          font-weight: bold;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          background: #F8F4EE !important;
          border: none !important;
          color: #9A9A9A !important;
        }

        .ac-desc {
          font-size: 13px;
          color: #666;
          margin: 0 0 20px;
          line-height: 1.5;
        }

        .ac-children {
          flex: 1;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .ac-actions {
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
        }

        .ac-btn {
          padding: 10px 20px;
          background: #4A90E2;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 120px;
          justify-content: center;
        }

        .ac-btn:hover:not(:disabled) {
          background: #357ABD;
          transform: translateY(-1px);
        }

        .ac-btn:disabled {
          background: #E8E8E8;
          color: #A9A9A9;
          cursor: not-allowed;
          transform: none;
        }

        .ac-btn.secondary {
          background: #F8F4EE;
          color: #666;
        }

        .ac-btn.secondary:hover:not(:disabled) {
          background: #EEE8E0;
          color: #222;
        }

        .ac-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: ac-spin 0.6s linear infinite;
          flex-shrink: 0;
        }

        @keyframes ac-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
