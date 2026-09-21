import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import { Avatar, Badge, Button } from '@/shared/ui';
import { ProgressBar, Sparkline } from '@/shared/charts';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { relativeTime } from '@/shared/utils/formatNumber';
import { DATA } from '@/scope/scopeHelpers';
import slabs from '@/data/incentiveSlabs.json';
import { SLAB_COLORS } from '@/shared/utils/colors';
import { useToast } from '@/shared/context/ToastContext';
import { officerProductivity, TIER_VARIANT, TIER_COLOR } from '@/features/officers/officerProductivity';
import { FlagBadges, VisitBar } from '@/features/officers/OfficerProductivityTable';

const STATUS_VARIANT = { Active: 'success', Idle: 'warning', Inactive: 'danger' };

/** Slide-in side panel with an officer's profile, metrics, visits, DSAs and incentive progress */
export default function OfficerDetailPanel({ officer, onClose }) {
  const toast = useToast();
  const dsas = officer ? DATA.dsas.filter((d) => d.officerId === officer.id) : [];
  const nextSlab = officer ? slabs.slice().reverse().find((s) => s.minPct > officer.targetPct) : null;
  const prod = officer ? officerProductivity(officer) : null;
  const visits = officer ? dsas.slice(0, 4).map((d, i) => ({ dsa: d.firm, time: new Date(new Date(officer.lastVisit).getTime() - i * 2.5 * 3600e3).toISOString(), outcome: ['2 files collected', 'Follow-up on pending KYC', 'New DSA briefing', 'Documents verified'][i] })) : [];

  return (
    <AnimatePresence>
      {officer && (
        <>
          <motion.div className="overlay" style={{ padding: 0, alignItems: 'stretch', justifyContent: 'flex-end' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose} />
          <motion.aside className="side-panel" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
            <div className="side-panel-head">
              <Avatar name={officer.name} size={48} />
              <div className="flex-1">
                <div style={{ fontSize: 15, fontWeight: 700 }}>{officer.name}</div>
                <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMapPin size={12} /> {officer.branchName} Branch · {officer.city}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant={STATUS_VARIANT[officer.status]} dot>{officer.status}</Badge>
                  <Badge variant="brand">{officer.slab}</Badge>
                  {prod && <Badge variant={TIER_VARIANT[prod.tier]}>{prod.tier} · {prod.score}</Badge>}
                </div>
              </div>
              <button className="btn-icon" onClick={onClose}><FiX size={18} /></button>
            </div>

            <div className="side-panel-body">
              <div className="flex-col gap-2" style={{ fontSize: 12 }}>
                <span className="flex items-center gap-2"><FiPhone size={13} style={{ color: 'var(--text-muted)' }} /> +91 {officer.phone}</span>
                <span className="flex items-center gap-2"><FiMail size={13} style={{ color: 'var(--text-muted)' }} /> {officer.email}</span>
              </div>

              <div className="grid grid-2" style={{ gap: 10 }}>
                <Mini label="Disbursement (MTD)" value={formatCurrency(officer.monthlyDisbursement)} />
                <Mini label="Target %" value={`${officer.targetPct}%`} color={officer.targetPct >= 80 ? 'var(--success)' : officer.targetPct >= 60 ? 'var(--warning)' : 'var(--danger)'} />
                <Mini label="Visits today / week" value={`${officer.visitsToday} / ${officer.visitsWeek}`} />
                <Mini label="Files (approved)" value={`${officer.filesSubmitted} (${officer.filesApproved})`} />
              </div>

              <div>
                <div className="label" style={{ marginBottom: 6 }}>6-month disbursement trend</div>
                <Sparkline data={officer.trend} width={360} height={48} />
              </div>

              {prod && (
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Productivity & coverage</div>
                  <div style={{ marginBottom: 10 }}><FlagBadges flags={prod.flags} max={4} /></div>
                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <Mini label="DSA coverage" value={`${prod.coveragePct}%`} color={TIER_COLOR[prod.coveragePct >= 80 ? 'High' : prod.coveragePct >= 65 ? 'Medium' : 'Low']} sub={`${prod.visited} of ${prod.totalDsas} DSAs visited`} />
                    <Mini label="Visit → file" value={`${prod.conversionPct}%`} color={TIER_COLOR[prod.conversionPct >= 45 ? 'High' : prod.conversionPct >= 30 ? 'Medium' : 'Low']} sub={`${officer.productiveVisits} files / ${prod.dsaVisits} visits`} />
                    <Mini label="Collection" value={`${prod.collectionPct}%`} color={TIER_COLOR[prod.collectionPct >= 80 ? 'High' : prod.collectionPct >= 60 ? 'Medium' : 'Low']} sub={`${formatCurrency(officer.collectionAmount)} of ${formatCurrency(officer.collectionDue)}`} />
                    <Mini label="Customer spread" value={`${prod.fairnessPct}%`} color={TIER_COLOR[prod.fairnessPct >= 75 ? 'High' : prod.fairnessPct >= 55 ? 'Medium' : 'Low']} sub={`${officer.uniqueCustomers} unique / ${officer.customerVisits} visits`} />
                  </div>
                  <div className="flex justify-between" style={{ fontSize: 12, margin: '14px 0 6px' }}>
                    <span>DSA visits this month</span>
                    <span className="num"><b>{prod.dsaVisits}</b> / {officer.dsaVisitTarget} <span className="muted">(4 per DSA)</span></span>
                  </div>
                  {[...(officer.dsaVisits || [])].sort((a, b) => b.visits - a.visits).map((d) => (
                    <div className="flex items-center gap-2" key={d.dsaId} style={{ padding: '4px 0', fontSize: 12 }}>
                      <span style={{ width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.firm}>{d.firm}</span>
                      <div className="flex-1"><VisitBar value={d.visits} target={d.target} /></div>
                      <span className="muted num" style={{ width: 48, textAlign: 'right' }}>{d.filesCollected} files</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="label" style={{ marginBottom: 8 }}>Recent visits</div>
                <div className="timeline">
                  {visits.map((v, i) => (
                    <div className={`timeline-item ${i === 0 ? 'success' : 'info'}`} key={i}>
                      <div className="t-text"><b>{v.dsa}</b> — {v.outcome}</div>
                      <div className="t-time">{relativeTime(v.time)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>DSAs managed ({dsas.length})</div>
                {dsas.map((d) => (
                  <div className="list-row" key={d.id} style={{ padding: '8px 0' }}>
                    <div className="flex-1">
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{d.firm}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{d.files} files · {d.approvalRate}% approval</div>
                    </div>
                    <Badge variant={{ High: 'success', Average: 'warning', Low: 'danger', Inactive: 'neutral' }[d.quality]}>{d.quality}</Badge>
                  </div>
                ))}
              </div>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>Incentive progress</div>
                <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 6 }}>
                  <span>Earned MTD: <b className="num">{formatCurrency(officer.incentiveMTD)}</b></span>
                  <span style={{ color: SLAB_COLORS[officer.slab], fontWeight: 600 }}>{officer.slab}</span>
                </div>
                <ProgressBar value={officer.targetPct} max={nextSlab ? nextSlab.minPct : 120} color={SLAB_COLORS[officer.slab]} />
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  {nextSlab ? `${(nextSlab.minPct - officer.targetPct).toFixed(1)} pts to ${nextSlab.slab} · ≈ ${formatCurrency(officer.monthlyTarget * (nextSlab.minPct - officer.targetPct) / 100)} more disbursement` : 'Top slab reached 🎉'}
                </div>
              </div>
            </div>

            <div className="side-panel-foot">
              <Button className="btn-block" onClick={() => toast('Full profile view (prototype)', 'info')}>View Full Profile</Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Mini({ label, value, color, sub }) {
  return (
    <div style={{ background: 'var(--input-bg)', borderRadius: 6, padding: '10px 12px' }}>
      <div className="label" style={{ fontSize: 10 }}>{label}</div>
      <div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
