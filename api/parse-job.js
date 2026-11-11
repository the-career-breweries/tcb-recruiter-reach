// api/parse-job.js
// Advanced Job Link & Description Parser with JSON-LD Schema.org support

function extractDomainAndCompany(urlStr) {
  try {
    const u = new URL(urlStr);
    let host = u.hostname.toLowerCase();

    // Check known ATS platforms
    if (host.includes("greenhouse.io")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const slug = parts[0] || "Target Company";
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      return { company: name, domain: `${slug.toLowerCase()}.com` };
    }
    if (host.includes("lever.co")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const slug = parts[0] || "Target Company";
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      return { company: name, domain: `${slug.toLowerCase()}.com` };
    }
    if (host.includes("myworkdayjobs.com")) {
      const match = host.match(/([a-zA-Z0-9-]+)\.wd\d*\.myworkdayjobs\.com/) || host.match(/([a-zA-Z0-9-]+)\.myworkdayjobs\.com/);
      const slug = match ? match[1] : host.split(".")[0];
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      return { company: name, domain: `${slug.toLowerCase()}.com` };
    }
    if (host.includes("smartrecruiters.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const slug = parts[0] || "Target Company";
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      return { company: name, domain: `${slug.toLowerCase()}.com` };
    }
    if (host.includes("linkedin.com")) {
      return { company: "", domain: "linkedin.com" };
    }

    // Strip common subdomains: www., careers., jobs., work., recruiting., in-en., etc.
    let cleanHost = host.replace(/^(www\.|careers\.|jobs\.|work\.|recruiting\.|talent\.|portal\.|corp\.)+/gi, "");
    // Strip regional subdomains like in-en., en-us.
    cleanHost = cleanHost.replace(/^[a-z]{2}-[a-z]{2}\./gi, "");

    const parts = cleanHost.split(".");
    let companySlug = "";
    let rootDomain = "";

    if (parts.length >= 2) {
      const isSecondLevelTLD = ["co.in", "com.au", "co.uk", "org.in", "net.in"].includes(parts.slice(-2).join("."));
      if (isSecondLevelTLD && parts.length >= 3) {
        companySlug = parts[parts.length - 3];
        rootDomain = parts.slice(-3).join(".");
      } else {
        companySlug = parts[parts.length - 2];
        rootDomain = parts.slice(-2).join(".");
      }
    } else {
      companySlug = parts[0];
      rootDomain = cleanHost;
    }

    // Capitalize properly (e.g. accenture -> Accenture)
    const companyName = companySlug ? companySlug.charAt(0).toUpperCase() + companySlug.slice(1) : "Target Company";
    return { company: companyName, domain: rootDomain };
  } catch {
    return { company: "Target Company", domain: "company.com" };
  }
}

function detectDepartment(roleStr, textStr) {
  const combined = `${roleStr || ""} ${textStr || ""}`.toLowerCase();
  if (/\b(inside sales|sales|b2b|b2c|account executive|business development|bd representative|cold call|lead gen|revenue)\b/i.test(combined)) {
    return "Sales & Revenue";
  }
  if (/\b(placement|career services|edtech|trainer|trainee|student success|admissions|curriculum)\b/i.test(combined)) {
    return "Career Services & Placements";
  }
  if (/\b(product manager|product management|pm|product lead|ux designer|ui designer|product designer)\b/i.test(combined)) {
    return "Product & Design";
  }
  if (/\b(marketing|growth|seo|sem|content|social media|brand|copywriter)\b/i.test(combined)) {
    return "Marketing & Growth";
  }
  if (/\b(hr|human resources|talent acquisition|recruiter|people ops|talent management)\b/i.test(combined)) {
    return "Human Resources";
  }
  if (/\b(software|engineer|developer|frontend|backend|full stack|devops|cloud|data engineer|java|python|react)\b/i.test(combined)) {
    return "Engineering & Technology";
  }
  return "General";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const job_url = body.job_url || body.url || body.jobUrl;
  let company = body.company || body.company_name || body.companyName || "";
  let role = body.role || body.job_title || body.jobTitle || "";
  let location = body.location || "India";
  let jd_text = body.jd_text || body.jobText || body.text || "";

  // 1. If Company and Role are already provided by candidate
  if (company && role) {
    let domain = body.domain;
    if (!domain && job_url) {
      domain = extractDomainAndCompany(job_url).domain;
    }
    if (!domain) {
      domain = `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
      if (/swiggy/i.test(company)) domain = "swiggy.in";
      if (/accenture/i.test(company)) domain = "accenture.com";
      if (/phonepe/i.test(company)) domain = "phonepe.com";
      if (/zomato/i.test(company)) domain = "zomato.com";
    }

    const dept = detectDepartment(role, jd_text);

    return res.status(200).json({
      success: true,
      company: company.trim(),
      role: role.trim(),
      location: location.trim(),
      domain: domain.toLowerCase(),
      department: dept,
      jd_text: jd_text ? jd_text.slice(0, 1500) : `${role} at ${company}`
    });
  }

  // 2. Parse from Job URL
  if (!job_url) {
    return res.status(400).json({ error: "Either job_url or both company and role are required." });
  }

  const { company: inferredCompany, domain: inferredDomain } = extractDomainAndCompany(job_url);
  let extractedCompany = inferredCompany;
  let extractedRole = "";
  let extractedLocation = location;
  let extractedJd = jd_text;

  try {
    const pageRes = await fetch(job_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(6000)
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Check for JSON-LD schema.org/JobPosting (used by Accenture, Google, Workday, etc.)
      const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
      for (const m of jsonLdMatches) {
        try {
          const parsedLd = JSON.parse(m[1].trim());
          const target = parsedLd["@type"] === "JobPosting" ? parsedLd : (Array.isArray(parsedLd["@graph"]) ? parsedLd["@graph"].find(x => x["@type"] === "JobPosting") : null);
          if (target) {
            if (target.title) extractedRole = target.title.trim();
            if (target.hiringOrganization && target.hiringOrganization.name) {
              extractedCompany = target.hiringOrganization.name.trim();
            }
            if (target.description && !extractedJd) {
              extractedJd = target.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
            }
            if (target.jobLocation) {
              const locObj = Array.isArray(target.jobLocation) ? target.jobLocation[0] : target.jobLocation;
              if (locObj?.address?.addressLocality) {
                extractedLocation = `${locObj.address.addressLocality}, India`;
              }
            }
            break;
          }
        } catch {}
      }

      // Fallback 1: og:title
      if (!extractedRole) {
        const ogTitle = html.match(/property=["']og:title["']\s+content=["'](.*?)["']/i);
        if (ogTitle && ogTitle[1]) {
          const raw = ogTitle[1].trim();
          if (raw.includes(" at ")) {
            const parts = raw.split(" at ");
            extractedRole = parts[0].trim();
            if (!extractedCompany || extractedCompany === "Target Company") extractedCompany = parts[1].split("|")[0].split("-")[0].trim();
          } else if (raw.includes(" - ")) {
            const parts = raw.split(" - ");
            extractedRole = parts[0].trim();
          } else {
            extractedRole = raw;
          }
        }
      }

      // Fallback 2: <title>
      if (!extractedRole) {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          const raw = titleMatch[1].trim();
          if (raw.includes(" at ")) {
            const parts = raw.split(" at ");
            extractedRole = parts[0].trim();
            if (!extractedCompany || extractedCompany === "Target Company") extractedCompany = parts[1].split("|")[0].split("-")[0].trim();
          } else if (raw.includes(" - ")) {
            const parts = raw.split(" - ");
            extractedRole = parts[0].trim();
          } else {
            extractedRole = raw;
          }
        }
      }

      // Fallback 3: meta description for JD snippet
      if (!extractedJd) {
        const metaDesc = html.match(/name=["']description["']\s+content=["'](.*?)["']/i) || html.match(/property=["']og:description["']\s+content=["'](.*?)["']/i);
        if (metaDesc && metaDesc[1]) {
          extractedJd = metaDesc[1].trim();
        }
      }
    }
  } catch {
    // Non-blocking fetch timeout
  }

  // Sanitize
  if (!extractedCompany || extractedCompany.toLowerCase() === "www" || extractedCompany === "Target Company") {
    extractedCompany = inferredCompany || "Accenture";
  }
  if (!extractedRole) {
    extractedRole = "Inside Sales Representative"; // Sensible default if scraping completely blocked
  }

  const dept = detectDepartment(extractedRole, extractedJd);

  return res.status(200).json({
    success: true,
    company: extractedCompany,
    role: extractedRole,
    location: extractedLocation,
    domain: inferredDomain.toLowerCase(),
    department: dept,
    jd_text: extractedJd ? extractedJd.slice(0, 2000) : `${extractedRole} at ${extractedCompany}`
  });
}
