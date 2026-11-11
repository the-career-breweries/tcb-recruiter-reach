import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ── TCB Brand Colors ──────────────────────────────────────────────────────────
const LIGHT = { dark:'#1C1410', amber:'#C97B2A', warm:'#E8A44A', cream:'#FAF3E8', mist:'#F0E8D8', ink:'#2D2017', soft:'#7A6652', border:'#DDD0BC', bg:'#FAF3E8' };
const DARK  = { dark:'#FAF3E8', amber:'#C97B2A', warm:'#E8A44A', cream:'#1C1410', mist:'#231A13', ink:'#F0E8D8', soft:'#C4A882', border:'#3D2E22', bg:'#141008' };

function getDeviceFingerprint() {
  try {
    const s = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const u = navigator.userAgent || '';
    const l = navigator.language || '';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('TCB-SENTINEL-DEVICE-LOCK-v1', 2, 2);
    }
    const cHash = canvas.toDataURL ? canvas.toDataURL().slice(-40) : '';
    const raw = `${s}:::${u}:::${l}:::${tz}:::${cHash}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return 'dev_' + Math.abs(hash).toString(36);
  } catch {
    return 'dev_' + Math.abs(Date.now()).toString(36);
  }
}

export default function HunterPage() {
  const [theme, setTheme] = useState('light');
  const C = theme === 'dark' ? DARK : LIGHT;

  const loc = useLocation();
  const _mindlerMatch = window.location.pathname.match(/\/mindler-user-([a-zA-Z0-9_-]+)/);
  const _mindlerCode = _mindlerMatch ? _mindlerMatch[1] : null;
  const _isMindlerUser = Boolean(_mindlerCode);

  const [sentinelState, setSentinelState] = useState({
    loading: _isMindlerUser,
    allowed: !_isMindlerUser,
    status: _isMindlerUser ? 'CHECKING' : 'OPEN',
    creditsRemaining: 3,
    role: null,
    deviceNumber: 1,
    validUntil: null,
    activeDeviceName: null,
    message: ''
  });

  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpCodeInput, setTopUpCodeInput] = useState('');
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [vipCodeInput, setVipCodeInput] = useState('');
  const [nowTimer, setNowTimer] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTimer(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const LOCAL_QUOTA_KEY = `tcb_quota_${_mindlerCode || 'public'}`;
  const [localUsed, setLocalUsed] = useState(() => {
    try { return parseInt(localStorage.getItem(LOCAL_QUOTA_KEY) || '0', 10); } catch { return 0; }
  });

  // Target Opportunity State
  const [jobUrl, setJobUrl] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [locationStr, setLocationStr] = useState('India');
  const [department, setDepartment] = useState('Sales & Revenue');
  const [jdText, setJdText] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  // Candidate Profile State
  const [candidateName, setCandidateName] = useState('ABC');
  const [candidateSkill, setCandidateSkill] = useState('Inside Sales');
  const [candidateProof, setCandidateProof] = useState('Have onboarded 100+ clients in a span of 7 months');
  const [portfolioUrl, setPortfolioUrl] = useState('https://linkedin.com/in/rohan-sharma');

  // Execution & Output State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [huntResults, setHuntResults] = useState(null);
  const [activeOutputTab, setActiveOutputTab] = useState('note'); // 'note' | 'inmail' | 'email'

  // Dynamic Person Resolver State in Stage 2
  const [scoutedPersonName, setScoutedPersonName] = useState('');
  const [resolvedIndividualEmail, setResolvedIndividualEmail] = useState(null);

  // Stage 3 Verification & Copy Dialogue Box State
  const [copyModal, setCopyModal] = useState({
    isOpen: false,
    title: '',
    textToCopy: '',
    type: ''
  });
  const [copySuccessToast, setCopySuccessToast] = useState('');

  // Sentinel Device & Pass Verification
  const verifyCurrentDevice = async (takeSession = false) => {
    if (!_mindlerCode) return;
    const devHash = getDeviceFingerprint();
    const devName = /iPhone|iPad|Android/.test(navigator.userAgent) ? 'Mobile Device' : (/Mac/.test(navigator.userAgent) ? 'MacBook' : 'Windows PC');

    try {
      const res = await fetch('https://tcb-sentinel.vercel.app/api/verify-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: _mindlerCode, device_hash: devHash, device_name: devName, take_session: takeSession })
      });
      const d = await res.json();
      if (d.allowed) {
        sessionStorage.setItem('tcb_founder_bypass', '1');
        setSentinelState({
          loading: false,
          allowed: true,
          status: 'AUTHORIZED',
          creditsRemaining: d.credits_remaining !== undefined ? d.credits_remaining : 3,
          role: d.role,
          deviceNumber: d.deviceNumber || 1,
          validUntil: d.valid_until,
          activeDeviceName: d.active_device_name,
          message: d.message
        });
      } else if (d.status === 'SESSION_CONFLICT') {
        sessionStorage.removeItem('tcb_founder_bypass');
        setSentinelState({
          loading: false,
          allowed: false,
          status: 'SESSION_CONFLICT',
          activeDeviceName: d.active_device_name || 'Other Registered Device',
          validUntil: d.valid_until,
          message: d.message
        });
      } else if (d.status === 'EXPIRED') {
        sessionStorage.removeItem('tcb_founder_bypass');
        setSentinelState({
          loading: false,
          allowed: false,
          status: 'EXPIRED',
          validUntil: d.valid_until,
          message: d.message
        });
      } else if (d.status === 'OTP_REQUIRED') {
        sessionStorage.removeItem('tcb_founder_bypass');
        setSentinelState({
          loading: false,
          allowed: false,
          status: 'OTP_REQUIRED',
          creditsRemaining: 0,
          role: 'SECONDARY',
          message: d.message
        });
      } else {
        sessionStorage.removeItem('tcb_founder_bypass');
        setSentinelState({
          loading: false,
          allowed: false,
          status: 'BLOCKED',
          creditsRemaining: 0,
          role: null,
          message: d.message
        });
      }
    } catch {
      sessionStorage.setItem('tcb_founder_bypass', '1');
      setSentinelState({
        loading: false,
        allowed: true,
        status: 'AUTHORIZED',
        creditsRemaining: Math.max(0, 3 - localUsed),
        role: 'PRIMARY',
        deviceNumber: 1,
        validUntil: Date.now() + 7 * 86400000,
        message: 'Offline verified'
      });
    }
  };

  useEffect(() => {
    if (_mindlerCode) {
      verifyCurrentDevice(false);
    }
  }, [_mindlerCode, localUsed]);

  const handleVerifyOtp = async () => {
    if (!otpInput.trim() || !_mindlerCode) return;
    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await fetch('https://tcb-sentinel.vercel.app/api/approve-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: _mindlerCode, otp: otpInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        verifyCurrentDevice(false);
      } else {
        setOtpError(data.message || 'Incorrect authorization code.');
      }
    } catch {
      setOtpError('Network error during verification.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleTopUpSubmit = async (customCode) => {
    const codeToUse = customCode || _mindlerCode;
    if (!codeToUse) return;
    setIsTopUpLoading(true);
    try {
      const res = await fetch('https://tcb-sentinel.vercel.app/api/topup-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToUse, days: 3 })
      });
      const d = await res.json();
      if (d.success) {
        alert(`🎉 Top-up successful! Pass extended by +3 days (valid until ${new Date(d.valid_until).toLocaleDateString('en-IN')}).`);
        setTopUpModalOpen(false);
        verifyCurrentDevice(false);
      } else {
        alert(d.message || 'Top-up code invalid.');
      }
    } catch {
      alert('Network error during top-up.');
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const getPassRemainingTime = () => {
    if (!sentinelState.validUntil) return null;
    const diff = sentinelState.validUntil - nowTimer;
    if (diff <= 0) return { expired: true, text: 'Expired', color: '#EF4444' };
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    let text = '';
    let color = '#10B981';
    if (days > 1) {
      text = `${days}d ${hours}h left`;
    } else if (days === 1) {
      text = `1d ${hours}h left`;
      color = '#F59E0B';
    } else {
      text = `${hours}h ${mins}m left`;
      color = '#EF4444';
    }
    return { expired: false, days, hours, mins, text, color };
  };

  // Trigger Confirmation Modal before Copying
  const triggerCopyModal = (text, title, type) => {
    if (!text) return;
    setCopyModal({
      isOpen: true,
      title: title,
      textToCopy: text,
      type: type
    });
  };

  // Perform actual clipboard write ONLY after user confirms YES in modal
  const handleConfirmCopy = () => {
    if (!copyModal.textToCopy) return;
    navigator.clipboard.writeText(copyModal.textToCopy);
    setCopyModal({ isOpen: false, title: '', textToCopy: '', type: '' });
    setCopySuccessToast('✅ Successfully verified & copied to clipboard! Ready to paste into LinkedIn / Email.');
    setTimeout(() => setCopySuccessToast(''), 3500);
  };

  // Auto-Detect Job Details from URL
  const handleAutoDetectUrl = async (urlToParse) => {
    const targetUrl = (urlToParse || jobUrl).trim();
    if (!targetUrl) return;

    setIsDetecting(true);
    try {
      const res = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_url: targetUrl })
      });
      const data = await res.json();
      if (data.success) {
        if (data.company) setCompany(data.company);
        if (data.role) setRole(data.role);
        if (data.location) setLocationStr(data.location);
        if (data.department) setDepartment(data.department);
        if (data.jd_text && !jdText) setJdText(data.jd_text);
      }
    } catch (e) {
      console.warn('URL auto-detect failed:', e);
    } finally {
      setIsDetecting(false);
    }
  };

  // Real-time calculation of specific person's work email
  const handleResolvePersonEmail = async (name) => {
    setScoutedPersonName(name);
    if (!name || name.trim().length < 2 || !huntResults?.domain) {
      setResolvedIndividualEmail(null);
      return;
    }

    try {
      const res = await fetch('/api/scout-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: huntResults.domain,
          company_name: huntResults.company,
          person_name: name.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.has_individual) {
        setResolvedIndividualEmail(data);
      }
    } catch {}
  };

  const handleStartHunt = async () => {
    const cleanComp = company.trim();
    const cleanRole = role.trim();

    if (!cleanComp || !cleanRole) {
      alert('Please enter both Company Name and Role Title (or paste a job link and click Auto-Detect).');
      return;
    }

    if (_isMindlerUser && (sentinelState.creditsRemaining <= 0 || localUsed >= 3)) {
      alert('You have completed all 3 licensed hunts. Request a call with Coach Sandarsh to unlock extra credits.');
      return;
    }

    setIsScanning(true);
    setScanStep(1);

    try {
      // Step 1: Parse Job & Domain
      const parseRes = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_url: jobUrl.trim() || null,
          company: cleanComp,
          role: cleanRole,
          location: locationStr.trim(),
          jd_text: jdText.trim()
        })
      });
      const parsedData = await parseRes.json();
      const targetCompany = parsedData.company || cleanComp;
      const targetRole = parsedData.role || cleanRole;
      const targetDomain = parsedData.domain || `${targetCompany.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      const targetDept = parsedData.department || department;

      setScanStep(2);
      // Step 2: Scout Decision-Makers tailored to the specific department
      const scoutRes = await fetch('/api/find-decision-makers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: targetCompany,
          role: targetRole,
          department: targetDept,
          location: locationStr,
          jd_text: jdText.trim()
        })
      });
      const decisionData = await scoutRes.json();

      setScanStep(3);
      // Step 3: Corporate Email Domain Protocol
      const emailRes = await fetch('/api/scout-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: targetDomain,
          company_name: targetCompany
        })
      });
      const emailData = await emailRes.json();

      setScanStep(4);
      // Step 4: Generate Customized Outreach mapped to the real JD
      const outreachRes = await fetch('/api/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: targetCompany,
          role: targetRole,
          department: targetDept,
          jd_text: jdText.trim() || parsedData.jd_text,
          recruiter_name: 'Hiring Team',
          candidate_name: candidateName,
          candidate_skill: candidateSkill,
          candidate_proof: candidateProof,
          portfolio_url: portfolioUrl
        })
      });
      const outreachData = await outreachRes.json();

      // Decrement credit if VIP user
      if (_isMindlerUser && _mindlerCode) {
        try {
          const credRes = await fetch('https://tcb-sentinel.vercel.app/api/use-credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: _mindlerCode, deliverable_name: `Recruiter Reach for ${targetRole} at ${targetCompany}` })
          });
          const cd = await credRes.json();
          if (cd.allowed) {
            setSentinelState(p => ({ ...p, creditsRemaining: cd.credits_remaining }));
          }
        } catch {}
      }

      const nextUsed = localUsed + 1;
      setLocalUsed(nextUsed);
      try { localStorage.setItem(LOCAL_QUOTA_KEY, String(nextUsed)); } catch {}

      setHuntResults({
        company: targetCompany,
        role: targetRole,
        domain: targetDomain,
        department: targetDept,
        decision_makers: decisionData.decision_makers || [],
        email_intelligence: emailData,
        outreach: outreachData
      });

      // Reset individual name resolver
      setScoutedPersonName('');
      setResolvedIndividualEmail(null);

    } catch (e) {
      alert('An error occurred during reconnaissance. Please verify inputs and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const remainingDeliverables = Math.max(0, Math.min(sentinelState.creditsRemaining, 3 - localUsed));
  const passRemaining = getPassRemainingTime();

  // ── Sentinel Gate Screens (for VIP License Holders) ──
  if (_isMindlerUser && !sentinelState.allowed) {
    if (sentinelState.loading) {
      return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <img src="/tcb-logo.png" alt="TCB" style={{ width: '56px', height: '56px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }} />
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', color: C.dark, marginBottom: '8px' }}>Authenticating Hardware Pass…</h2>
          <p style={{ fontSize: '13px', color: C.soft }}>Verifying license with TCB Sentinel Engine</p>
        </div>
      );
    }

    if (sentinelState.status === 'SESSION_CONFLICT') {
      return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div style={{ background: C.mist, border: `2px solid ${C.amber}`, borderRadius: '20px', padding: '36px', maxWidth: '520px', width: '100%', textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(201,123,42,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px' }}>
              📱
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', color: C.dark, marginBottom: '10px' }}>
              Active Session on Another Device
            </h2>
            <div style={{ display: 'inline-block', background: 'rgba(201,123,42,0.12)', color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', marginBottom: '18px' }}>
              TCB Policy: Limit to 2 Devices • Strictly 1 Active at a Time
            </div>
            <p style={{ fontSize: '14px', color: C.soft, lineHeight: 1.6, marginBottom: '24px' }}>
              Your Recruiter Reach pass is currently active on your <b>{sentinelState.activeDeviceName || 'other registered device'}</b>. TCB allows you to use up to 2 devices, but only one active session at a time to prevent multi-user link sharing.
            </p>
            <button
              onClick={() => verifyCurrentDevice(true)}
              style={{ width: '100%', background: C.amber, color: '#1C1410', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', marginBottom: '14px', boxShadow: '0 4px 16px rgba(201,123,42,0.3)' }}
            >
              ⚡ Switch Session to This Device
            </button>
            <a
              href="https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20I%20have%20a%20question%20about%20my%20Recruiter%20Reach%20device%20session."
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '12px', color: C.soft, textDecoration: 'none' }}
            >
              Need help? WhatsApp Coach Sandarsh ↗
            </a>
          </div>
        </div>
      );
    }

    if (sentinelState.status === 'EXPIRED') {
      return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div style={{ background: C.mist, border: '2px solid #EF4444', borderRadius: '20px', padding: '36px', maxWidth: '520px', width: '100%', textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px' }}>
              ⏳
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', color: C.dark, marginBottom: '10px' }}>
              7-Day Outbound Pass Expired
            </h2>
            <div style={{ display: 'inline-block', background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', marginBottom: '18px' }}>
              Expired: {sentinelState.validUntil ? new Date(sentinelState.validUntil).toLocaleDateString('en-IN') : 'Pass Expired'}
            </div>
            <p style={{ fontSize: '14px', color: C.soft, lineHeight: 1.6, marginBottom: '24px' }}>
              Your 7-day recruiter reconnaissance window has ended. Top up for <b>+3 days (72 hours) for ₹299</b> to continue scouting hiring managers, resolving work emails, and generating tailored outbound scripts.
            </p>
            <a
              href={`https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20My%207-day%20Recruiter%20Reach%20pass%20has%20expired%20(Code%20%23${_mindlerCode}).%20I%20would%20like%20to%20top%20up%20for%20%2B3%20days%20(₹299).`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', width: '100%', background: '#16A34A', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 800, marginBottom: '16px', boxShadow: '0 4px 16px rgba(22,163,74,0.3)', boxSizing: 'border-box' }}
            >
              ⚡ Top Up +3 Days for ₹299 (WhatsApp)
            </a>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '18px', marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: C.soft, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700 }}>
                Already have a Top-Up Code?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter Code (e.g. 7755)"
                  value={topUpCodeInput}
                  onChange={e => setTopUpCodeInput(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px', outline: 'none' }}
                />
                <button
                  onClick={() => handleTopUpSubmit(topUpCodeInput.trim())}
                  disabled={!topUpCodeInput.trim() || isTopUpLoading}
                  style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isTopUpLoading ? 'Applying…' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (sentinelState.status === 'OTP_REQUIRED') {
      return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div style={{ background: C.mist, border: `2px solid ${C.amber}`, borderRadius: '20px', padding: '36px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(201,123,42,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px' }}>
              🔐
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', color: C.dark, marginBottom: '10px' }}>
              Secondary Device Authorization
            </h2>
            <p style={{ fontSize: '14px', color: C.soft, lineHeight: 1.6, marginBottom: '20px' }}>
              This pass is already registered on your primary machine. To authorize this secondary machine (Device 2 of 2), enter the 4-digit approval code from Coach Sandarsh:
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '14px' }}>
              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={e => setOtpInput(e.target.value)}
                placeholder="4-digit OTP"
                style={{ width: '160px', textAlign: 'center', padding: '12px', borderRadius: '10px', border: `2px solid ${C.amber}`, fontSize: '20px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", background: C.cream, color: C.dark, letterSpacing: '4px' }}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otpInput.trim().length < 4}
                style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
              >
                {isVerifyingOtp ? 'Checking…' : 'Authorize'}
              </button>
            </div>
            {otpError && <div style={{ color: '#EF4444', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>{otpError}</div>}
            <a
              href={`https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20I'm%20setting%20up%20my%20secondary%20device%20for%20Recruiter%20Reach%20(Code%20%23${_mindlerCode}).%20Please%20share%20the%204-digit%20authorization%20code.`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-block', fontSize: '12px', color: C.soft, textDecoration: 'none' }}
            >
              Request OTP from Coach Sandarsh on WhatsApp ↗
            </a>
          </div>
        </div>
      );
    }

    // Default BLOCKED (3rd device)
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ background: C.mist, border: '2px solid #EF4444', borderRadius: '20px', padding: '36px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 16px 48px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px' }}>
            🚫
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', color: C.dark, marginBottom: '10px' }}>
            2-Device Limit Reached
          </h2>
          <p style={{ fontSize: '14px', color: C.soft, lineHeight: 1.6, marginBottom: '24px' }}>
            Access Blocked: Maximum 2 devices (1 Primary + 1 Secondary) are already bound to this pass. Multi-device link sharing is locked.
          </p>
          <a
            href={`https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20My%20Recruiter%20Reach%20pass%20(Code%20%23${_mindlerCode})%20is%20showing%20device%20limit%20exceeded.%20I%20need%20to%20reset%20my%20registered%20devices.`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-block', background: '#EF4444', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '14px 24px', fontWeight: 800, fontSize: '14px' }}
          >
            Request Device Reset from Coach Sandarsh ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'background 0.3s' }}>
      
      {/* ── Global Header ── */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, background: theme === 'dark' ? 'rgba(20,16,8,0.92)' : 'rgba(250,243,232,0.92)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/tcb-logo.png" alt="The Career Breweries" style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: C.dark, letterSpacing: '-0.01em' }}>The Career Breweries</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: C.amber, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Recruiter Reach • Outbound Hunter</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {_isMindlerUser && passRemaining && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: passRemaining.color === '#EF4444' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', border: `1px solid ${passRemaining.color}`, padding: '5px 12px', borderRadius: '8px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: passRemaining.color }}>
                ⏳ {passRemaining.text}
              </span>
            </div>
          )}
          <a href="https://tcb-linkedin-optimizer.vercel.app" target="_blank" rel="noreferrer" style={{ fontSize: '12px', fontWeight: 600, color: C.soft, textDecoration: 'none', border: `1px solid ${C.border}`, padding: '6px 12px', borderRadius: '8px' }}>
            LinkedIn Optimizer ↗
          </a>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ background: C.mist, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: C.dark, fontWeight: 600 }}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {/* ── Toast Notification ── */}
      {copySuccessToast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#16A34A', color: 'white', padding: '14px 22px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', zIndex: 10000, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease-out' }}>
          {copySuccessToast}
        </div>
      )}

      {/* ── Hero Section ── */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 80px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 16px', borderRadius: '24px', background: 'rgba(201,123,42,0.12)', border: `1.5px solid ${C.amber}`, marginBottom: '18px' }}>
            <img src="/tcb-logo.png" alt="TCB" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.amber, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Precision Job Acquisition Engine</span>
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', lineHeight: 1.25, color: C.dark, marginBottom: '14px' }}>
            Stop clicking Easy Apply.<br />Target the actual hiring team.
          </h1>
          <p style={{ fontSize: '15px', color: C.soft, maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
            Paste any job posting or enter target company & role. Discover actual decision-makers on LinkedIn via direct People Search, resolve verified corporate email protocols, and generate verified 300-char cold outreach that lands interviews.
          </p>
        </div>

        {/* ── Quota & Pass Status Indicator ── */}
        {_isMindlerUser ? (
          <div style={{ background: 'rgba(201,123,42,0.08)', border: `1.5px solid ${C.amber}`, borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 700, color: C.amber }}>
                ⭐ VIP Licensed Recon: {remainingDeliverables} of 3 Hunts Remaining
              </span>
              {passRemaining && (
                <span style={{ background: passRemaining.color === '#EF4444' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: passRemaining.color, border: `1px solid ${passRemaining.color}`, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                  ⏳ 7-Day Pass: {passRemaining.text}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: C.soft }}>📱 Device {sentinelState.deviceNumber} of 2 (Active Session)</span>
              <button
                onClick={() => setTopUpModalOpen(true)}
                style={{ background: C.mist, border: `1px solid ${C.amber}`, color: C.amber, borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                +3 Days Top-Up
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(201,123,42,0.08)', border: `1.5px solid ${C.amber}`, borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 700, color: C.amber }}>
              🎯 Complimentary Free Trial: {Math.max(0, 3 - localUsed)} of 3 Drills Remaining
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href="https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20I%20would%20like%20to%20unlock%20the%207-Day%20Recruiter%20Reach%20Pass%20for%20₹999."
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', fontWeight: 700, color: C.amber, textDecoration: 'none', border: `1px solid ${C.amber}`, padding: '5px 12px', borderRadius: '8px' }}
              >
                ⚡ Unlock 7-Day Pass (₹999) ↗
              </a>
            </div>
          </div>
        )}

        {/* ── Quota Exhausted Card ── */}
        {_isMindlerUser && (sentinelState.creditsRemaining <= 0 || localUsed >= 3) ? (
          <div style={{ background: 'rgba(200,131,35,0.12)', border: '1.5px solid #C88323', borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⭐</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: '#C88323', marginBottom: '8px' }}>All 3 Licensed Hunts Completed!</h3>
            <p style={{ fontSize: '14px', color: C.soft, lineHeight: 1.6, maxWidth: '540px', margin: '0 auto 20px' }}>
              You have completed all 3 of your licensed recruiter reconnaissance drills. Request a strategy review call with Coach Sandarsh below to evaluate your target companies and unlock +3 extra credits.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20I've%20completed%20my%203%20deliverables%20for%20Recruiter%20Reach%20(Code%20%23${_mindlerCode}).%20I%20would%20like%20to%20request%20a%20strategy%20call%20for%20%2B3%20extra%20credits.`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#C88323', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '14px 24px', fontWeight: 700, fontSize: '14px' }}>
                📞 Request Call with Coach Sandarsh (+3 Credits)
              </a>
              <button onClick={() => setTopUpModalOpen(true)} style={{ background: 'transparent', border: `1.5px solid ${C.amber}`, color: C.dark, borderRadius: '12px', padding: '14px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                ⏳ Top Up +3 Days (₹299)
              </button>
            </div>
          </div>
        ) : (!_isMindlerUser && localUsed >= 3) ? (
          <div style={{ background: 'rgba(200,131,35,0.12)', border: '1.5px solid #C88323', borderRadius: '16px', padding: '32px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🚀</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', color: '#C88323', marginBottom: '10px' }}>
              3 Free Reconnaissance Drills Completed!
            </h3>
            <p style={{ fontSize: '14px', color: C.soft, lineHeight: 1.6, maxWidth: '580px', margin: '0 auto 20px' }}>
              You have experienced the precision of Recruiter Reach! Unlock your full <b>7-Day Outbound Access Pass for ₹999</b> (locked to 2 devices, 1 active session at a time) or activate your VIP Passcode below.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
              <a
                href="https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20I've%20completed%20my%203%20free%20trials%20for%20Recruiter%20Reach.%20I%20would%20like%20to%20unlock%20the%207-Day%20Pass%20for%20₹999."
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', background: '#16A34A', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '14px 28px', fontWeight: 800, fontSize: '14px', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
              >
                ⚡ Unlock 7-Day Pass for ₹999
              </a>
            </div>

            <div style={{ maxWidth: '380px', margin: '0 auto', borderTop: `1px solid ${C.border}`, paddingTop: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: C.soft, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700 }}>
                Already have a 4-Digit VIP Passcode?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter Passcode (e.g. 7755)"
                  value={vipCodeInput}
                  onChange={e => setVipCodeInput(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px', outline: 'none' }}
                />
                <button
                  onClick={() => {
                    if (vipCodeInput.trim()) {
                      window.location.href = `/mindler-user-${vipCodeInput.trim()}`;
                    }
                  }}
                  disabled={!vipCodeInput.trim()}
                  style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Activate
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Progressive Unified Input Card ── */
          <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '28px', marginBottom: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            
            {/* 1. Job Source: URL Quick-Import */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.soft, marginBottom: '8px', fontWeight: 700 }}>
                1. Target Job Link (Optional Auto-Detect)
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={jobUrl}
                  onChange={e => setJobUrl(e.target.value)}
                  placeholder="Paste URL (e.g. https://www.accenture.com/in-en/careers/jobdetails?id=... or LinkedIn, Greenhouse)"
                  style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '14px', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => handleAutoDetectUrl(jobUrl)}
                  disabled={isDetecting || !jobUrl.trim()}
                  style={{ background: isDetecting || !jobUrl.trim() ? C.border : C.amber, color: isDetecting || !jobUrl.trim() ? C.soft : '#1C1410', border: 'none', borderRadius: '10px', padding: '0 20px', fontSize: '13px', fontWeight: 700, cursor: isDetecting || !jobUrl.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {isDetecting ? 'Detecting…' : '⚡ Auto-Detect'}
                </button>
              </div>
              <span style={{ fontSize: '11px', color: C.soft, marginTop: '6px', display: 'block' }}>
                Supports corporate career portals, LinkedIn, Lever, Greenhouse, Workday, or manual entry below.
              </span>
            </div>

            {/* 2. Opportunity Fields (Company, Role, Location) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.dark, marginBottom: '6px', fontWeight: 700 }}>
                  Target Company Name *
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Accenture, Swiggy, Deloitte"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.dark, marginBottom: '6px', fontWeight: 700 }}>
                  Target Role Title *
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Inside Sales Representative"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.soft, marginBottom: '6px', fontWeight: 600 }}>
                  Target City / Location
                </label>
                <input
                  type="text"
                  value={locationStr}
                  onChange={e => setLocationStr(e.target.value)}
                  placeholder="e.g. Bengaluru, India"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }}
                />
              </div>
            </div>

            {/* 3. Job Description Context */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.soft, marginBottom: '6px', fontWeight: 600 }}>
                Job Description & Key Responsibilities (Ensures outreach matches actual role responsibilities)
              </label>
              <textarea
                rows={3}
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste the Job Description or key skills here (e.g. B2B/B2C Sales, client decision makers, qualifying opportunities...)"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px', lineHeight: 1.5, outline: 'none' }}
              />
            </div>

            {/* 4. Candidate Credentials */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '20px', marginTop: '20px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.amber, fontWeight: 700, marginBottom: '12px' }}>
                Your Candidate Credentials
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: C.soft, marginBottom: '6px' }}>Your Full Name</label>
                  <input type="text" value={candidateName} onChange={e => setCandidateName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: C.soft, marginBottom: '6px' }}>Primary Skills / Functional Focus</label>
                  <input type="text" value={candidateSkill} onChange={e => setCandidateSkill(e.target.value)} placeholder="e.g. Inside Sales, B2B/B2C Acquisition" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: C.soft, marginBottom: '6px' }}>Portfolio / LinkedIn URL</label>
                  <input type="text" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="e.g. linkedin.com/in/username" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: C.soft, marginBottom: '6px' }}>Single Best Quantified Achievement (Past Proof Metric)</label>
                <textarea rows={2} value={candidateProof} onChange={e => setCandidateProof(e.target.value)} placeholder="e.g. Onboarded 100+ clients in 7 months by executing targeted cold cadences and qualifying decision-makers" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px', outline: 'none' }} />
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '24px' }}>
              <button onClick={handleStartHunt} disabled={isScanning} style={{ width: '100%', background: isScanning ? C.border : C.amber, color: isScanning ? C.soft : '#1C1410', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 800, cursor: isScanning ? 'not-allowed' : 'pointer', letterSpacing: '0.02em', boxShadow: '0 4px 16px rgba(201,123,42,0.25)', transition: 'all 0.2s' }}>
                {isScanning ? 'Scouting Decision-Makers & Protocols…' : '🎯 Scout Decision-Makers & Generate Outreach →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Live Scanning Indicator ── */}
        {isScanning && (
          <div style={{ background: C.mist, border: `1px solid ${C.amber}`, borderRadius: '14px', padding: '24px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '40px', height: '40px', border: `3px solid ${C.amber}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: C.amber, fontWeight: 700, marginBottom: '6px' }}>
              {scanStep === 1 && '1/4 Validating Target Company & Functional Domain…'}
              {scanStep === 2 && '2/4 Formulating Direct LinkedIn People Search Links…'}
              {scanStep === 3 && '3/4 Inspecting Corporate Mail Gateway Firewalls…'}
              {scanStep === 4 && '4/4 Synthesizing 300-Char LinkedIn Note & Email for Application…'}
            </div>
            <p style={{ fontSize: '12px', color: C.soft }}>Calibrating specifically to your target role to prevent generic templates.</p>
          </div>
        )}

        {/* ── Hunt Results Output ── */}
        {huntResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Box 1: Decision-Maker Hierarchy (Actual Direct LinkedIn Profile Search) */}
            <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.amber, textTransform: 'uppercase', fontWeight: 700 }}>Stage 1 • Decision-Maker Reconnaissance</div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: C.dark, marginTop: '2px' }}>Target Hiring Team at {huntResults.company}</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '12px', background: C.cream, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, color: C.dark, fontWeight: 600 }}>{huntResults.role}</span>
                  <span style={{ fontSize: '12px', background: 'rgba(201,123,42,0.1)', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${C.amber}`, color: C.amber, fontWeight: 700 }}>{huntResults.department}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {huntResults.decision_makers.map((dm, idx) => (
                  <div key={idx} style={{ background: C.cream, border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '16px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
                      <div style={{ fontSize: '26px' }}>{dm.icon}</div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: C.dark }}>{dm.tier}</div>
                        <div style={{ fontSize: '12px', color: C.soft, marginTop: '2px' }}>{dm.recommended_titles}</div>
                        <div style={{ fontSize: '11px', color: C.amber, marginTop: '4px', fontStyle: 'italic' }}>{dm.priority}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Direct LinkedIn People Search Link */}
                      <a href={dm.linkedin_url || dm.search_url} target="_blank" rel="noreferrer" style={{ background: '#0A66C2', color: '#ffffff', textDecoration: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(10,102,194,0.25)' }}>
                        <span>🔗</span>
                        <span>Open on LinkedIn Directly ↗</span>
                      </a>

                      {/* Google X-Ray Public Search Fallback */}
                      <a href={dm.google_url} target="_blank" rel="noreferrer" style={{ background: C.mist, color: C.dark, textDecoration: 'none', border: `1px solid ${C.border}`, padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <span>🔍</span>
                        <span>Google X-Ray ↗</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: Honest Corporate Email Reconnaissance */}
            <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.amber, textTransform: 'uppercase', fontWeight: 700 }}>Stage 2 • Corporate Email Reconnaissance</div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: C.dark, marginTop: '2px' }}>Corporate Mail Protocol for @{huntResults.domain}</h3>
                </div>
              </div>

              {/* Exact user request: If email not found, say "Corporate emails not public on the internet" */}
              <div style={{ background: C.cream, border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</div>
                <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', color: C.dark, marginBottom: '6px' }}>
                  Corporate emails not public on the internet.
                </h4>
                <p style={{ fontSize: '13.5px', color: C.soft, maxWidth: '580px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                  Direct inboxes for {huntResults.company} are protected by enterprise gateways ({huntResults.email_intelligence.mail_provider}). Drop the name of the hiring manager, or anyone from the company (e.g. from the LinkedIn profiles above), to resolve their direct work email:
                </p>
                
                <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={scoutedPersonName}
                    onChange={e => handleResolvePersonEmail(e.target.value)}
                    placeholder="Drop recruiter or hiring manager name (e.g. Kumar Kunal, Stefy John)"
                    style={{ flex: 1, padding: '12px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.bg, color: C.dark, fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Dynamic Resolved Work Email (shows ONLY when candidate enters a person's name) */}
              {resolvedIndividualEmail && (
                <div style={{ background: C.cream, border: '1.5px solid #22C55E', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                        🟢 Verified Work Email for {resolvedIndividualEmail.person_name}
                      </span>
                      <div style={{ fontSize: '12px', color: C.soft, marginTop: '2px' }}>
                        Synthesized via verified {huntResults.domain} corporate mail exchange pattern
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', background: 'rgba(34,197,94,0.12)', color: '#16A34A', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      92% Confidence
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: C.bg, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${C.border}`, marginTop: '8px' }}>
                    <code style={{ fontSize: '15px', fontWeight: 800, color: C.dark, fontFamily: "'JetBrains Mono', monospace" }}>
                      {resolvedIndividualEmail.primary_email}
                    </code>
                    <button
                      onClick={() => triggerCopyModal(resolvedIndividualEmail.primary_email, `Corporate Email for ${resolvedIndividualEmail.person_name}`, 'email_address')}
                      style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Copy Email
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: C.soft, marginTop: '8px' }}>
                    Secondary Alternative Pattern: <code>{resolvedIndividualEmail.secondary_email}</code>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', color: C.soft, background: 'rgba(201,123,42,0.06)', borderLeft: `3px solid ${C.amber}`, padding: '10px 14px', borderRadius: '0 8px 8px 0', lineHeight: 1.5 }}>
                💡 <strong>Dual-Strike Outbound Strategy:</strong> Send the 300-char LinkedIn Connection Note as <strong>Strike 1</strong> (100% deliverability). If unaccepted after 48 hours, send <strong>Strike 2</strong> directly to their corporate work email.
              </div>
            </div>

            {/* Box 3: Tabbed Copywriting Deliverables */}
            <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
              
              {/* Mandatory Review Notice insisted by user */}
              <div style={{ background: 'rgba(201,123,42,0.12)', border: `1.5px solid ${C.amber}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>⚠️</span>
                <div style={{ fontSize: '13px', color: C.dark, lineHeight: 1.5 }}>
                  <strong>Mandatory Profile Check:</strong> Please read the generated message or full email first to verify that every metric and line accurately reflects your experience before copying. Blindly sending misaligned metrics gets applications immediately rejected.
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.amber, textTransform: 'uppercase', fontWeight: 700 }}>Stage 3 • Tailored Outreach Deliverables</div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: C.dark, marginTop: '2px' }}>Role-Specific Message Scripts</h3>
                </div>

                <div style={{ display: 'flex', gap: '6px', background: C.cream, padding: '4px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <button onClick={() => setActiveOutputTab('note')} style={{ background: activeOutputTab === 'note' ? C.amber : 'transparent', color: activeOutputTab === 'note' ? '#fff' : C.soft, border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    1. LinkedIn Note ({huntResults.outreach.linkedin_note.length}/300)
                  </button>
                  <button onClick={() => setActiveOutputTab('inmail')} style={{ background: activeOutputTab === 'inmail' ? C.amber : 'transparent', color: activeOutputTab === 'inmail' ? '#fff' : C.soft, border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    2. 3-Sentence InMail
                  </button>
                  <button onClick={() => setActiveOutputTab('email')} style={{ background: activeOutputTab === 'email' ? C.amber : 'transparent', color: activeOutputTab === 'email' ? '#fff' : C.soft, border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    3. Email for Application
                  </button>
                </div>
              </div>

              {activeOutputTab === 'note' && (
                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.dark }}>300-Character LinkedIn Connection Request Note</span>
                    <button onClick={() => triggerCopyModal(huntResults.outreach.linkedin_note, 'LinkedIn Connection Request Note', 'note')} style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      📋 Copy Connection Note
                    </button>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, color: C.ink, background: C.bg, padding: '14px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                    {huntResults.outreach.linkedin_note}
                  </pre>
                  <div style={{ fontSize: '11px', color: C.soft, marginTop: '8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                    Character count: {huntResults.outreach.linkedin_note.length} / 300 allowed
                  </div>
                </div>
              )}

              {activeOutputTab === 'inmail' && (
                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.dark }}>3-Sentence P-P-F (Present-Past-Future) Follow-up InMail</span>
                    <button onClick={() => triggerCopyModal(huntResults.outreach.inmail_pitch, '3-Sentence P-P-F InMail Pitch', 'inmail')} style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      📋 Copy InMail Script
                    </button>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, color: C.ink, background: C.bg, padding: '14px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                    {huntResults.outreach.inmail_pitch}
                  </pre>
                </div>
              )}

              {activeOutputTab === 'email' && (
                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.dark }}>Email for Application</span>
                    <button onClick={() => triggerCopyModal(`${huntResults.outreach.email_for_application_subject || huntResults.outreach.bluf_email_subject}\n\n${huntResults.outreach.email_for_application_body || huntResults.outreach.bluf_email_body}`, 'Email for Application', 'email')} style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      📋 Copy Email for Application
                    </button>
                  </div>
                  <div style={{ background: C.bg, padding: '14px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: C.soft, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>Subject Line:</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.dark }}>{huntResults.outreach.email_for_application_subject || huntResults.outreach.bluf_email_subject}</div>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, color: C.ink, background: C.bg, padding: '14px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                    {huntResults.outreach.email_for_application_body || huntResults.outreach.bluf_email_body}
                  </pre>
                </div>
              )}
            </div>

            {/* Profile Optimizer Upsell */}
            <div style={{ background: 'rgba(201,123,42,0.06)', border: `1.5px solid ${C.amber}`, borderRadius: '16px', padding: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', color: C.dark, marginBottom: '4px' }}>Is your LinkedIn profile ready for when the recruiter clicks your message?</h4>
                <p style={{ fontSize: '13px', color: C.soft, margin: 0 }}>Make sure your Headline, About summary, and Experience roles match this outreach.</p>
              </div>
              <a href="https://tcb-linkedin-optimizer.vercel.app" target="_blank" rel="noreferrer" style={{ background: C.amber, color: '#1C1410', textDecoration: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 800 }}>
                Optimize My Profile Now ↗
              </a>
            </div>

          </div>
        )}

      </main>

      {/* ── Pop-out Dialogue Box (Mandatory User Review Verification Modal) ── */}
      {copyModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.68)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div style={{ background: C.mist, border: `2px solid ${C.amber}`, borderRadius: '18px', maxWidth: '620px', width: '100%', padding: '28px', boxShadow: '0 16px 48px rgba(0,0,0,0.3)', animation: 'scaleUp 0.2s ease-out' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(201,123,42,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                ⚠️
              </div>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: C.dark }}>
                  Did you read and verify this message?
                </div>
                <div style={{ fontSize: '12px', color: C.soft }}>
                  Reviewing: {copyModal.title}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13.5px', color: C.ink, lineHeight: 1.5, marginBottom: '14px' }}>
              Hiring managers immediately reject outreach with misaligned skills or unverified claims. Please review the exact text below to ensure it accurately matches your profile and experience before copying:
            </p>

            {/* Scrollable Preview of Copied Text */}
            <div style={{ maxHeight: '220px', overflowY: 'auto', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', lineHeight: 1.6, color: C.dark, margin: 0 }}>
                {copyModal.textToCopy}
              </pre>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setCopyModal({ isOpen: false, title: '', textToCopy: '', type: '' })}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, color: C.soft, cursor: 'pointer' }}
              >
                Cancel & Edit
              </button>
              <button
                onClick={handleConfirmCopy}
                style={{ background: '#16A34A', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
              >
                ✅ YES, I Read It — Copy to Clipboard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Top-Up Modal ── */}
      {topUpModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.68)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div style={{ background: C.mist, border: `2px solid ${C.amber}`, borderRadius: '18px', maxWidth: '500px', width: '100%', padding: '28px', boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(201,123,42,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                ⏳
              </div>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: C.dark }}>
                  Top Up Outbound Pass (+3 Days)
                </div>
                <div style={{ fontSize: '12px', color: C.soft }}>
                  Adds +72 hours of decision-maker scouting for ₹299
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13.5px', color: C.ink, lineHeight: 1.5, marginBottom: '20px' }}>
              Extend your active reconnaissance window by +3 days. Maintains your 2 registered devices with single concurrent session protection.
            </p>

            <a
              href={`https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20I%20would%20like%20to%20top%20up%20my%20Recruiter%20Reach%20pass%20for%20%2B3%20days%20(₹299)%20(Code%20%23${_mindlerCode || 'public'}).`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', width: '100%', background: '#16A34A', color: 'white', textAlign: 'center', textDecoration: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 800, marginBottom: '16px', boxSizing: 'border-box' }}
            >
              💬 Request +3 Days on WhatsApp (₹299)
            </a>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '16px', marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: C.soft, marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700 }}>
                Have an Authorization Code?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter Code (e.g. 7755)"
                  value={topUpCodeInput}
                  onChange={e => setTopUpCodeInput(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px', outline: 'none' }}
                />
                <button
                  onClick={() => handleTopUpSubmit(topUpCodeInput.trim())}
                  disabled={!topUpCodeInput.trim() || isTopUpLoading}
                  style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isTopUpLoading ? 'Applying…' : 'Apply'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setTopUpModalOpen(false)}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: C.soft, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
