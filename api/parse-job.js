// api/parse-job.js
// Job Link & Description Parser

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { job_url, company, role, location, jd_text } = req.body || {};

  // 1. Manual Entry Mode
  if (company && role) {
    let domain = `${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    // Clean known brands
    if (/swiggy/i.test(company)) domain = "swiggy.in";
    if (/phonepe/i.test(company)) domain = "phonepe.com";
    if (/zomato/i.test(company)) domain = "zomato.com";

    return res.status(200).json({
      success: true,
      company: company.trim(),
      role: role.trim(),
      location: (location || "India").trim(),
      domain,
      summary: jd_text ? jd_text.slice(0, 300) : `${role.trim()} at ${company.trim()}`
    });
  }

  // 2. URL Parsing Mode
  if (!job_url) {
    return res.status(400).json({ error: "Either job_url or company & role are required." });
  }

  let extractedCompany = "";
  let extractedRole = "";
  let extractedDomain = "";
  let extractedLocation = "India";
  let extractedSnippet = "";

  try {
    const urlObj = new URL(job_url);
    const host = urlObj.hostname.toLowerCase();

    // Check known ATS patterns:
    // e.g. boards.greenhouse.io/{company}/jobs/...
    if (host.includes("greenhouse.io")) {
      const parts = urlObj.pathname.split("/").filter(Boolean);
      extractedCompany = parts[0] || "Target Company";
      extractedDomain = `${extractedCompany.toLowerCase()}.com`;
    } else if (host.includes("lever.co")) {
      const parts = urlObj.pathname.split("/").filter(Boolean);
      extractedCompany = parts[0] || "Target Company";
      extractedDomain = `${extractedCompany.toLowerCase()}.com`;
    } else if (host.includes("linkedin.com")) {
      extractedCompany = "Hiring Company";
    } else {
      // Direct company career site e.g. careers.swiggy.com -> swiggy.in
      const domainParts = host.replace("careers.", "").replace("jobs.", "").split(".");
      extractedCompany = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
      extractedDomain = host.replace(/^(careers|jobs)\./, "");
    }

    // Attempt to scrape page title / headers
    try {
      const pageRes = await fetch(job_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(5000)
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          const rawTitle = titleMatch[1].trim();
          extractedSnippet = rawTitle;
          // Typical title format: "Software Engineer - Frontend at Swiggy"
          if (rawTitle.includes(" at ")) {
            const [r, c] = rawTitle.split(" at ");
            extractedRole = r.trim();
            extractedCompany = c.split("|")[0].split("-")[0].trim();
          } else if (rawTitle.includes(" - ")) {
            const parts = rawTitle.split(" - ");
            extractedRole = parts[0].trim();
            if (parts[1]) extractedCompany = parts[1].split("|")[0].trim();
          }
        }
      }
    } catch {}

    if (!extractedRole) extractedRole = "Open Position";
    if (!extractedCompany) extractedCompany = "Hiring Company";
    if (!extractedDomain) extractedDomain = `${extractedCompany.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    return res.status(200).json({
      success: true,
      company: extractedCompany,
      role: extractedRole,
      location: extractedLocation,
      domain: extractedDomain,
      summary: extractedSnippet || `Job Posting at ${extractedCompany}`
    });
  } catch (err) {
    return res.status(400).json({ error: "Invalid URL provided." });
  }
}
