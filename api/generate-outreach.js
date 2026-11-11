// api/generate-outreach.js
// Precision Outreach Generator:
// 1. 300-Character LinkedIn Connection Request Note (Zero fluff, <= 290 chars)
// 2. 3-Sentence P-P-F Follow-up InMail (Present, Past proof, Future contribution)
// 3. Executive B.L.U.F. Job Application Email (Aligned with real JD requirements)

function cleanSalutation(name) {
  if (!name) return "Hiring Team";
  let first = name.split(" ")[0].trim();
  // Strip common generic titles
  if (/^(hiring|lead|team|recruiter|manager|open|talent|specialist)$/i.test(first)) {
    return "Hiring Team";
  }
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function cleanProofMetric(proof) {
  let p = (proof || "delivered strong measurable impact").trim();
  // Lowercase initial if starts with "I" or "Have"
  p = p.replace(/^have\s+/i, "").replace(/^i\s+(have\s+)?/i, "");
  return p;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  let cCompany = (body.company || body.targetCompany || body.company_name || "Target Company").trim();
  if (cCompany.toLowerCase() === "www" || cCompany.toLowerCase() === "target company") {
    cCompany = "Accenture";
  }

  let cRole = (body.role || body.targetRole || body.job_title || "Open Position").trim();
  if (cRole.toLowerCase() === "open position") {
    cRole = "Inside Sales Representative";
  }

  const cDepartment = body.department || "General";
  const cRecruiter = cleanSalutation(body.recruiter_name || body.recruiterName || body.decisionMakerName);
  const cCandidate = (body.candidate_name || body.candidateName || "Candidate").trim();
  const cSkill = (body.candidate_skill || body.candidateSkill || body.coreSkill || "Sales & Business Development").trim();
  const cProofRaw = (body.candidate_proof || body.candidateProof || body.proofMetric || "onboarded 100+ clients in 7 months").trim();
  const cProof = cleanProofMetric(cProofRaw);
  const cPortfolio = (body.portfolio_url || body.portfolioUrl || "LinkedIn profile / resume").trim();
  const cJdText = (body.jd_text || body.jobText || body.text || "").trim();

  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are an elite executive career strategist at The Career Breweries. Generate 3 high-impact, non-generic outreach deliverables for a candidate applying directly to a hiring team.

CANDIDATE DETAILS:
- Name: ${cCandidate}
- Core Skills / Focus: ${cSkill}
- Single Best Quantified Proof Metric: ${cProof}
- Portfolio / Profile Link: ${cPortfolio}

TARGET OPENING:
- Company: ${cCompany}
- Role Title: ${cRole}
- Department: ${cDepartment}
- Recruiter / Manager Salutation: ${cRecruiter}
- Job Description & Requirements Context:
"""
${cJdText.slice(0, 1500)}
"""

CRITICAL INSTRUCTIONS:
1. "linkedin_note": MUST be STRICTLY UNDER 285 CHARACTERS. No greeting pleasantries ("Hope this finds you well"). Mention ${cCompany}, the specific role, candidate's quantified metric (${cProof}), and value hook.
2. "inmail_pitch": Exactly 3 sentences using the P-P-F formula:
   - Sentence 1 (Present): Present capability in ${cSkill} tied directly to the JD.
   - Sentence 2 (Past): The single best proof metric (${cProof}) demonstrating execution rigor.
   - Sentence 3 (Future): How they will solve the team's goals at ${cCompany} + 5-minute call call-to-action.
3. "bluf_email_subject": Attention-grabbing subject line with BLUF tags (e.g., Application: ${cRole} (${cSkill} • Quantified Metric) — ${cCandidate}).
4. "bluf_email_body": Executive Bottom Line Up Front email with 3 specific bullet points mapped directly to the actual responsibilities in the Job Description (e.g. client qualification, pipeline ownership, onboarding adoption). Never use generic phrases like "excited by engineering standards" if this is a sales or non-tech role!

Return ONLY raw JSON with keys:
{
  "linkedin_note": "string <= 285 chars",
  "inmail_pitch": "string (3 sentences)",
  "bluf_email_subject": "string",
  "bluf_email_body": "string"
}`;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        }),
        signal: AbortSignal.timeout(9000)
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsed = JSON.parse(rawJsonText);
          let note = (parsed.linkedin_note || "").trim();
          if (note.length > 295) note = note.slice(0, 290) + "...";

          return res.status(200).json({
            success: true,
            source: "gemini-2.5-flash",
            linkedin_note: note,
            inmail_pitch: (parsed.inmail_pitch || "").trim(),
            bluf_email_subject: (parsed.bluf_email_subject || "").trim(),
            bluf_email_body: (parsed.bluf_email_body || "").trim()
          });
        }
      }
    } catch {
      // Fall through to domain-specific templates
    }
  }

  // DOMAIN-SPECIFIC CELTA FALLBACK TEMPLATES
  let noteText = "";
  let inmailPitch = "";
  let emailSubject = "";
  let emailBullets = [];

  const isSales = /sales|revenue|business development|account executive/i.test(`${cRole} ${cDepartment}`);
  const isPlacement = /placement|career services|edtech/i.test(`${cRole} ${cDepartment}`);
  const isTech = /software|engineer|developer|data|cloud|devops/i.test(`${cRole} ${cDepartment}`);

  if (isSales) {
    noteText = `Hi ${cRecruiter}, noticed your work leading Inside Sales at ${cCompany}. I specialize in ${cSkill}; recently, I ${cProof}. Would value following your team's growth and connecting here. Best, ${cCandidate}`;
    inmailPitch = `I am a ${cSkill} specialist focused on consultative opportunity qualification and driving high-velocity conversion cycles. Recently, I ${cProof}, managing full-cycle prospect discovery through contract closure. I would love to bring that same consultative closing rigor to the ${cRole} opening at ${cCompany}—are you open to a brief 5-minute chat this week?`;
    emailSubject = `Application: ${cRole} (${cSkill} • ${cProof}) — ${cCandidate}`;
    emailBullets = [
      `Client Acquisition Track Record: Successfully ${cProof} by executing targeted outreach cadences and qualifying enterprise decision-makers.`,
      `Sales Lifecycle Mastery: Hands-on experience originating new opportunities, navigating objections, and advancing qualified leads through the sales cycle.`,
      `Client Onboarding & Retention: Proven ability to support clients through onboarding, drive initial product adoption, and accelerate account expansion.`
    ];
  } else if (isPlacement) {
    noteText = `Hi ${cRecruiter}, saw your leadership across Career Services at ${cCompany}. I specialize in ${cSkill}; recently, I ${cProof}. Would value following your initiatives and connecting here. Best, ${cCandidate}`;
    inmailPitch = `I am an edtech and placement specialist focused on structured corporate hiring partnerships and student outcome readiness. Recently, I ${cProof}, driving high-impact training and drive execution. I would welcome the opportunity to bring this outcome-driven rigor to ${cCompany}'s ${cRole} team—are you open to a brief 5-minute conversation?`;
    emailSubject = `Application: ${cRole} (Placement Outcomes • ${cSkill}) — ${cCandidate}`;
    emailBullets = [
      `Placement Drive Execution: Proven track record where I ${cProof} across high-scale training ecosystems.`,
      `Corporate Relations: Experienced in building relationships with enterprise recruiters and hiring managers to secure placement drives.`,
      `Employability & Training: Skilled in student mentoring, resume review, and interview preparation to ensure high offer-to-join conversion.`
    ];
  } else if (isTech) {
    noteText = `Hi ${cRecruiter}, noticed your work leading ${cRole} hiring at ${cCompany}. I specialize in ${cSkill}; recently, I ${cProof}. Would value following your team's updates here. Best, ${cCandidate}`;
    inmailPitch = `I am a ${cSkill} specialist focused on robust, scalable architecture and high-performance execution. Recently, I ${cProof}, ensuring clean code and measurable system reliability. I would love to bring that same engineering rigor to your ${cRole} team at ${cCompany}—are you open to a brief 5-minute chat this week?`;
    emailSubject = `Application: ${cRole} (${cSkill}) — ${cCandidate}`;
    emailBullets = [
      `Quantified Technical Impact: Successfully ${cProof}.`,
      `Engineering Rigor: Hands-on experience building maintainable, high-scale services aligned with production standards.`,
      `Execution Velocity: Rapid contributor skilled in collaborative agile environments.`
    ];
  } else {
    noteText = `Hi ${cRecruiter}, noticed your work leading ${cRole} at ${cCompany}. I specialize in ${cSkill}; recently, I ${cProof}. Would value following your team's updates and connecting here. Best, ${cCandidate}`;
    inmailPitch = `I am a ${cSkill} specialist dedicated to measurable execution and high-impact delivery. Recently, I ${cProof}, driving outcomes across structured initiatives. I would welcome the chance to bring that same dedication to your ${cRole} opening at ${cCompany}—are you open to a 5-minute chat this week?`;
    emailSubject = `Application: ${cRole} (Ref: ${cSkill}) — ${cCandidate}`;
    emailBullets = [
      `Key Impact: Successfully ${cProof}.`,
      `Execution Discipline: Proven ability to drive structured workflows and cross-functional alignment.`,
      `Team Contribution: Eager to contribute directly to ${cCompany}'s ongoing targets from Day 1.`
    ];
  }

  // Ensure note is strictly <= 285 chars
  if (noteText.length > 285) {
    noteText = noteText.slice(0, 280) + "...";
  }

  const emailBody = `Hi ${cRecruiter},

Bottom Line Up Front: I am reaching out to formally apply for the ${cRole} opening at ${cCompany}. I bring hands-on expertise in ${cSkill} and a proven track record of execution.

Key highlights relevant to your opening:
• ${emailBullets[0]}
• ${emailBullets[1]}
• ${emailBullets[2]}

I have attached my single-page resume and included my portfolio details (${cPortfolio}). Would you or the hiring manager be open to a 10-minute introductory conversation this Thursday or Friday?

Warm regards,
${cCandidate}
${cPortfolio}`;

  return res.status(200).json({
    success: true,
    source: "celta-domain-engine",
    linkedin_note: noteText,
    inmail_pitch: inmailPitch,
    bluf_email_subject: emailSubject,
    bluf_email_body: emailBody
  });
}
