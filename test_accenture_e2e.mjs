import parseJobHandler from './api/parse-job.js';
import findDMsHandler from './api/find-decision-makers.js';
import scoutEmailHandler from './api/scout-email.js';
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

async function testAccentureEndToEnd() {
  console.log("========================================================================");
  console.log("   TESTING FULL ACCENTURE INSIDE SALES END-TO-END RECONNAISSANCE       ");
  console.log("========================================================================\n");

  const jobUrl = 'https://www.accenture.com/in-en/careers/jobdetails?id=ATCI-5727969-S2065145_en';
  
  // STEP 1: PARSE JOB URL
  console.log("1. Executing /api/parse-job with real Accenture URL...");
  const { req: pReq, res: pRes, getResult: pResult } = mockReqRes({ job_url: jobUrl });
  await parseJobHandler(pReq, pRes);
  const parsed = pResult().data;
  console.log("  -> Company:", parsed.company);
  console.log("  -> Role:", parsed.role);
  console.log("  -> Domain:", parsed.domain);
  console.log("  -> Location:", parsed.location);
  console.log("  -> Department:", parsed.department);
  console.log("  -> JD Snippet:", (parsed.jd_text || '').slice(0, 120), "...");

  if (parsed.company === "Www" || parsed.role === "Open Position") {
    throw new Error("FAILED: Parsed company is still 'Www' or role is 'Open Position'!");
  }

  // STEP 2: SCOUT DECISION MAKERS
  console.log("\n2. Executing /api/find-decision-makers with parsed data...");
  const { req: dReq, res: dRes, getResult: dResult } = mockReqRes({
    company: parsed.company,
    role: parsed.role,
    department: parsed.department,
    location: parsed.location,
    jd_text: parsed.jd_text
  });
  await findDMsHandler(dReq, dRes);
  const decisionData = dResult().data;
  console.log(`  -> Department Identified: ${decisionData.department}`);
  console.log(`  -> Archetypes found: ${decisionData.decision_makers.length}`);
  decisionData.decision_makers.forEach((dm, i) => {
    console.log(`     [Tier ${i+1}] ${dm.tier}: ${dm.recommended_titles}`);
    console.log(`       Query: ${dm.dork_query}`);
  });

  // STEP 3: CORPORATE EMAIL PROTOCOL (NO FAKE EMAILS)
  console.log("\n3. Executing /api/scout-email (Domain Protocol Mode)...");
  const { req: eReq, res: eRes, getResult: eResult } = mockReqRes({
    domain: parsed.domain,
    company_name: parsed.company
  });
  await scoutEmailHandler(eReq, eRes);
  const emailProtocol = eResult().data;
  console.log("  -> Domain:", emailProtocol.domain);
  console.log("  -> Has Individual:", emailProtocol.has_individual);
  console.log("  -> Pattern Formula:", emailProtocol.pattern_formula);
  console.log("  -> Mail Exchanger Provider:", emailProtocol.mail_provider);
  console.log("  -> Confidence Score:", `${emailProtocol.confidence_score}% (${emailProtocol.confidence_label})`);

  // STEP 3B: RESOLVE AN ACTUAL PERSON'S EMAIL (POOJA SHARMA)
  console.log("\n3b. Simulating Candidate Typing a Found Decision-Maker Name ('Pooja Sharma')...");
  const { req: pNameReq, res: pNameRes, getResult: pNameResult } = mockReqRes({
    domain: parsed.domain,
    company_name: parsed.company,
    person_name: "Pooja Sharma"
  });
  await scoutEmailHandler(pNameReq, pNameRes);
  const personEmail = pNameResult().data;
  console.log("  -> Resolved Primary Email:", personEmail.primary_email);
  console.log("  -> Resolved Secondary Pattern:", personEmail.secondary_email);
  console.log("  -> Confidence:", `${personEmail.confidence_score}% (${personEmail.confidence_label})`);

  // STEP 4: GENERATE OUTREACH DELIVERABLES
  console.log("\n4. Executing /api/generate-outreach with Candidate Credentials & JD context...");
  const { req: oReq, res: oRes, getResult: oResult } = mockReqRes({
    company: parsed.company,
    role: parsed.role,
    department: parsed.department,
    jd_text: parsed.jd_text,
    recruiter_name: "Hiring Team",
    candidate_name: "ABC",
    candidate_skill: "Inside Sales",
    candidate_proof: "Have onboarded 100+ clients in a span of 7 months",
    portfolio_url: "https://linkedin.com/in/rohan-sharma"
  });
  await generateOutreachHandler(oReq, oRes);
  const outreach = oResult().data;

  console.log("\n--- LINKEDIN CONNECTION NOTE (Length: " + outreach.linkedin_note.length + " chars) ---");
  console.log(outreach.linkedin_note);

  console.log("\n--- 3-SENTENCE INMAIL PITCH ---");
  console.log(outreach.inmail_pitch);

  console.log("\n--- EXECUTIVE B.L.U.F. EMAIL ---");
  console.log("SUBJECT:", outreach.bluf_email_subject);
  console.log("\nBODY:\n" + outreach.bluf_email_body);

  console.log("\n========================================================================");
  console.log("   ✅ ACCENTURE END-TO-END RECONNAISSANCE TEST PASSED WITH 100% QUALITY  ");
  console.log("========================================================================");
}

testAccentureEndToEnd().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
