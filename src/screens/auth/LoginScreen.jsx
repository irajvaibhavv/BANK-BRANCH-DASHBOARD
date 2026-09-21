import { useEffect, useRef, useState } from 'react';
import { BRAND } from '../../config/brand';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrendingUp, FiArrowLeft, FiShield } from 'react-icons/fi';
import { useAuth, DUMMY_OTP } from '../../context/AuthContext';
import users from '../../data/users.json';

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(135deg, #1a0f35 0%, #46237a 55%, #8b5cf6 100%)' },
  card: { width: 400, background: '#fff', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', padding: 32, color: '#1a0f2e' },
  logo: { width: 52, height: 52, borderRadius: 12, background: '#46237a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' },
  input: { height: 44, border: '1px solid #e2dff0', borderRadius: 6, fontSize: 13, padding: '0 12px', width: '100%', outline: 'none', background: '#fff', color: '#1a0f2e' },
  otp: { width: 56, height: 56, border: '1px solid #e2dff0', borderRadius: 8, fontSize: 24, fontWeight: 700, textAlign: 'center', outline: 'none', background: '#fff', color: '#1a0f2e' },
};

export default function LoginScreen() {
  const { isAuthenticated, findUserByPhone, login } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => { if (step === 'otp') refs[0].current?.focus(); }, [step]); // eslint-disable-line

  // once signed in (including right after OTP), the setup / landing page is always the first screen
  if (isAuthenticated) return <Navigate to="/setup" replace />;

  const matched = findUserByPhone(phone);

  const sendOtp = (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) return setError('Enter a valid 10-digit mobile number');
    if (!matched) return setError('This number is not registered. Try one of the demo numbers below.');
    setError(''); setSending(true);
    setTimeout(() => { setSending(false); setStep('otp'); }, 500);
  };

  const onOtpChange = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = d; setOtp(next); setError('');
    if (d && i < 3) refs[i + 1].current?.focus();
    if (next.every(Boolean)) verify(next.join(''));
  };
  const onOtpKey = (i, e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i - 1].current?.focus(); };
  const verify = (code) => {
    if (code !== DUMMY_OTP) return setError('Incorrect OTP. Hint: 1234');
    login(phone); // the redirect above takes over and opens /setup
  };

  return (
    <div style={styles.page}>
      <motion.div style={styles.card} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div style={styles.logo}><FiTrendingUp /></div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#46237a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{BRAND.company}</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{BRAND.product}</h1>
          <p style={{ fontSize: 12, color: '#5b4a7a', marginTop: 4 }}>Sign in with your registered mobile number</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.form key="phone" onSubmit={sendOtp} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <label className="label" style={{ display: 'block', marginBottom: 8 }}>Mobile number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ ...styles.input, width: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7fc', fontWeight: 600, color: '#5b4a7a' }}>+91</div>
                <input style={styles.input} placeholder="10-digit number" value={phone} maxLength={10} inputMode="numeric" autoFocus
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }} />
              </div>
              {matched && <div style={{ marginTop: 8, fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}><FiShield /> Detected role: <b>{matched.roleLabel}</b></div>}
              {error && <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{error}</div>}
              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18, height: 44 }} disabled={sending}>{sending ? 'Sending…' : 'Send OTP'}</button>
            </motion.form>
          ) : (
            <motion.div key="otp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <button onClick={() => { setStep('phone'); setOtp(['', '', '', '']); setError(''); }} className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}><FiArrowLeft /> Change number</button>
              <p style={{ fontSize: 12, color: '#5b4a7a', marginBottom: 14 }}>Enter the 4-digit OTP sent to <b style={{ color: '#1a0f2e' }}>+91 {phone}</b></p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                {otp.map((d, i) => (
                  <input key={i} ref={refs[i]} style={{ ...styles.otp, borderColor: d ? '#46237a' : '#e2dff0' }} value={d} inputMode="numeric" maxLength={1}
                    onChange={(e) => onOtpChange(i, e.target.value)} onKeyDown={(e) => onOtpKey(i, e)} />
                ))}
              </div>
              {error && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626', textAlign: 'center' }}>{error}</div>}
              <button className="btn btn-primary btn-block" style={{ marginTop: 18, height: 44 }} onClick={() => verify(otp.join(''))} disabled={!otp.every(Boolean)}>Verify & Continue</button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#9b8fbb', marginTop: 12 }}>Demo OTP: <b>1234</b></p>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2dff0' }}>
          <div className="label" style={{ marginBottom: 8, fontSize: 11 }}>Demo accounts</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {users.map((u) => (
              <button key={u.id} onClick={() => { setPhone(u.phone); setError(''); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2dff0', background: phone === u.phone ? '#ede5ff' : '#fff', fontSize: 12, color: '#1a0f2e' }}>
                <span style={{ fontWeight: 600 }}>{u.roleLabel}</span>
                <span className="num" style={{ color: '#5b4a7a' }}>{u.phone}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
