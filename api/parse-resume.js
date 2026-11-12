// api/parse-resume.js
// 1-Click Candidate Resume Parser for Recruiter Reach
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { resumeBase64, mediaType, resumeText } = req.body || {};

  if (!resumeBase64 && (!resumeText || resumeText.trim().length < 20)) {
    return res.status(400).json({ error: "Please upload a resume or provide resume text" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const prompt = `You are a Senior Technical Recruiter at The Career Breweries.
Analyze this resume and extract the key credentials needed to craft personalized recruiter outreach:

1. "candidateName": Full name of the candidate.
2. "candidateSkill": The candidate's primary 2-3 core skills or functional domain (e.g. "Inside Sales & B2B Client Acquisition" or "Full Stack Development & Cloud Architecture").
3. "candidateProof": The single strongest, most impressive quantified metric or achievement bullet in the resume. Format as past-tense action statement without personal pronouns (e.g. "Scaled API throughput by 40% and reduced p95 latency by 120ms across 10k daily active users"). If no metric is explicitly stated, craft the strongest project accomplishment.
4. "portfolioUrl": LinkedIn profile URL, GitHub link, or personal portfolio URL if found in the resume.
5. "summary": Brief 2-sentence executive summary of the candidate.

Respond ONLY with a valid JSON object:
{
  "candidateName": "Full Name",
  "candidateSkill": "Core Functional Skills",
  "candidateProof": "Top Quantified Achievement Metric",
  "portfolioUrl": "https://linkedin.com/in/...",
  "summary": "Brief summary"
}`;

  try {
    const parts = [];
    if (resumeBase64) {
      parts.push({
        inlineData: {
          mimeType: mediaType || "application/pdf",
          data: resumeBase64
        }
      });
    } else {
      parts.push({ text: `RESUME TEXT:\n${resumeText}` });
    }
    parts.push({ text: prompt });

    const candidateModels = [
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-flash-lite-latest",
      "gemini-flash-latest",
      "gemini-3-flash-preview"
    ];

    let parsed = null;
    let usedModel = null;
    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          })
        });

        const data = await response.json();
        if (!response.ok) continue;

        const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
        const clean = raw.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
        if (parsed) {
          usedModel = model;
          break;
        }
      } catch (err) {}
    }

    if (!parsed) {
      return res.status(500).json({ error: "Resume parsing failed across models. Please try again." });
    }

    return res.status(200).json({
      success: true,
      ...parsed
    });
  } catch (err) {
    console.error("Parse resume error:", err);
    return res.status(500).json({ error: "Failed to parse resume credentials" });
  }
}
