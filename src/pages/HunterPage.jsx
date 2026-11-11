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
  const [copiedKey, setCopiedKey] = useState(null);

  // Dynamic Person Resolver State in Stage 2
  const [scoutedPersonName, setScoutedPersonName] = useState('');
  const [resolvedIndividualEmail, setResolvedIndividualEmail] = useState(null);

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
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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
      // Step 3: Corporate Email Domain Protocol (Honest, verified MX resolver)
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
          <p style={{ fontSize: '15px', color: C.soft, maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
            Paste any job posting or enter target company & role. Discover true decision-makers on LinkedIn via safe X-Ray queries, resolve verified corporate email protocols, and generate 300-char cold outreach that lands interviews.
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
              {scanStep === 2 && '2/4 Generating Targeted Google X-Ray Search Queries…'}
              {scanStep === 3 && '3/4 Verifying Corporate DNS MX Mail Gateway Protocol…'}
              {scanStep === 4 && '4/4 Synthesizing 300-Char LinkedIn Note & Executive B.L.U.F. Email…'}
            </div>
            <p style={{ fontSize: '12px', color: C.soft }}>Calibrating specifically to your target role to prevent generic templates.</p>
          </div>
        )}

        {/* ── Hunt Results Output ── */}
        {huntResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Box 1: Decision-Maker Hierarchy */}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {huntResults.decision_makers.map((dm, idx) => (
                  <div key={idx} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
                      <div style={{ fontSize: '24px' }}>{dm.icon}</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.dark }}>{dm.tier}</div>
                        <div style={{ fontSize: '12px', color: C.soft, marginTop: '2px' }}>{dm.recommended_titles}</div>
                        <div style={{ fontSize: '11px', color: C.amber, marginTop: '4px', fontStyle: 'italic' }}>{dm.priority}</div>
                      </div>
                    </div>
                    <a href={dm.search_url} target="_blank" rel="noreferrer" style={{ background: C.amber, color: '#1C1410', textDecoration: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      View Live Profiles on LinkedIn ↗
                    </a>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: huntResults.email_intelligence.confidence_score >= 80 ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)', border: `1px solid ${huntResults.email_intelligence.confidence_score >= 80 ? '#22C55E' : '#EAB308'}`, padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: huntResults.email_intelligence.confidence_score >= 80 ? '#16A34A' : '#CA8A04' }}>
                  <span>🟢</span>
                  <span>{huntResults.email_intelligence.confidence_label} ({huntResults.email_intelligence.confidence_score}%)</span>
                </div>
              </div>

              {/* Verified Domain Gateway Details */}
              <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: C.soft, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>Verified Mail Exchanger:</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.dark, marginTop: '3px' }}>{huntResults.email_intelligence.mail_provider}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: C.soft, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>Standard Formula:</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.amber, fontFamily: "'JetBrains Mono', monospace", marginTop: '3px' }}>{huntResults.email_intelligence.pattern_formula}</div>
                  </div>
                </div>
              </div>

              {/* Interactive Specific Person Email Resolver */}
              <div style={{ background: C.bg, border: `1.5px dashed ${C.amber}`, borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.dark, marginBottom: '6px' }}>
                  🔍 Found a Decision-Maker on LinkedIn above? Type their name to resolve work email:
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={scoutedPersonName}
                    onChange={e => handleResolvePersonEmail(e.target.value)}
                    placeholder="Type name found from LinkedIn (e.g. Pooja Sharma, Vikram Mehta)"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`, background: C.cream, color: C.dark, fontSize: '13px', outline: 'none' }}
                  />
                </div>

                {resolvedIndividualEmail ? (
                  <div style={{ background: C.cream, border: `1px solid #22C55E`, borderRadius: '10px', padding: '14px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase' }}>
                        Direct Inferred Work Email for {resolvedIndividualEmail.person_name}
                      </span>
                      <span style={{ fontSize: '11px', color: C.soft }}>{resolvedIndividualEmail.confidence_label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '6px' }}>
                      <code style={{ fontSize: '15px', fontWeight: 800, color: C.dark, fontFamily: "'JetBrains Mono', monospace" }}>
                        {resolvedIndividualEmail.primary_email}
                      </code>
                      <button onClick={() => handleCopy(resolvedIndividualEmail.primary_email, 'resolved')} style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        {copiedKey === 'resolved' ? '✅ Copied' : 'Copy Email'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: C.soft, fontStyle: 'italic', marginTop: '4px' }}>
                    Example pattern preview: <code>{huntResults.email_intelligence.example_preview || `firstname.lastname@${huntResults.domain}`}</code>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12px', color: C.soft, background: 'rgba(201,123,42,0.06)', borderLeft: `3px solid ${C.amber}`, padding: '10px 14px', borderRadius: '0 8px 8px 0', lineHeight: 1.5 }}>
                💡 <strong>Dual-Strike Outbound Rule:</strong> Send the 300-char LinkedIn Connection Note as <strong>Strike 1</strong> (100% deliverability). If unaccepted after 48 hours, send <strong>Strike 2</strong> directly to their corporate work email.
              </div>
            </div>

            {/* Box 3: Tabbed Copywriting Deliverables */}
            <div style={{ background: C.mist, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
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
                    <button onClick={() => handleCopy(`${huntResults.outreach.bluf_email_subject}\n\n${huntResults.outreach.bluf_email_body}`, 'email')} style={{ background: C.amber, color: '#1C1410', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      {copiedKey === 'email' ? '✅ Copied to Clipboard' : '📋 Copy Full Email'}
                    </button>
                  </div>
                  <div style={{ background: C.bg, padding: '14px', borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: C.soft, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>Subject Line:</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.dark }}>{huntResults.outreach.bluf_email_subject}</div>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, color: C.ink, background: C.bg, padding: '14px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                    {huntResults.outreach.bluf_email_body}
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
    </div>
  );
}
