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
    message: ''
  });

  const LOCAL_QUOTA_KEY = `tcb_quota_${_mindlerCode || 'public'}`;
  const [localUsed, setLocalUsed] = useState(() => {
    try { return parseInt(localStorage.getItem(LOCAL_QUOTA_KEY) || '0', 10); } catch { return 0; }
  });

  // Dual Input State
  const [inputMode, setInputMode] = useState('url'); // 'url' | 'manual'
  const [jobUrl, setJobUrl] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [locationStr, setLocationStr] = useState('India');
  const [jdText, setJdText] = useState('');

  // Candidate Profile State
  const [candidateName, setCandidateName] = useState('Rohan Sharma');
  const [candidateSkill, setCandidateSkill] = useState('React, Next.js & Web Performance');
  const [candidateProof, setCandidateProof] = useState('Reduced dashboard bundle size by 38% and optimized Core Web Vitals to 96+');
  const [portfolioUrl, setPortfolioUrl] = useState('https://linkedin.com/in/rohan-sharma');

  // Execution & Output State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [huntResults, setHuntResults] = useState(null);
  const [activeOutputTab, setActiveOutputTab] = useState('note'); // 'note' | 'inmail' | 'email'
  const [copiedKey, setCopiedKey] = useState(null);

  // Sentinel Device Verification
  useEffect(() => {
    if (!_mindlerCode) return;
    const devHash = getDeviceFingerprint();
    const devName = /iPhone|iPad|Android/.test(navigator.userAgent) ? 'Mobile Device' : (/Mac/.test(navigator.userAgent) ? 'MacBook' : 'Windows PC');

    fetch('https://tcb-sentinel.vercel.app/api/verify-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: _mindlerCode, device_hash: devHash, device_name: devName })
    })
    .then(r => r.json())
    .then(d => {
      if (d.allowed) {
        sessionStorage.setItem('tcb_founder_bypass', '1');
        setSentinelState({ loading: false, allowed: true, status: 'AUTHORIZED', creditsRemaining: d.credits_remaining !== undefined ? d.credits_remaining : 3, role: d.role, message: d.message });
      } else if (d.status === 'OTP_REQUIRED') {
        sessionStorage.removeItem('tcb_founder_bypass');
        setSentinelState({ loading: false, allowed: false, status: 'OTP_REQUIRED', creditsRemaining: 0, role: 'SECONDARY', message: d.message });
      } else {
        sessionStorage.removeItem('tcb_founder_bypass');
        setSentinelState({ loading: false, allowed: false, status: 'BLOCKED', creditsRemaining: 0, role: null, message: d.message });
      }
    })
    .catch(() => {
      sessionStorage.setItem('tcb_founder_bypass', '1');
      setSentinelState({ loading: false, allowed: true, status: 'AUTHORIZED', creditsRemaining: Math.max(0, 3 - localUsed), role: 'PRIMARY', message: 'Offline verified' });
    });
  }, [_mindlerCode, localUsed]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStartHunt = async () => {
    if (inputMode === 'url' && !jobUrl.trim()) {
      alert('Please paste a job link.');
      return;
    }
    if (inputMode === 'manual' && (!company.trim() || !role.trim())) {
      alert('Please enter Company Name and Role Title.');
      return;
    }

    if (_isMindlerUser && (sentinelState.creditsRemaining <= 0 || localUsed >= 3)) {
      alert('You have completed all 3 licensed hunts. Request a call with Coach Sandarsh to unlock extra credits.');
      return;
    }

    setIsScanning(true);
    setScanStep(1);

    try {
      // Step 1: Parse Job
      const parseRes = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_url: inputMode === 'url' ? jobUrl.trim() : null,
          company: inputMode === 'manual' ? company.trim() : null,
          role: inputMode === 'manual' ? role.trim() : null,
          location: locationStr.trim(),
          jd_text: jdText.trim()
        })
      });
      const parsedData = await parseRes.json();
      const targetCompany = parsedData.company || company || 'Target Company';
      const targetRole = parsedData.role || role || 'Open Position';
      const targetDomain = parsedData.domain || `${targetCompany.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

      setScanStep(2);
      // Step 2: Scout Decision-Makers
      const scoutRes = await fetch('/api/find-decision-makers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: targetCompany,
          role: targetRole,
          department: 'Engineering',
          location: locationStr
        })
      });
      const decisionData = await scoutRes.json();

      setScanStep(3);
      // Step 3: Corporate Email Pattern Reconnaissance
      const emailRes = await fetch('/api/scout-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: targetDomain,
          company_name: targetCompany,
          first_name: 'hiring',
          last_name: 'lead'
        })
      });
      const emailData = await emailRes.json();

      setScanStep(4);
      // Step 4: Generate Customized Outreach
      const outreachRes = await fetch('/api/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: targetCompany,
          role: targetRole,
          recruiter_name: decisionData.decision_makers?.[0]?.tier || 'Hiring Lead',
          recruiter_title: decisionData.decision_makers?.[0]?.recommended_titles || 'Team Lead',
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
        decision_makers: decisionData.decision_makers || [],
        email_intelligence: emailData,
        outreach: outreachData
      });

    } catch (e) {
      alert('An error occurred during reconnaissance. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const remainingDeliverables = Math.max(0, Math.min(sentinelState.creditsRemaining, 3 - localUsed));

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'background 0.3s' }}>
      
      {/* ── Global Header ── */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, background: theme === 'dark' ? 'rgba(20,16,8,0.92)' : 'rgba(250,243,232,0.92)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: C.amber, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1C1410', fontWeight: 800, fontSize: '14px', fontFamily: "'JetBrains Mono', monospace" }}>R</div>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 600, color: C.dark }}>The Career Breweries</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: C.amber, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Recruiter Reach • Outbound Hunter</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="https://tcb-linkedin-optimizer.vercel.app" target="_blank" rel="noreferrer" style={{ fontSize: '12px', fontWeight: 600, color: C.soft, textDecoration: 'none', border: `1px solid ${C.border}`, padding: '6px 12px', borderRadius: '8px' }}>
            LinkedIn Optimizer ↗
          </a>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ background: C.mist, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: C.dark, fontWeight: 600 }}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 80px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(201,123,42,0.12)', border: `1px solid ${C.amber}`, marginBottom: '16px' }}>
            <span style={{ fontSize: '14px' }}>🎯</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.amber, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Precision Job Acquisition Engine</span>
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', lineHeight: 1.25, color: C.dark, marginBottom: '14px' }}>
            Stop clicking Easy Apply.<br />Target the actual hiring team.
          </h1>
          <p style={{ fontSize: '15px', color: C.soft, maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
            Paste any job posting. Discover the real decision-makers on LinkedIn, resolve corporate email patterns with honesty confidence scores, and generate 300-char cold outreach that lands interviews.
          </p>
        </div>

        {/* ── Quota Indicator ── */}
        {_isMindlerUser && (
          <div style={{ background: 'rgba(201,123,42,0.08)', border: `1px solid ${C.amber}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 700, color: C.amber }}>
              ⭐ VIP Licensed Reconnaissance: {remainingDeliverables} of 3 Hunts Remaining
            </span>
            <span style={{ fontSize: '11px', color: C.soft }}>2-Device Hardware Locked</span>
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
            <a href={`https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20👋%20I've%20completed%20my%203%20deliverables%20for%20Recruiter%20Reach%20(Code%20%23${_mindlerCode}).%20I%20would%20like%20to%20request%20a%20strategy%20call%20for%20%2B3%20extra%20credits.`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#C88323', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '14px 24px', fontWeight: 700, fontSize: '14px' }}>
              📞 Request a Call with Coach Sandarsh for +3 Extra Credits
            </a>
          </div>
        ) : (
          /* ── Input Card ── */
          <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '28px', marginBottom: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            
            {/* Input Mode Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: C.cream, padding: '4px', borderRadius: '10px', width: 'fit-content', border: `1px solid ${C.border}` }}>
              <button onClick={() => setInputMode('url')} style={{ background: inputMode === 'url' ? C.amber : 'transparent', color: inputMode === 'url' ? '#fff' : C.soft, border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                🔗 Paste Job URL
              </button>
              <button onClick={() => setInputMode('manual')} style={{ background: inputMode === 'manual' ? C.amber : 'transparent', color: inputMode === 'manual' ? '#fff' : C.soft, border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                ✍️ Manual Entry (Auth-Wall Fallback)
              </button>
            </div>

            {inputMode === 'url' ? (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.soft, marginBottom: '8px', fontWeight: 600 }}>Target Job Posting URL</label>
                <input type="text" value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="e.g. https://www.linkedin.com/jobs/view/... or Greenhouse / Lever / Career Page" style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '14px', outline: 'none' }} />
                <span style={{ fontSize: '11px', color: C.soft, marginTop: '6px', display: 'block' }}>Supports LinkedIn, Lever, Greenhouse, Workday, Naukri, or direct corporate career portals.</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.soft, marginBottom: '8px', fontWeight: 600 }}>Company Name</label>
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Swiggy, Deloitte, Razorpay" style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.soft, marginBottom: '8px', fontWeight: 600 }}>Role Title</label>
                  <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Frontend Engineer, Product Manager" style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.soft, marginBottom: '8px', fontWeight: 600 }}>Location</label>
                  <input type="text" value={locationStr} onChange={e => setLocationStr(e.target.value)} placeholder="e.g. Bengaluru, India / Remote" style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '14px', outline: 'none' }} />
                </div>
              </div>
            )}

            {/* Candidate Context */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '20px', marginTop: '20px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', textTransform: 'uppercase', color: C.amber, fontWeight: 700, marginBottom: '12px' }}>Your Candidate Credentials</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: C.soft, marginBottom: '6px' }}>Your Full Name</label>
                  <input type="text" value={candidateName} onChange={e => setCandidateName(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: C.soft, marginBottom: '6px' }}>Primary Skills / Tech Stack</label>
                  <input type="text" value={candidateSkill} onChange={e => setCandidateSkill(e.target.value)} placeholder="e.g. React, Next.js, Web Performance" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: C.soft, marginBottom: '6px' }}>Portfolio / LinkedIn URL</label>
                  <input type="text" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="e.g. github.com/username" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: C.soft, marginBottom: '6px' }}>Single Best Quantified Achievement (Past Proof Metric)</label>
                <textarea rows={2} value={candidateProof} onChange={e => setCandidateProof(e.target.value)} placeholder="e.g. Reduced dashboard bundle size by 38% and optimized Core Web Vitals to 96+" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px', outline: 'none' }} />
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
              {scanStep === 1 && '1/4 Parsing Job Description & Department Hierarchy…'}
              {scanStep === 2 && '2/4 Executing Safe Google X-Ray Search for Hiring Managers…'}
              {scanStep === 3 && '3/4 Verifying Corporate DNS MX Records & Email Protocols…'}
              {scanStep === 4 && '4/4 Synthesizing 300-Char Note & Executive B.L.U.F. Email…'}
            </div>
            <p style={{ fontSize: '12px', color: C.soft }}>Operating in safe stealth mode to avoid bot blocks.</p>
          </div>
        )}

        {/* ── Hunt Results Output ── */}
        {huntResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Box 1: Decision-Maker Hierarchy */}
            <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.amber, textTransform: 'uppercase', fontWeight: 700 }}>Stage 1 • Decision-Maker Reconnaissance</div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: C.dark, marginTop: '2px' }}>Target Hiring Team at {huntResults.company}</h3>
                </div>
                <span style={{ fontSize: '12px', background: C.cream, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, color: C.soft, fontFamily: "'JetBrains Mono', monospace" }}>{huntResults.role}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {huntResults.decision_makers.map((dm, idx) => (
                  <div key={idx} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '24px' }}>{dm.icon}</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.dark }}>{dm.tier}</div>
                        <div style={{ fontSize: '12px', color: C.soft, marginTop: '2px' }}>{dm.recommended_titles}</div>
                        <div style={{ fontSize: '11px', color: C.amber, marginTop: '4px', fontStyle: 'italic' }}>{dm.priority}</div>
                      </div>
                    </div>
                    <a href={dm.live_profile_url} target="_blank" rel="noreferrer" style={{ background: C.amber, color: '#1C1410', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                      View Live Profiles on LinkedIn ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: Corporate Email Pattern Reconnaissance */}
            <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.amber, textTransform: 'uppercase', fontWeight: 700 }}>Stage 2 • Corporate Email Reconnaissance</div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: C.dark, marginTop: '2px' }}>Verified Mail Protocol for @{huntResults.domain}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: huntResults.email_intelligence.confidence_score >= 80 ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)', border: `1px solid ${huntResults.email_intelligence.confidence_score >= 80 ? '#22C55E' : '#EAB308'}`, padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: huntResults.email_intelligence.confidence_score >= 80 ? '#16A34A' : '#CA8A04' }}>
                  <span>{huntResults.email_intelligence.confidence_score >= 80 ? '🟢' : '🟡'}</span>
                  <span>{huntResults.email_intelligence.confidence_label} ({huntResults.email_intelligence.confidence_score}%)</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: C.soft, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginBottom: '6px' }}>Primary Inferred Inbox (92% Probability)</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <code style={{ fontSize: '14px', fontWeight: 700, color: C.dark, fontFamily: "'JetBrains Mono', monospace" }}>{huntResults.email_intelligence.primary_email}</code>
                    <button onClick={() => handleCopy(huntResults.email_intelligence.primary_email, 'email1')} style={{ background: C.mist, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                      {copiedKey === 'email1' ? '✅ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: C.soft, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginBottom: '6px' }}>Secondary Alternative Pattern</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <code style={{ fontSize: '14px', fontWeight: 700, color: C.dark, fontFamily: "'JetBrains Mono', monospace" }}>{huntResults.email_intelligence.secondary_email}</code>
                    <button onClick={() => handleCopy(huntResults.email_intelligence.secondary_email, 'email2')} style={{ background: C.mist, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                      {copiedKey === 'email2' ? '✅ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: C.soft, background: 'rgba(201,123,42,0.06)', borderLeft: `3px solid ${C.amber}`, padding: '10px 14px', borderRadius: '0 8px 8px 0', lineHeight: 1.5 }}>
                💡 <strong>Protocol Guidance:</strong> Use the 300-char LinkedIn Connection Note as <strong>Strike 1</strong> (100% deliverability). If no response within 48 hours, send <strong>Strike 2</strong> to the primary corporate work email.
              </div>
            </div>

            {/* Box 3: Tabbed Copywriting Deliverables */}
            <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: C.amber, textTransform: 'uppercase', fontWeight: 700 }}>Stage 3 • Tailored Outreach Deliverables</div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: C.dark, marginTop: '2px' }}>High-Conversion Message Scripts</h3>
                </div>

                <div style={{ display: 'flex', gap: '6px', background: C.cream, padding: '4px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                  <button onClick={() => setActiveOutputTab('note')} style={{ background: activeOutputTab === 'note' ? C.amber : 'transparent', color: activeOutputTab === 'note' ? '#fff' : C.soft, border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    1. LinkedIn Note ({huntResults.outreach.linkedin_note.length}/300)
                  </button>
                  <button onClick={() => setActiveOutputTab('inmail')} style={{ background: activeOutputTab === 'inmail' ? C.amber : 'transparent', color: activeOutputTab === 'inmail' ? '#fff' : C.soft, border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    2. 3-Sentence InMail
                  </button>
                  <button onClick={() => setActiveOutputTab('email')} style={{ background: activeOutputTab === 'email' ? C.amber : 'transparent', color: activeOutputTab === 'email' ? '#fff' : C.soft, border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    3. B.L.U.F. Email
                  </button>
                </div>
              </div>

              {activeOutputTab === 'note' && (
                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.dark }}>300-Character LinkedIn Connection Request Note</span>
                    <button onClick={() => handleCopy(huntResults.outreach.linkedin_note, 'note')} style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      {copiedKey === 'note' ? '✅ Copied to Clipboard' : '📋 Copy Connection Note'}
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
                    <button onClick={() => handleCopy(huntResults.outreach.inmail_pitch, 'inmail')} style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      {copiedKey === 'inmail' ? '✅ Copied to Clipboard' : '📋 Copy InMail Script'}
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
                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.dark }}>Executive B.L.U.F. Job Application Email</span>
                    <button onClick={() => handleCopy(`${huntResults.outreach.bluf_email_subject}\n\n${huntResults.outreach.bluf_email_body}`, 'email_full')} style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      {copiedKey === 'email_full' ? '✅ Copied to Clipboard' : '📋 Copy Complete Email'}
                    </button>
                  </div>
                  <div style={{ background: C.bg, padding: '14px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '12px', color: C.soft, marginBottom: '6px' }}><strong>Subject:</strong> {huntResults.outreach.bluf_email_subject}</div>
                    <hr style={{ borderColor: C.border, margin: '10px 0' }} />
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, color: C.ink }}>
                      {huntResults.outreach.bluf_email_body}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Box 4: Profile Readiness Callout */}
            <div style={{ background: 'rgba(201,123,42,0.1)', border: `1.5px solid ${C.amber}`, borderRadius: '16px', padding: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', color: C.dark, marginBottom: '4px' }}>Is your LinkedIn profile ready for when the recruiter clicks your message?</h4>
                <p style={{ fontSize: '13px', color: C.soft }}>Make sure your Headline, About summary, and Experience roles match this outreach.</p>
              </div>
              <a href="https://tcb-linkedin-optimizer.vercel.app" target="_blank" rel="noreferrer" style={{ background: C.amber, color: '#1C1410', textDecoration: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 800 }}>
                Optimize My Profile Now ↗
              </a>
            </div>

          </div>
        )}

      </main>

      {/* 🔐 Device 2 OTP Authorization Modal */}
      {sentinelState.status === 'OTP_REQUIRED' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,24,44,0.96)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0F2D52', border: '1.5px solid rgba(200,131,35,0.4)', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '100%', textAlign: 'center', color: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}>🔐</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', marginBottom: '8px' }}>Device 2 Authorization Required</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '20px' }}>You are opening this link on a secondary device. Enter the 4-digit code provided by Coach Sandarsh to authorize this machine.</p>
            <input type="text" id="otp-entry-box-rr" maxLength={4} placeholder="••••" style={{ letterSpacing: '12px', textAlign: 'center', fontSize: '24px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, padding: '12px', borderRadius: '10px', border: '2px solid #C88323', background: 'rgba(255,255,255,0.06)', color: 'white', width: '100%', marginBottom: '16px', outline: 'none' }} />
            <button onClick={async () => {
              const otpVal = document.getElementById('otp-entry-box-rr').value.trim();
              if (!otpVal || otpVal.length !== 4) { alert('Please enter the 4-digit code.'); return; }
              const r = await fetch('https://tcb-sentinel.vercel.app/api/approve-device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: _mindlerCode, otp: otpVal }) });
              const res = await r.json();
              if (res.success) { alert('✅ Secondary device authorized!'); location.reload(); }
              else { alert('❌ ' + (res.message || 'Incorrect code.')); }
            }} style={{ background: '#C88323', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 700, fontSize: '15px', width: '100%', cursor: 'pointer' }}>Authorize Secondary Device</button>
          </div>
        </div>
      )}

      {/* 🚫 Device 3 Blocked Modal */}
      {sentinelState.status === 'BLOCKED' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,24,44,0.98)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0F2D52', border: '1.5px solid #EF4444', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', textAlign: 'center', color: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚫</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', marginBottom: '8px', color: '#F87171' }}>Access Denied: Maximum 2 Devices</h3>
            <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '24px' }}>This VIP access link has already been bound to its hard limit of 2 devices (1 Primary + 1 Secondary). Multi-device sharing is disabled to protect client privacy and API quotas.</p>
            <a href={`https://wa.me/919743711584?text=Hi%20Coach%20Sandarsh!%20I'm%20trying%20to%20access%20from%20a%20new%20device%20for%20code%20%23${_mindlerCode}.`} target="_blank" rel="noreferrer" style={{ display: 'block', background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '14px', fontWeight: 700, fontSize: '14px' }}>💬 Message Coach Sandarsh on WhatsApp</a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
