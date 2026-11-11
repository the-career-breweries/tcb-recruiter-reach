// api/find-decision-makers.js
// Safe Decision-Maker Discovery via Google X-Ray Search with Dynamic Domain Archetypes

function classifyDepartment(roleStr, textStr) {
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
  let cleanCompany = (body.company || body.company_name || "Target Company").trim();
  // Never allow "Www" or generic rubbish
  if (cleanCompany.toLowerCase() === "www" || cleanCompany.toLowerCase() === "target company") {
    cleanCompany = "Accenture";
  }

  const cleanRole = (body.role || body.job_title || "Sales Representative").trim();
  const department = body.department || classifyDepartment(cleanRole, body.jd_text);
  
  // Clean location (e.g. "Bengaluru, India" -> "Bengaluru")
  let cleanLoc = (body.location || "India").split(",")[0].trim();
  if (!cleanLoc) cleanLoc = "India";

  let targets = [];

  if (department === "Sales & Revenue") {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: '"Inside Sales Manager" OR "Sales Director" OR "Head of Inside Sales" OR "Inside Sales Lead" OR "VP of Sales"',
        icon: "👔",
        priority: "Highest Reply Rate: Owns the inside sales headcount & revenue targets"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Sales Recruiter" OR "Talent Acquisition Specialist" OR "Technical Recruiter" OR "HR Lead"',
        icon: "🎯",
        priority: "Screens sales applicants daily: Managing the active hiring pipeline"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: '"Senior Inside Sales" OR "Senior Account Executive" OR "Inside Sales Specialist"',
        icon: "🤝",
        priority: "Alumni / Peer Referral: Can fast-track your resume through the internal portal"
      }
    ];
  } else if (department === "Career Services & Placements") {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: '"Head of Placements" OR "Director of Career Services" OR "VP of Outcomes" OR "Corporate Relations Head"',
        icon: "👔",
        priority: "Highest Reply Rate: Direct supervisor for placement & corporate relations pods"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Talent Acquisition Specialist" OR "HR Manager" OR "Recruitment Lead"',
        icon: "🎯",
        priority: "Screens applications daily: Has direct access to the hiring panel"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: '"Placements Manager" OR "Senior Career Services Specialist" OR "Corporate Relations Lead"',
        icon: "🤝",
        priority: "Peer in team: Can submit your profile for internal referral bonuses"
      }
    ];
  } else if (department === "Product & Design") {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: '"VP of Product" OR "Head of Product" OR "Director of Product" OR "Group Product Manager"',
        icon: "👔",
        priority: "Highest Reply Rate: Product leader managing the specific roadmap"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Product Recruiter" OR "Talent Acquisition Specialist" OR "Technical Recruiter"',
        icon: "🎯",
        priority: "Dedicated recruiter for product management roles"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: '"Senior Product Manager" OR "Principal Product Manager" OR "Lead Designer"',
        icon: "🤝",
        priority: "Peer referral: Evaluates cultural and problem-solving fit"
      }
    ];
  } else if (department === "Marketing & Growth") {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: '"Marketing Director" OR "Head of Marketing" OR "VP of Marketing" OR "Head of Growth"',
        icon: "👔",
        priority: "Owns the marketing budget and open headcount"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Marketing Recruiter" OR "Talent Acquisition Specialist" OR "HR Lead"',
        icon: "🎯",
        priority: "Screens marketing and growth applicants"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: '"Senior Marketing Manager" OR "Growth Specialist" OR "Content Lead"',
        icon: "🤝",
        priority: "Peer referral: Can vouch for execution skills"
      }
    ];
  } else if (department === "Engineering & Technology") {
    const roleBase = cleanRole.replace(/Senior|Junior|Lead|Associate|Staff/gi, "").trim();
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: `"Engineering Manager" OR "Tech Lead" OR "VP of Engineering" OR "Director of Engineering" OR "Lead ${roleBase}"`,
        icon: "👔",
        priority: "Highest Reply Rate: Owns the engineering team's open headcount"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Technical Recruiter" OR "Talent Acquisition Specialist" OR "Engineering Recruiter"',
        icon: "🎯",
        priority: "Screens technical resumes daily: Manages active pipeline"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: `"Senior ${roleBase}" OR "Staff ${roleBase}" OR "Lead ${roleBase}"`,
        icon: "🤝",
        priority: "Alumni / Peer Referral: Can refer internally for referral bonuses"
      }
    ];
  } else {
    // Dynamic Fallback
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: `"${cleanRole}" AND ("Manager" OR "Director" OR "Head" OR "Lead")`,
        icon: "👔",
        priority: "Highest Reply Rate: Department leader overseeing this role"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Talent Acquisition Specialist" OR "Technical Recruiter" OR "HR Manager"',
        icon: "🎯",
        priority: "Screens applications daily"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: `"Senior ${cleanRole}" OR "Lead ${cleanRole}"`,
        icon: "🤝",
        priority: "Senior peer in the same domain"
      }
    ];
  }

  const results = targets.map(t => {
    // Exact Google X-Ray query ensuring company name is strictly quoted and LinkedIn profiles only
    const dorkQuery = `site:linkedin.com/in "${cleanCompany}" (${t.role_query}) "${cleanLoc}"`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}`;

    return {
      tier: t.tier,
      icon: t.icon,
      priority: t.priority,
      recommended_titles: t.role_query.replace(/OR/g, "·").replace(/[()"]/g, "").trim(),
      dork_query: dorkQuery,
      search_url: googleSearchUrl
    };
  });

  return res.status(200).json({
    success: true,
    company: cleanCompany,
    role: cleanRole,
    department,
    decision_makers: results
  });
}
