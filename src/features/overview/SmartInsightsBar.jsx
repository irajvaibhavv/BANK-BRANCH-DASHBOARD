import { useState } from 'react';
import { HiSparkles } from 'react-icons/hi2';
import { FiMic, FiBarChart2, FiHome, FiUsers, FiUser } from 'react-icons/fi';
import { Button } from '@/shared/ui';

export const INSIGHT_VIEWS = [
  { id: 'board', label: 'Board Review', icon: <FiBarChart2 style={{ color: '#16A34A' }} /> },
  { id: 'branch', label: 'Branch Performance', icon: <FiHome style={{ color: '#5b4a7a' }} /> },
  { id: 'dsa', label: 'DSA Analysis', icon: <FiUsers style={{ color: '#DC2626' }} /> },
  { id: 'officer', label: 'Officer Scorecard', icon: <FiUser style={{ color: '#2563EB' }} /> },
];

const DEFAULT_TEXT = 'Show me a board-ready performance review: branch-wise performance, top 5 branches, DSA quality comparison, and disbursement trend for the last quarter with officer rankings';

/** Saralya AI bar (white card, purple left border, prompt input, mic + Analyze). Chips and Analyze load pre-built views. */
export default function SmartInsightsBar({ view, onChangeView, onAnalyze }) {
  const [text, setText] = useState(DEFAULT_TEXT);

  return (
    <div className="insights-bar fade-up">
      <div className="insights-row">
        <HiSparkles size={20} style={{ color: '#D97706', flexShrink: 0 }} />
        <div className="insights-input">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onAnalyze?.(text)} placeholder="Ask about your network…" />
        </div>
        <button className="icon-circle" title="Voice input (prototype)"><FiMic /></button>
        <Button icon={<HiSparkles />} onClick={() => onAnalyze?.(text)} style={{ borderRadius: 8 }}>Analyze</Button>
      </div>
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        {INSIGHT_VIEWS.map((c) => (
          <button key={c.id} className={`chip ${view === c.id ? 'active' : ''}`} onClick={() => onChangeView?.(view === c.id ? null : c.id)}>
            {c.icon}{c.label}
          </button>
        ))}
        <span className="insights-hint">Type a question or click a chip — press Enter or Analyze</span>
      </div>
    </div>
  );
}
