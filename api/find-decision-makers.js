// api/find-decision-makers.js
// Safe Decision-Maker Discovery via Google X-Ray Search

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { company, role, department, location } = req.body || {};

  const cleanCompany = (company || "Target Company").trim();
  const cleanRole = (role || "Software Engineer").trim();
  const cleanDept = (department || "Engineering").trim();
  const cleanLoc = (location || "India").trim();

  // 1. Build targeted search archetypes
  const targets = [
    {
      tier: "Hiring Manager / Team Lead",
      role_query: `Engineering Manager OR Tech Lead OR Lead ${cleanRole.split(' ')[0]}`,
      icon: "👔",
      priority: "Highest Reply Rate: Owns the open headcount"
    },
    {
      tier: "Talent Acquisition Specialist",
      role_query: "Talent Acquisition Specialist OR Technical Recruiter OR HR Manager",
      icon: "🎯",
      priority: "Screens applications daily: Has active pipeline"
    },
    {
      tier: "Senior Peer / Potential Teammate",
      role_query: `Senior ${cleanRole} OR Staff ${cleanRole.split(' ')[0]}`,
      icon: "🤝",
      priority: "Alumni / Peer Referral: Can refer internally for referral bonus"
    }
  ];

  const results = [];

  for (const t of targets) {
    const dorkQuery = `site:linkedin.com/in "${cleanCompany}" (${t.role_query}) "${cleanLoc}"`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}`;

    let realProfiles = [];

    // Attempt live SERP fetch via DuckDuckGo HTML / public search endpoint
    try {
      const fetchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dorkQuery)}`;
      const searchRes = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (searchRes.ok) {
        const text = await searchRes.text();
        const linkMatches = text.matchAll(/class="result__snippet"[^>]*>(.*?)<\/a>/g);
        const urlMatches = text.matchAll(/href="([^"]*linkedin\.com\/in\/[^"]*)"/g);
        
        const extractedUrls = Array.from(urlMatches, m => m[1]);
        if (extractedUrls.length > 0) {
          const firstUrl = decodeURIComponent(extractedUrls[0].replace(/.*uddg=/, '').split('&')[0]);
          realProfiles.push(firstUrl);
        }
      }
    } catch (e) {
      // Non-blocking fallback
    }

    results.push({
      tier: t.tier,
      icon: t.icon,
      priority: t.priority,
      recommended_titles: t.role_query.replace(/OR/g, '·').replace(/[()"]/g, ''),
      dork_query: dorkQuery,
      search_url: googleSearchUrl,
      live_profile_url: realProfiles[0] || googleSearchUrl
    });
  }

  return res.status(200).json({
    success: true,
    company: cleanCompany,
    role: cleanRole,
    decision_makers: results
  });
}
