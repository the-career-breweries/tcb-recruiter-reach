import scoutEmail from './api/scout-email.js';
import parseJob from './api/parse-job.js';
import findDecisionMakers from './api/find-decision-makers.js';
import generateOutreach from './api/generate-outreach.js';

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { res.headers[k] = v; },
    status(code) { res.statusCode = code; return res; },
    json(data) { res.data = data; return res; },
    end() { return res; }
  };
  return res;
}

async function runTests() {
  console.log("=== RUNNING API UNIT TESTS FOR RECRUITER REACH ===");

  // 1. Test scout-email
  console.log("\n1. Testing api/scout-email.js...");
  const res1 = mockRes();
  await scoutEmail({
    method: 'POST',
    body: { domain: 'swiggy.in', first_name: 'Pooja', last_name: 'Sundaram', company_name: 'Swiggy' }
  }, res1);
  console.log("Status:", res1.statusCode);
  console.log("Primary Email:", res1.data?.primary_email);
  console.log("Confidence:", res1.data?.confidence_score, res1.data?.confidence_label);
  console.log("MX Valid:", res1.data?.mx_valid);
  if (res1.data?.primary_email !== 'pooja.sundaram@swiggy.in') throw new Error("Email mismatch!");

  // 2. Test parse-job
  console.log("\n2. Testing api/parse-job.js...");
  const res2 = mockRes();
  await parseJob({
    method: 'POST',
    body: { company: 'Razorpay', role: 'Frontend Engineer', location: 'Bengaluru' }
  }, res2);
  console.log("Status:", res2.statusCode);
  console.log("Company:", res2.data?.company, "Role:", res2.data?.role, "Domain:", res2.data?.domain);
  if (res2.data?.company !== 'Razorpay') throw new Error("Company parse error!");

  // 3. Test find-decision-makers
  console.log("\n3. Testing api/find-decision-makers.js...");
  const res3 = mockRes();
  await findDecisionMakers({
    method: 'POST',
    body: { company: 'Swiggy', role: 'Frontend Engineer', location: 'Bengaluru' }
  }, res3);
  console.log("Status:", res3.statusCode);
  console.log("Targets found:", res3.data?.decision_makers?.length);
  for (const dm of res3.data?.decision_makers || []) {
    console.log(`- [${dm.tier}] ${dm.recommended_titles} -> ${dm.live_profile_url.slice(0, 60)}...`);
  }

  // 4. Test generate-outreach
  console.log("\n4. Testing api/generate-outreach.js...");
  const res4 = mockRes();
  await generateOutreach({
    method: 'POST',
    body: {
      company: 'Swiggy',
      role: 'Frontend Engineer',
      recruiter_name: 'Pooja Sundaram',
      recruiter_title: 'Talent Acquisition Lead',
      candidate_name: 'Rohan Sharma',
      candidate_skill: 'React & Web Performance',
      candidate_proof: 'reduced dashboard load time by 42% on high-traffic fintech app',
      portfolio_url: 'github.com/rohan'
    }
  }, res4);
  console.log("Status:", res4.statusCode);
  console.log("LinkedIn Note (len " + res4.data?.linkedin_note?.length + "):", res4.data?.linkedin_note);
  console.log("InMail Pitch:", res4.data?.inmail_pitch);
  console.log("Email Subject:", res4.data?.bluf_email_subject);

  if (res4.data?.linkedin_note?.length > 300) {
    throw new Error(`LinkedIn note exceeds 300 characters! (${res4.data?.linkedin_note?.length})`);
  }

  console.log("\n✅ ALL API UNIT TESTS PASSED!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
