import { useLocation, useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { Button } from '@/shared/ui';
import { useToast } from '@/shared/context/ToastContext';
import { NAV } from '@/app/layout/Sidebar';

/** Per-screen primary action (mirrors Saralya's "Monthly Report*" + "+ New Loan" pair) */
const ACTIONS = {
  '/overview': { label: 'New Target', toast: 'Target setup (prototype)' },
  '/drilldown': { label: 'Export View', toast: 'Branch performance exported (prototype)' },
  '/map': { label: 'Export Map', toast: 'Map exported (prototype)' },
  '/leaderboard': { label: 'Share Board', toast: 'Leaderboard shared (prototype)' },
  '/dsa': { label: 'Onboard DSA', toast: 'DSA onboarding form (prototype)' },
  '/pipeline': { label: 'New File', toast: 'New loan file (prototype)' },
  '/activity': { label: 'Broadcast', toast: 'Broadcast to officers (prototype)' },
  '/incentives': { label: 'Run Payout', toast: 'Payout run scheduled (prototype)' },
  '/reports': { label: 'New Report', toast: 'Use the builder below' },
  '/alerts': { label: 'New Rule', toast: 'Open Alert Settings to add thresholds' },
  '/settings': { label: 'Add User', toast: 'Use the Add User button below' },
};

export default function PageHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const title = NAV.find((n) => location.pathname.startsWith(n.to))?.label || (location.pathname.startsWith('/settings') ? 'Settings' : 'Dashboard');
  const action = ACTIONS[Object.keys(ACTIONS).find((k) => location.pathname.startsWith(k))] || ACTIONS['/overview'];
  return (
    <div className="page-header">
      <h1>{title}</h1>
      <div className="page-actions">
        <Button variant="secondary" onClick={() => navigate('/reports')}>Monthly Report</Button>
        <Button icon={<FiPlus size={14} />} onClick={() => toast(action.toast, 'info')}>{action.label}</Button>
      </div>
    </div>
  );
}
