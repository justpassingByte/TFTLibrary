'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChampionAvatar } from '@/components/ui/champion-avatar';

interface PatchChange {
  id: string;
  patch: string;
  entity: string;
  entity_type: string;
  entity_id?: string;
  change_type: string;
  stat: string;
  before_val: string | null;
  after_val: string | null;
  score: number;
  tier: number | null;
  raw_text: string;
  iconUrl?: string;
}

interface PatchPrediction {
  id: string;
  patch: string;
  name: string;
  tier: string;
  score: number;
  reason: string;
  key_units: string[];
  buffed_entities: string[];
  nerfed_entities: string[];
  sort_order: number;
}

const TIER_COLORS: Record<string, string> = {
  S: '#ff2244',
  A: '#FF7A00',
  B: '#fbbf24',
  NERFED: '#9ca3af',
};

const CHANGE_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  buff: { color: '#39FF14', bg: 'rgba(57,255,20,0.08)', icon: '▲' },
  nerf: { color: '#ff2244', bg: 'rgba(255,34,68,0.08)', icon: '▼' },
  adjust: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', icon: '~' },
};

export default function PatchNotesTuningClient() {
  const [changes, setChanges] = useState<PatchChange[]>([]);
  const [predictions, setPredictions] = useState<PatchPrediction[]>([]);
  const [availablePatches, setAvailablePatches] = useState<string[]>([]);
  const [selectedPatch, setSelectedPatch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'buff' | 'nerf' | 'adjust'>('buff');
  const [dirty, setDirty] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchData = useCallback(async (patch?: string) => {
    setLoading(true);
    try {
      const url = patch ? `${apiUrl}/api/admin/patch-notes?patch=${patch}` : `${apiUrl}/api/admin/patch-notes`;
      const res = await fetch(url);
      const data = await res.json();
      setChanges(data.changes || []);
      setPredictions(data.predictions || []);
      setAvailablePatches(data.available_patches || []);
      setSelectedPatch(data.patch || '');
    } catch (err) {
      console.error('Failed to fetch patch data:', err);
    }
    setLoading(false);
  }, [apiUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function updateChange(id: string, field: string, value: any) {
    setChanges(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    setDirty(true);
  }

  function updatePrediction(id: string, field: string, value: any) {
    setPredictions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setDirty(true);
  }

  async function saveAllChanges() {
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/admin/patch-notes/changes/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: changes.map(c => ({ id: c.id, score: c.score, change_type: c.change_type })) }),
      });

      for (const pred of predictions) {
        await fetch(`${apiUrl}/api/admin/patch-notes/predictions/${pred.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier: pred.tier,
            score: pred.score,
            reason: pred.reason,
            name: pred.name,
            key_units: pred.key_units,
            sort_order: pred.sort_order,
          }),
        });
      }

      setDirty(false);
      alert('✅ All changes saved!');
    } catch (err) {
      alert('❌ Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setSaving(false);
  }

  async function deletePrediction(id: string) {
    if (!confirm('Delete this prediction?')) return;
    try {
      await fetch(`${apiUrl}/api/admin/patch-notes/predictions/${id}`, { method: 'DELETE' });
      setPredictions(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete');
    }
  }

  async function addPrediction() {
    try {
      const res = await fetch(`${apiUrl}/api/admin/patch-notes/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patch: selectedPatch,
          name: 'New Comp',
          tier: 'B',
          score: 0,
          reason: 'Enter reason...',
          key_units: [],
          buffed_entities: [],
          nerfed_entities: [],
          sort_order: predictions.length,
        }),
      });
      const pred = await res.json();
      setPredictions(prev => [...prev, pred]);
    } catch (err) {
      alert('Failed to create prediction');
    }
  }

  const filteredChanges = changes.filter(c => c.change_type === activeTab);
  const buffCount = changes.filter(c => c.change_type === 'buff').length;
  const nerfCount = changes.filter(c => c.change_type === 'nerf').length;
  const adjCount = changes.filter(c => c.change_type === 'adjust').length;

  if (loading) {
    return <div className="pn-loading">Loading patch data...</div>;
  }

  if (!selectedPatch) {
    return (
      <div className="pn-empty">
        <h2>No Patch Data</h2>
        <p>Crawl patch notes from the <a href="/admin/sync">Sync Data</a> page first.</p>
      </div>
    );
  }

  return (
    <div className="pn-page">
      {/* Header */}
      <div className="pn-header">
        <div>
          <h2 className="pn-heading">Patch Notes Tuning</h2>
          <p className="pn-sub">Adjust impact scores and meta predictions</p>
        </div>
        <div className="pn-header-actions">
          <select
            className="pn-patch-select"
            value={selectedPatch}
            onChange={e => fetchData(e.target.value)}
          >
            {availablePatches.map(p => <option key={p} value={p}>Patch {p}</option>)}
          </select>
          <button className="pn-save-btn" onClick={saveAllChanges} disabled={saving || !dirty}>
            {saving ? '⏳ Saving...' : dirty ? '💾 Save All' : '✅ Saved'}
          </button>
        </div>
      </div>

      {/* Changes Section */}
      <div className="pn-section">
        <h3 className="pn-section-title">Patch {selectedPatch} Changes</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          
          {/* Champions Group */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', color: '#333' }}>⚔️ Champions</h4>
              <select 
                value={activeTab} 
                onChange={e => setActiveTab(e.target.value as any)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="buff">All Tiers</option>
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
                <option value="4">Tier 4</option>
                <option value="5">Tier 5</option>
              </select>
            </div>
            
            <div className="pn-changes-list">
              {changes.filter(c => c.entity_type === 'unit' && (activeTab === 'buff' || c.tier === parseInt(activeTab))).map(change => (
                <ChangeEditRow key={change.id} change={change} updateChange={updateChange} />
              ))}
            </div>
          </div>

          {/* Other Groups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Traits */}
            <div>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>🛡️ Traits</h4>
              <div className="pn-changes-list">
                {changes.filter(c => c.entity_type === 'trait').map(change => (
                  <ChangeEditRow key={change.id} change={change} updateChange={updateChange} />
                ))}
              </div>
            </div>

            {/* Augments */}
            <div>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>💠 Augments</h4>
              <div className="pn-changes-list">
                {changes.filter(c => c.entity_type === 'augment').map(change => (
                  <ChangeEditRow key={change.id} change={change} updateChange={updateChange} />
                ))}
              </div>
            </div>

            {/* Systems */}
            <div>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>⚙️ Systems & Items</h4>
              <div className="pn-changes-list">
                {changes.filter(c => c.entity_type === 'system' || c.entity_type === 'item').map(change => (
                  <ChangeEditRow key={change.id} change={change} updateChange={updateChange} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Predictions Section */}
      <div className="pn-section">
        <div className="pn-section-header">
          <h3 className="pn-section-title">🔮 Meta Predictions</h3>
          <button className="pn-add-btn" onClick={addPrediction}>+ Add Comp</button>
        </div>

        <div className="pn-predictions-grid">
          {predictions.map(pred => {
            const tierColor = TIER_COLORS[pred.tier] || '#9ca3af';
            return (
              <div key={pred.id} className="pn-pred-card" style={{ borderTopColor: tierColor }}>
                {/* Tier + Name */}
                <div className="pn-pred-top">
                  <select
                    className="pn-tier-select"
                    value={pred.tier}
                    onChange={e => updatePrediction(pred.id, 'tier', e.target.value)}
                    style={{ color: tierColor, borderColor: tierColor + '40' }}
                  >
                    <option value="S">S Tier</option>
                    <option value="A">A Tier</option>
                    <option value="B">B Tier</option>
                    <option value="NERFED">NERFED</option>
                  </select>
                  <input
                    className="pn-pred-score"
                    type="number"
                    step="0.5"
                    value={pred.score}
                    onChange={e => updatePrediction(pred.id, 'score', parseFloat(e.target.value))}
                    style={{ color: pred.score > 0 ? '#39FF14' : pred.score < 0 ? '#ff2244' : '#fbbf24' }}
                  />
                </div>

                <input
                  className="pn-pred-name"
                  value={pred.name}
                  onChange={e => updatePrediction(pred.id, 'name', e.target.value)}
                />

                {/* Key Units */}
                <div className="pn-pred-units">
                  {pred.key_units.map(u => (
                    <ChampionAvatar key={u} name={u} className="pn-pred-avatar" />
                  ))}
                </div>

                <textarea
                  className="pn-pred-reason"
                  value={pred.reason}
                  onChange={e => updatePrediction(pred.id, 'reason', e.target.value)}
                  rows={3}
                />

                <div className="pn-pred-tags">
                  {pred.buffed_entities.length > 0 && (
                    <span className="pn-tag buff">Buffed: {pred.buffed_entities.join(', ')}</span>
                  )}
                  {pred.nerfed_entities.length > 0 && (
                    <span className="pn-tag nerf">Nerfed: {pred.nerfed_entities.join(', ')}</span>
                  )}
                </div>

                <button className="pn-delete-btn" onClick={() => deletePrediction(pred.id)}>🗑️ Delete</button>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .pn-page { max-width: 1100px; margin: 0 auto; }
        .pn-loading, .pn-empty { text-align: center; padding: 60px 20px; color: #9A9A9A; }
        .pn-empty h2 { color: #222; margin-bottom: 8px; }
        .pn-empty a { color: #4A90E2; text-decoration: underline; }

        .pn-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
        .pn-heading { font-family: 'Courier New', Courier, serif; font-size: 32px; font-weight: 800; color: #222; margin: 0; }
        .pn-sub { font-size: 13px; color: #9A9A9A; margin: 4px 0 0; }

        .pn-header-actions { display: flex; gap: 12px; align-items: center; }
        .pn-patch-select {
          padding: 8px 14px; border-radius: 8px; border: 1px solid #EEE;
          font-size: 13px; font-weight: 600; color: #222; background: #FFF; cursor: pointer;
        }
        .pn-save-btn {
          padding: 10px 20px; border-radius: 8px; border: none;
          font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s;
          background: #4A90E2; color: #FFF;
        }
        .pn-save-btn:hover:not(:disabled) { background: #357ABD; }
        .pn-save-btn:disabled { background: #E8E8E8; color: #A9A9A9; cursor: default; }

        .pn-section { background: #FFF; border-radius: 16px; padding: 25px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .pn-section-title { font-family: 'Courier New', Courier, serif; font-size: 22px; font-weight: 800; color: #222; margin: 0 0 15px; }
        .pn-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }

        .pn-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .pn-tab {
          padding: 8px 16px; border-radius: 8px; border: 1px solid #EEE;
          font-size: 12px; font-weight: bold; cursor: pointer; background: #FFF; color: #777; transition: 0.2s;
        }
        .pn-tab:hover { border-color: #CCC; }
        .pn-tab.active.buff { background: rgba(57,255,20,0.08); color: #39FF14; border-color: rgba(57,255,20,0.3); }
        .pn-tab.active.nerf { background: rgba(255,34,68,0.08); color: #ff2244; border-color: rgba(255,34,68,0.3); }
        .pn-tab.active.adjust { background: rgba(251,191,36,0.08); color: #fbbf24; border-color: rgba(251,191,36,0.3); }

        .pn-changes-list { display: flex; flex-direction: column; gap: 8px; }
        .pn-change-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; border-radius: 10px; background: #FAFAFA;
          border-left: 3px solid transparent; gap: 15px; transition: 0.15s;
        }
        .pn-change-row:hover { background: #F5F5F5; }

        .pn-change-entity { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .pn-avatar { width: 32px; height: 32px; flex-shrink: 0; }
        .pn-type-badge {
          width: 32px; height: 32px; border-radius: 6px; border: 1px solid #EEE;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: bold; color: #999; background: #FFF; flex-shrink: 0;
        }

        .pn-entity-info { display: flex; flex-direction: column; min-width: 0; }
        .pn-entity-name { font-size: 13px; font-weight: 700; color: #222; }
        .pn-entity-stat { font-size: 11px; color: #9A9A9A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pn-tier-tag { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; }

        .pn-change-controls { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .pn-type-select { padding: 4px 8px; border-radius: 6px; border: 1px solid #EEE; font-size: 11px; font-weight: 600; color: #555; background: #FFF; }
        .pn-score-control { display: flex; align-items: center; gap: 8px; }
        .pn-slider { width: 100px; accent-color: #4A90E2; }
        .pn-score-value { font-size: 14px; font-weight: 800; min-width: 35px; text-align: right; font-family: 'Courier New', monospace; }

        .pn-add-btn {
          padding: 8px 16px; border-radius: 8px; border: 1px dashed #CCC;
          font-size: 12px; font-weight: bold; cursor: pointer; background: #FFF; color: #666; transition: 0.2s;
        }
        .pn-add-btn:hover { border-color: #4A90E2; color: #4A90E2; }

        .pn-predictions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px; }
        .pn-pred-card {
          background: #FAFAFA; border-radius: 12px; padding: 18px;
          border-top: 3px solid #ccc; display: flex; flex-direction: column; gap: 10px;
        }

        .pn-pred-top { display: flex; justify-content: space-between; align-items: center; }
        .pn-tier-select {
          padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 800;
          border: 1px solid; background: #FFF; cursor: pointer; text-transform: uppercase;
        }
        .pn-pred-score {
          width: 60px; padding: 5px 8px; border-radius: 6px; border: 1px solid #EEE;
          font-size: 14px; font-weight: 800; text-align: right; background: #FFF;
          font-family: 'Courier New', monospace;
        }

        .pn-pred-name {
          font-size: 15px; font-weight: 700; color: #222; border: none; background: transparent;
          padding: 4px 0; border-bottom: 1px solid transparent; transition: 0.2s;
          font-family: 'Courier New', Courier, serif;
        }
        .pn-pred-name:focus { border-bottom-color: #4A90E2; outline: none; }

        .pn-pred-units { display: flex; gap: 6px; flex-wrap: wrap; }
        .pn-pred-avatar { width: 28px; height: 28px; }

        .pn-pred-reason {
          font-size: 12px; color: #666; border: 1px solid #EEE; border-radius: 8px;
          padding: 8px 10px; resize: vertical; background: #FFF; line-height: 1.5;
          font-family: inherit;
        }
        .pn-pred-reason:focus { border-color: #4A90E2; outline: none; }

        .pn-pred-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .pn-tag { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px; }
        .pn-tag.buff { background: rgba(57,255,20,0.1); color: #39FF14; }
        .pn-tag.nerf { background: rgba(255,34,68,0.1); color: #ff2244; }

        .pn-delete-btn {
          padding: 5px 10px; border-radius: 6px; border: 1px solid #EEE;
          font-size: 11px; cursor: pointer; background: #FFF; color: #999; transition: 0.2s;
          align-self: flex-end;
        }
        .pn-delete-btn:hover { border-color: #ff2244; color: #ff2244; background: rgba(255,34,68,0.05); }
      `}</style>
    </div>
  );
}

function ChangeEditRow({ change, updateChange }: { change: PatchChange, updateChange: (id: string, field: string, val: any) => void }) {
  const ct = CHANGE_COLORS[change.change_type] || CHANGE_COLORS.adjust;
  return (
    <div className="pn-change-row" style={{ borderLeftColor: ct.color }}>
      <div className="pn-change-entity">
        {change.entity_type === 'unit' ? (
          <ChampionAvatar id={change.entity_id} name={change.entity} icon={change.iconUrl} className="pn-avatar" />
        ) : change.iconUrl ? (
          <div className="pn-avatar-wrapper" style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: '#1e1e24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={change.iconUrl} alt={change.entity} style={{ width: 24, height: 24, objectFit: 'contain' }} onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerText = change.entity.substring(0, 2).toUpperCase();
            }} />
          </div>
        ) : (
          <div className="pn-type-badge" style={{ borderColor: ct.color + '60' }}>
            {change.entity_type === 'trait' ? 'T' : change.entity_type === 'augment' ? 'A' : 'S'}
          </div>
        )}
        <div className="pn-entity-info">
          <span className="pn-entity-name">{change.entity}</span>
          <span className="pn-entity-stat" title={change.stat}>
            {change.before_val && change.after_val
              ? `${change.stat}: ${change.before_val} → ${change.after_val}`
              : change.stat}
          </span>
          {change.tier && <span className="pn-tier-tag">Tier {change.tier}</span>}
        </div>
      </div>
      <div className="pn-change-controls">
        <select
          className="pn-type-select"
          value={change.change_type}
          onChange={e => updateChange(change.id, 'change_type', e.target.value)}
        >
          <option value="buff">Buff</option>
          <option value="nerf">Nerf</option>
          <option value="adjust">Adjust</option>
        </select>
        <div className="pn-score-control">
          <input
            type="range"
            min="-5"
            max="5"
            step="0.5"
            value={change.score}
            onChange={e => updateChange(change.id, 'score', parseFloat(e.target.value))}
            className="pn-slider"
          />
          <span className="pn-score-value" style={{
            color: change.score > 0 ? '#39FF14' : change.score < 0 ? '#ff2244' : '#fbbf24'
          }}>
            {change.score > 0 ? '+' : ''}{change.score}
          </span>
        </div>
      </div>
    </div>
  );
}
