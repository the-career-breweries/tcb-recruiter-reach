import scoutEmailHandler from './api/scout-email.js';
import parseJobHandler from './api/parse-job.js';
import findDMsHandler from './api/find-decision-makers.js';
import generateOutreachHandler from './api/generate-outreach.js';

function mockReqRes(body) {
  let statusCode = 200;
  let responseData = null;
  const headers = {};
  const req = { method: 'POST', body };
  const res = {
    setHeader(key, value) {
      headers[key] = value;
      return this;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };
  return { req, res, getResult: () => ({ status: statusCode, data: responseData, headers }) };
}

async function runComprehensiveTests() {
  console.log("=================================================================");
  console.log("   TCB RECRUITER REACH COMPREHENSIVE SUITE VERIFICATION          ");
  console.log("=================================================================\n");

  // TEST 1: EMAIL SCOUT WITH MULTIPLE ENTERPRISE & STARTUP DOMAINS
  console.log("--- 1. EMAIL SCOUTING & DNS MX RECONNAISSANCE ---");
  const emailScenarios = [
    { name: "Deloitte (Big 4)", domain: "deloitte.com", first: "Vikram", last: "Mehta" },
    { name: "Swiggy (Indian Unicorn)", domain: "swiggy.in", first: "Ananya", last: "Iyer" },
    { name: "Razorpay (Fintech)", domain: "razorpay.com", first: "Kunal", last: "Shah" },
    { name: "Non-existent Domain (Negative Test)", domain: "nonexistent-domain-xyz-987.com", first: "John", last: "Doe" }
  ];

  for (const s of emailScenarios) {
    const { req, res, getResult } = mockReqRes({ domain: s.domain, first_name: s.first, last_name: s.last });
    await scoutEmailHandler(req, res);
    const r = getResult();
    console.log(`[${s.name}] HTTP ${r.status}`);
    if (r.data && r.data.success) {
      console.log(`  -> Primary: ${r.data.primary_email}`);
      console.log(`  -> Confidence: ${r.data.confidence_score}% (${r.data.confidence_label})`);
      console.log(`  -> Mail Provider: ${r.data.mail_provider}`);
      console.log(`  -> Formula: ${r.data.pattern_formula}`);
      console.log(`  -> Secondary: ${r.data.secondary_email || 'None'}`);
    } else {
      console.log(`  -> Status: Handled (${r.data.error || 'Failed'})`);
    }
  }

  // TEST 2: DUAL-INPUT JOB PARSER
  console.log("\n--- 2. DUAL-INPUT JOB PARSING (URL vs MANUAL) ---");
  const jobScenarios = [
    {
      type: "Greenhouse ATS URL",
      body: { job_url: "https://boards.greenhouse.io/postman/jobs/512345" }
    },
    {
      type: "Manual Company + Role Mode (No URL)",
      body: {
        company: "Cred",
        role: "Senior Product Designer",
        jd_text: "We are looking for a Senior Product Designer to own user onboarding and gamification loops. Must have 4+ years in mobile-first consumer apps, Figma systems."
      }
    },
    {
      type: "Direct LinkedIn Job URL",
      body: { job_url: "https://www.linkedin.com/jobs/view/4123456789/?refId=foo" }
    }
  ];

  for (const s of jobScenarios) {
    const { req, res, getResult } = mockReqRes(s.body);
    await parseJobHandler(req, res);
    const r = getResult();
    console.log(`[${s.type}] HTTP ${r.status}`);
    console.log(`  -> Company: ${r.data.company}`);
    console.log(`  -> Role: ${r.data.role}`);
    console.log(`  -> Domain: ${r.data.domain}`);
    console.log(`  -> Summary / Snippet: ${(r.data.summary || r.data.snippet || '').slice(0, 80)}...`);
  }

  // TEST 3: GOOGLE X-RAY SEARCH BUILDER
  console.log("\n--- 3. GOOGLE X-RAY DECISION-MAKER QUERIES ---");
  const { req: xReq, res: xRes, getResult: xGetResult } = mockReqRes({
    company: "Zomato",
    role: "Backend Engineer",
    location: "Gurugram"
  });
  await findDMsHandler(xReq, xRes);
  const xResData = xGetResult().data;
  console.log(`Found ${xResData.decision_makers.length} Target Decision-Maker Archetypes for Zomato:`);
  xResData.decision_makers.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.tier}] ${t.recommended_titles}`);
    console.log(`     Priority: ${t.priority}`);
    console.log(`     Target URL: ${t.search_url}`);
  });

  // TEST 4: OUTREACH GENERATION (STRICT 300-CHAR LIMIT TEST)
  console.log("\n--- 4. OUTREACH ENGINE & CELTA 300-CHAR CONSTRAINTS ---");
  const candidateScenarios = [
    {
      desc: "Fresher / College Grad with Project Proof",
      body: {
        candidate_name: "Aditya Verma",
        company: "Zepto",
        role: "Associate Product Manager",
        recruiter_name: "Siddharth Rao",
        recruiter_title: "Head of Product",
        candidate_skill: "User Retention & Growth Experimentation",
        candidate_proof: "grew collegiate community to 8,400 MAU and reduced 7-day churn by 18% through automated WhatsApp nudges"
      }
    },
    {
      desc: "Experienced 5-Year Engineer with High-Impact Metric",
      body: {
        candidate_name: "Priyanka Nambiar",
        company: "PhonePe",
        role: "Staff Backend Engineer",
        recruiter_name: "Amitabh Sen",
        recruiter_title: "VP of Engineering",
        candidate_skill: "Distributed Go & Kafka Microservices",
        candidate_proof: "architected real-time settlement pipeline processing 14,000 TPS with sub-12ms p99 latency across distributed multi-region clusters"
      }
    }
  ];

  for (const c of candidateScenarios) {
    const { req, res, getResult } = mockReqRes(c.body);
    await generateOutreachHandler(req, res);
    const r = getResult();
    const note = r.data.linkedin_note;
    const len = note.length;
    const withinLimit = len <= 300;
    console.log(`[${c.desc}]`);
    console.log(`  -> Connection Note Length: ${len} chars (<= 300: ${withinLimit ? '✅ PASS' : '❌ FAIL'})`);
    console.log(`  -> Note Text: "${note}"`);
    console.log(`  -> InMail Pitch: "${r.data.inmail_pitch}"`);
    console.log(`  -> Job App Subject: "${r.data.bluf_email_subject}"`);
  }

  // TEST 5: SENTINEL CLOUD VALIDATION (PRODUCT CATALOG & QUOTA COMPLIANCE)
  console.log("\n--- 5. SENTINEL LICENSE CLOUD INTEGRATION ---");
  try {
    const issueRes = await fetch("https://tcb-sentinel.vercel.app/api/issue-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Job Hunter",
        phone: "+919876543210",
        email: "hunter@example.com",
        product_slug: "recruiter-reach"
      })
    });
    const iData = await issueRes.json();
    console.log(`Sentinel Issue License: HTTP ${issueRes.status}`);
    console.log(`  -> Code: ${iData.code}`);
    console.log(`  -> Product: ${iData.product_name} (${iData.product_slug})`);
    console.log(`  -> Deliverable Quota: ${iData.deliverable_quota}`);

    if (iData.code) {
      const verifyRes = await fetch("https://tcb-sentinel.vercel.app/api/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: iData.code,
          device_hash: "test_recruiter_device_1",
          device_name: "Test Chrome Windows"
        })
      });
      const vData = await verifyRes.json();
      console.log(`Sentinel Verify Device 1: HTTP ${verifyRes.status}`);
      console.log(`  -> Allowed: ${vData.allowed}`);
      console.log(`  -> Role: ${vData.role}`);
      console.log(`  -> Credits Remaining: ${vData.credits_remaining}`);
    }
  } catch (e) {
    console.log(`  -> Sentinel check error: ${e.message}`);
  }

  console.log("\n=================================================================");
  console.log("   ✅ ALL COMPREHENSIVE RECONNAISSANCE TESTS FINISHED            ");
  console.log("=================================================================");
}

runComprehensiveTests();
