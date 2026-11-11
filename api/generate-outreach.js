// api/generate-outreach.js
// Generates:
// 1. 300-Character LinkedIn Connection Note
// 2. 3-Sentence P-P-F Follow-up InMail
// 3. Executive B.L.U.F. Job Application Email

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const company = body.company || body.targetCompany || body.company_name;
  const role = body.role || body.targetRole || body.job_title;
  const recruiter_name = body.recruiter_name || body.recruiterName || body.decisionMakerName;
  const recruiter_title = body.recruiter_title || body.recruiterTitle || body.decisionMakerTitle;
  const candidate_name = body.candidate_name || body.candidateName;
  const candidate_skill = body.candidate_skill || body.candidateSkill || body.coreSkill;
  const candidate_proof = body.candidate_proof || body.candidateProof || body.proofMetric;
  const portfolio_url = body.portfolio_url || body.portfolioUrl;

  const cCompany = (company || "Target Company").trim();
  const cRole = (role || "Open Role").trim();
  const cRecruiter = (recruiter_name || "Hiring Team").split(' ')[0].trim();
  const cRecruiterTitle = (recruiter_title || "Team Lead").trim();
  const cCandidate = (candidate_name || "Candidate").trim();
  const cSkill = (candidate_skill || "Full-Stack Development").trim();
  const cProof = (candidate_proof || "delivered measurable product impact in my recent projects").trim();
  const cPortfolio = (portfolio_url || "my attached resume").trim();

  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are an elite career strategist at The Career Breweries. Generate 3 precision outreach deliverables for a candidate reaching out directly to a hiring manager/recruiter.

Candidate: ${cCandidate}
Candidate Core Skills: ${cSkill}
Candidate Quantified Proof / Highlight: ${cProof}
Target Company: ${cCompany}
Target Role: ${cRole}
Target Recruiter Name: ${cRecruiter} (${cRecruiterTitle})
Portfolio / Link: ${cPortfolio}

CRITICAL RULES:
1. LinkedIn Connection Note MUST BE UNDER 290 CHARACTERS. No polite preamble ("Hope you are doing well"). Zero fluff.
2. InMail Pitch MUST use the P-P-F Formula (Present capability, Past quantified proof, Future contribution to their team). Exactly 3 sentences.
3. Job Application Email MUST follow the B.L.U.F. (Bottom Line Up Front) formula with an attention-grabbing subject line, 3 quantified bullet points, and attachment reference.

Return ONLY raw JSON with keys:
{
  "linkedin_note": "string <= 290 chars",
  "inmail_pitch": "string (3 sentences)",
  "bluf_email_subject": "string",
  "bluf_email_body": "string"
}`;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (geminiRes.ok) {
        const json = await geminiRes.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return res.status(200).json({
            success: true,
            source: "gemini",
            ...parsed
          });
        }
      }
    } catch (err) {
      console.warn("Gemini generation fallback:", err);
    }
  }

  // High-Conversion Deterministic Fallback Templates (CELTA-Tested)
  const defaultNote = `Hi ${cRecruiter}, noticed your work leading ${cRole} hiring at ${cCompany}. I specialize in ${cSkill}; recently, I ${cProof}. Would value following your team's updates here. Best, ${cCandidate}`;
  
  // Truncate to 295 chars if needed
  const cleanNote = defaultNote.length > 295 ? defaultNote.slice(0, 292) + "..." : defaultNote;

  const defaultInMail = `I am a ${cSkill} specialist focused on high-performance execution. Recently, I ${cProof}, ensuring scalable and clean implementation. I would love to bring that same engineering rigor to your ${cRole} opening at ${cCompany}—are you open to a brief 5-minute chat this week?`;

  const defaultEmailSubject = `Application: ${cRole} (Ref: ${cSkill}) — ${cCandidate}`;
  const defaultEmailBody = `Hi ${cRecruiter},

Bottom Line Up Front: I am reaching out to formally apply for the ${cRole} position at ${cCompany}. I bring hands-on expertise in ${cSkill} and a proven track record of execution.

Key highlights relevant to your opening:
• Core Impact: ${cProof}.
• Execution Rigor: Experienced in building production-ready solutions tailored to high-scale requirements.
• Cultural Alignment: Excited by ${cCompany}'s engineering standards and ready to contribute from Day 1.

I have attached my single-page resume and included my portfolio details (${cPortfolio}). Would you or the team lead be open to a 10-minute introductory conversation this Thursday or Friday?

Warm regards,
${cCandidate}
${cPortfolio}`;

  return res.status(200).json({
    success: true,
    source: "template",
    linkedin_note: cleanNote,
    inmail_pitch: defaultInMail,
    bluf_email_subject: defaultEmailSubject,
    bluf_email_body: defaultEmailBody
  });
}
