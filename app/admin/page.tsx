import { DashboardCharts } from './DashboardCharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function AdminOverviewPage() {
  let overviewData: any = null
  try {
    const res = await fetch(`${API_URL}/api/meta/stats/overview`, { cache: 'no-store' })
    if (res.ok) {
      overviewData = await res.json()
    }
  } catch (e) {}


  return (
    <div className="ds-overview">
      <div className="ds-header-block">
        <h1 className="ds-title">
          Dashboard 
          <span className="ds-title-dot">1</span>
        </h1>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginTop: '8px', cursor: 'pointer'}}>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </div>

      <div className="ds-top-grid">
        <div className="ds-metrics-group">
          <div className="ds-metric">
            <div className="ds-metric-label">Current Set <span className="ds-metric-up">Active</span></div>
            <div className="ds-metric-val">Set {overviewData?.system?.version?.split('.')[0] || '11'}</div>
          </div>
          <div className="ds-metric">
            <div className="ds-metric-label">Latest Patch <span className="ds-metric-up">Live</span></div>
            <div className="ds-metric-val">{overviewData?.system?.version || 'N/A'}</div>
          </div>
          <div className="ds-metric">
            <div className="ds-metric-label">Last Updated <span className="ds-metric-up">★</span></div>
            <div className="ds-metric-val" style={{fontSize: '20px'}}>
              {overviewData?.system?.last_updated ? new Date(overviewData.system.last_updated).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>

        <div className="ds-upgrade-card">
          <div className="ds-up-left">
            <img src="https://ui-avatars.com/api/?name=V&background=68B3C8&color=fff&rounded=true" style={{width: 24, height: 24, marginBottom: 8}} />
            <h3 className="ds-up-title">Upgrade Your<br/>Crowd</h3>
            <p className="ds-up-sub">Pro plan for better results</p>
          </div>
          <div className="ds-up-right">
            <div className="ds-chart-arcs">
               <div className="arc arc-outer"></div>
               <div className="arc arc-mid"></div>
               <div className="arc arc-inner"></div>
            </div>
            <button className="ds-btn-now">NOW</button>
          </div>
        </div>
      </div>

      <div className="ds-middle-grid">
         <div className="ds-activity-section">
            <div className="ds-section-header">
               <h2>Activity</h2>
               <div className="ds-activity-controls">
                  <span>Data updates every 3 hours</span>
                  <select className="ds-select"><option>01-07 May</option></select>
               </div>
            </div>
            <DashboardCharts />
         </div>

         <div className="ds-insights-section">
            <h2>Latest Insights</h2>
            <div className="ds-insights-list">
               <div className="ds-insight-card">
                  <div className="ds-insight-meta">Today</div>
                  <div className="ds-insight-title">Level 8 Rolldown strategy dominates Patch 16.7</div>
                  <div className="ds-insight-tag" style={{background: '#FDECEA', color: '#EB5E28'}}>Meta Shift</div>
               </div>
               <div className="ds-insight-card">
                  <div className="ds-insight-meta">Yesterday</div>
                  <div className="ds-insight-title">Bruiser / Trickshot synergy analysis</div>
                  <div className="ds-insight-tag" style={{background: '#E8F7F3', color: '#50E3C2'}}>Guide</div>
               </div>
               <div className="ds-insight-card">
                  <div className="ds-insight-meta">2 days ago</div>
                  <div className="ds-insight-title">Early game pivoting: When to cut your losses</div>
                  <div className="ds-insight-tag" style={{background: '#F0F8FF', color: '#4A90E2'}}>Analytics</div>
               </div>
               <a href="/admin/insights" className="ds-view-more">Manage Insights &gt;</a>
            </div>
         </div>
      </div>

      <div className="ds-channels-section">
         <div className="ds-ch-left">
            <h2>Revenue</h2>
            <p>Your platform<br/>statistics for <strong>1 week</strong><br/>period.</p>
         </div>
         <div className="ds-ch-cards">
            {[
              { label: 'Pro Upgrades', handle: 'Stripe', color: '#EB5E28', perc: '+$450' },
              { label: 'Ad Revenue', handle: 'Google Ads', color: '#4A90E2', perc: '+$120' },
              { label: 'Donations', handle: 'Patreon', color: '#F5A623', perc: '+$85' },
              { label: 'Server Cost', handle: 'Vercel/AWS', color: '#E1306C', perc: '-$45' },
            ].map(c => (
              <div className="ds-ch-card" key={c.label}>
                 <div className="ds-ch-icon" style={{backgroundColor: c.color}}></div>
                 <div className="ds-ch-name">{c.label}</div>
                 <div className="ds-ch-sub">{c.handle}</div>
                 <div className="ds-ch-val">{c.perc}</div>
              </div>
            ))}
            <div className="ds-ch-full-card">
               <div>Full<br/>Stats</div>
               <button>&gt;</button>
            </div>
         </div>
      </div>

      <style>{`
        .ds-overview {
           max-width: 1100px;
           margin: 0 auto;
           padding: 10px 0;
           font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
           color: #222;
        }

        .ds-header-block {
           display: flex;
           align-items: flex-start;
           gap: 15px;
           margin-bottom: 40px;
        }

        .ds-title {
           font-family: 'Courier New', Courier, serif;
           font-size: 42px;
           font-weight: 800;
           margin: 0;
           line-height: 1;
           display: flex;
           align-items: flex-start;
           gap: 15px;
        }

        .ds-title-dot {
           background: #EB5E28;
           color: white;
           font-size: 10px;
           font-family: sans-serif;
           width: 16px; height: 16px;
           border-radius: 50%;
           display: flex; align-items: center; justify-content: center;
           margin-top: 5px;
        }

        .ds-top-grid {
           display: grid;
           grid-template-columns: 1.5fr 1fr;
           gap: 40px;
           margin-bottom: 50px;
        }

        .ds-metrics-group {
           display: flex;
           justify-content: space-between;
           padding-top: 10px;
        }

        .ds-metric-label { font-size: 12px; color: #9A9A9A; display: flex; align-items: center; gap: 5px; margin-bottom: 10px; }
        .ds-metric-val { font-size: 32px; font-family: 'Courier New', Courier, serif; font-weight: 700; color: #222; }
        .ds-metric-up { color: #50E3C2; font-size: 14px; font-weight: bold; }
        .ds-metric-down { color: #EB5E28; font-size: 14px; font-weight: bold; }

        .ds-upgrade-card {
           background: #F4ECD8;
           border-radius: 12px;
           padding: 25px;
           display: flex;
           justify-content: space-between;
           position: relative;
           overflow: hidden;
        }

        .ds-up-title { color: #222; margin: 0 0 5px; font-size: 18px; line-height: 1.2; font-family: 'Courier New', Courier, serif; font-weight: bold; }
        .ds-up-sub { color: #9A9A9A; font-size: 11px; margin: 0; }

        .ds-up-right { display: flex; align-items: center; justify-content: center; }

        .ds-chart-arcs { position: absolute; right: 10px; top: 10px; width: 120px; height: 120px; border-radius: 50%; border: 4px solid #fff; border-bottom-color: transparent; border-left-color: transparent; transform: rotate(-45deg); opacity: 0.6; }
        .arc { position: absolute; border-radius: 50%; border: 4px solid transparent; border-top-color: #222; border-right-color: #222; }
        .arc-outer { width: 100px; height: 100px; top: 10px; left: 10px; border-color: #F5A623; }
        .arc-mid { width: 80px; height: 80px; top: 20px; left: 20px; border-color: #222; }
        .arc-inner { width: 60px; height: 60px; top: 30px; left: 30px; border-color: #4A90E2; }

        .ds-btn-now {
           background: #EB5E28;
           color: white;
           border: none;
           width: 50px; height: 50px;
           border-radius: 50%;
           font-size: 11px; font-weight: bold; z-index: 2;
           box-shadow: 0 5px 15px rgba(235, 94, 40, 0.4);
           cursor: pointer;
        }

        .ds-middle-grid {
           display: grid;
           grid-template-columns: 2fr 1fr;
           gap: 40px;
           margin-bottom: 50px;
        }

        .ds-section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; }
        .ds-section-header h2, .ds-insights-section h2, .ds-ch-left h2 {
           font-family: 'Courier New', Courier, serif;
           font-size: 24px; font-weight: 700; margin: 0; color: #222;
        }

        .ds-activity-controls { display: flex; align-items: center; gap: 15px; }
        .ds-activity-controls span { font-size: 11px; color: #9A9A9A; }
        .ds-select { border: 1px solid #ddd; background: transparent; padding: 4px 10px; border-radius: 12px; font-size: 12px; color: #222; outline: none; }

        .ds-insights-list { display: flex; flex-direction: column; gap: 15px; margin-top: 30px; }
        .ds-insight-card { background: #FAFAFA; border: 1px solid #EEE; padding: 15px; border-radius: 12px; transition: 0.2s; cursor: pointer; }
        .ds-insight-card:hover { background: #FFF; box-shadow: 0 5px 15px rgba(0,0,0,0.05); border-color: transparent; }
        .ds-insight-meta { font-size: 10px; font-weight: bold; color: #9A9A9A; margin-bottom: 5px; text-transform: uppercase; }
        .ds-insight-title { font-size: 13px; font-weight: bold; color: #222; margin-bottom: 12px; line-height: 1.4; }
        .ds-insight-tag { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .ds-view-more { display: block; margin-top: 5px; font-size: 12px; color: #50E3C2; text-decoration: none; font-weight: bold; }

        .ds-channels-section {
           background: #E8F7F3; /* Very soft teal/green tint */
           border-radius: 20px;
           padding: 30px;
           display: flex;
           gap: 40px;
           align-items: center;
        }
        
        .ds-ch-left p { font-size: 13px; color: #666; margin: 15px 0 0; line-height: 1.4; }

        .ds-ch-cards { display: flex; gap: 15px; flex: 1; }
        .ds-ch-card {
           background: #FFF; border-radius: 12px; padding: 20px 15px; text-align: center;
           flex: 1; box-shadow: 0 10px 20px rgba(0,0,0,0.02);
        }
        .ds-ch-icon { width: 30px; height: 30px; border-radius: 50%; margin: 0 auto 15px; }
        .ds-ch-name { font-size: 13px; font-weight: bold; color: #222; margin-bottom: 2px; }
        .ds-ch-sub { font-size: 11px; color: #9A9A9A; margin-bottom: 15px; }
        .ds-ch-val { font-size: 16px; font-family: 'Courier New', Courier, serif; font-weight: bold; }

        .ds-ch-full-card {
           background: #50E3C2; border-radius: 12px; padding: 20px 15px; color: white;
           display: flex; flex-direction: column; justify-content: space-between; flex: 1;
           font-family: 'Courier New', Courier, serif; font-weight: bold; font-size: 18px; line-height: 1.2;
           box-shadow: 0 10px 20px rgba(80, 227, 194, 0.3); position: relative; overflow: hidden;
        }
        .ds-ch-full-card::after {
           content: ''; position: absolute; right: -10px; top: -10px; background: rgba(0,0,0,0.05); width: 60px; height: 60px; border-radius: 50%;
        }
        .ds-ch-full-card button {
           width: 24px; height: 24px; border-radius: 50%; background: white; color: #50E3C2; border: none; font-weight: bold; font-size: 12px; margin-top: 20px; align-self: flex-start; cursor: pointer;
        }
      `}</style>
    </div>
  )
}
