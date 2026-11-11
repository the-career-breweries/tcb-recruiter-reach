// api/find-decision-makers.js
// Safe Decision-Maker Discovery: Direct LinkedIn People Search + Google X-Ray Queries

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
  if (cleanCompany.toLowerCase() === "www" || cleanCompany.toLowerCase() === "target company") {
    cleanCompany = "Accenture";
  }

  const cleanRole = (body.role || body.job_title || "Sales Representative").trim();
  const department = body.department || classifyDepartment(cleanRole, body.jd_text);
  
  let cleanLoc = (body.location || "India").split(",")[0].trim();
  if (!cleanLoc) cleanLoc = "India";

  let targets = [];

  if (department === "Sales & Revenue") {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: '"Inside Sales Manager" OR "Sales Director" OR "Head of Inside Sales" OR "Inside Sales Lead" OR "VP of Sales"',
        linkedin_keywords: `${cleanCompany} Inside Sales Manager ${cleanLoc}`,
        icon: "👔",
        priority: "Highest Reply Rate: Owns inside sales quota & hiring decisions"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Sales Recruiter" OR "Talent Acquisition Specialist" OR "Technical Recruiter" OR "HR Lead"',
        linkedin_keywords: `${cleanCompany} Sales Recruiter ${cleanLoc}`,
        icon: "🎯",
        priority: "Actively screening applicants for this open sales role"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: '"Senior Inside Sales" OR "Senior Account Executive" OR "Inside Sales Specialist"',
        linkedin_keywords: `${cleanCompany} Senior Inside Sales ${cleanLoc}`,
        icon: "🤝",
        priority: "Peer in this exact pod: Can fast-track you via internal referral"
      }
    ];
  } else if (department === "Career Services & Placements") {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: '"Head of Placements" OR "Director of Career Services" OR "VP of Outcomes" OR "Corporate Relations Head"',
        linkedin_keywords: `${cleanCompany} Head of Placements ${cleanLoc}`,
        icon: "👔",
        priority: "Highest Reply Rate: Direct supervisor for placement & corporate relations pods"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Talent Acquisition Specialist" OR "HR Manager" OR "Recruitment Lead"',
        linkedin_keywords: `${cleanCompany} Talent Acquisition ${cleanLoc}`,
        icon: "🎯",
        priority: "Screens applications daily: Has direct access to hiring panel"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: '"Placements Manager" OR "Senior Career Services Specialist" OR "Corporate Relations Lead"',
        linkedin_keywords: `${cleanCompany} Placements Manager ${cleanLoc}`,
        icon: "🤝",
        priority: "Peer in team: Can submit your profile for internal referral bonuses"
      }
    ];
  } else if (department === "Product & Design") {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: '"VP of Product" OR "Head of Product" OR "Director of Product" OR "Group Product Manager"',
        linkedin_keywords: `${cleanCompany} Head of Product ${cleanLoc}`,
        icon: "👔",
        priority: "Highest Reply Rate: Product leader managing this roadmap"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Product Recruiter" OR "Talent Acquisition Specialist" OR "Technical Recruiter"',
        linkedin_keywords: `${cleanCompany} Product Recruiter ${cleanLoc}`,
        icon: "🎯",
        priority: "Dedicated recruiter for product management roles"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: '"Senior Product Manager" OR "Principal Product Manager" OR "Lead Designer"',
        linkedin_keywords: `${cleanCompany} Senior Product Manager ${cleanLoc}`,
        icon: "🤝",
        priority: "Peer referral: Evaluates cultural and problem-solving fit"
      }
    ];
  } else if (department === "Marketing & Growth") {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: '"Marketing Director" OR "Head of Marketing" OR "VP of Marketing" OR "Head of Growth"',
        linkedin_keywords: `${cleanCompany} Head of Marketing ${cleanLoc}`,
        icon: "👔",
        priority: "Owns the marketing budget and open headcount"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Marketing Recruiter" OR "Talent Acquisition Specialist" OR "HR Lead"',
        linkedin_keywords: `${cleanCompany} Marketing Recruiter ${cleanLoc}`,
        icon: "🎯",
        priority: "Screens marketing and growth applicants"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: '"Senior Marketing Manager" OR "Growth Specialist" OR "Content Lead"',
        linkedin_keywords: `${cleanCompany} Senior Marketing Manager ${cleanLoc}`,
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
        linkedin_keywords: `${cleanCompany} Engineering Manager ${cleanLoc}`,
        icon: "👔",
        priority: "Highest Reply Rate: Owns the engineering team's open headcount"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Technical Recruiter" OR "Talent Acquisition Specialist" OR "Engineering Recruiter"',
        linkedin_keywords: `${cleanCompany} Technical Recruiter ${cleanLoc}`,
        icon: "🎯",
        priority: "Screens technical resumes daily: Manages active pipeline"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: `"Senior ${roleBase}" OR "Staff ${roleBase}" OR "Lead ${roleBase}"`,
        linkedin_keywords: `${cleanCompany} Senior ${roleBase} ${cleanLoc}`,
        icon: "🤝",
        priority: "Alumni / Peer Referral: Can refer internally for referral bonuses"
      }
    ];
  } else {
    targets = [
      {
        tier: "Hiring Manager / Team Lead",
        role_query: `"${cleanRole}" AND ("Manager" OR "Director" OR "Head" OR "Lead")`,
        linkedin_keywords: `${cleanCompany} ${cleanRole} Manager ${cleanLoc}`,
        icon: "👔",
        priority: "Highest Reply Rate: Department leader overseeing this role"
      },
      {
        tier: "Talent Acquisition Specialist",
        role_query: '"Talent Acquisition Specialist" OR "Technical Recruiter" OR "HR Manager"',
        linkedin_keywords: `${cleanCompany} Recruiter ${cleanLoc}`,
        icon: "🎯",
        priority: "Screens applications daily"
      },
      {
        tier: "Senior Peer / Potential Teammate",
        role_query: `"Senior ${cleanRole}" OR "Lead ${cleanRole}"`,
        linkedin_keywords: `${cleanCompany} Senior ${cleanRole} ${cleanLoc}`,
        icon: "🤝",
        priority: "Senior peer in the same domain"
      }
    ];
  }

  const results = targets.map(t => {
    // 1. Direct LinkedIn People Search URL (takes logged-in user straight to LinkedIn profiles)
    const linkedinDirectUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(t.linkedin_keywords)}&origin=GLOBAL_SEARCH_HEADER`;
    
    // 2. Google X-Ray Search URL (for public Google search results)
    const dorkQuery = `site:linkedin.com/in "${cleanCompany}" (${t.role_query}) "${cleanLoc}"`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}`;

    return {
      tier: t.tier,
      icon: t.icon,
      priority: t.priority,
      recommended_titles: t.role_query.replace(/OR/g, "·").replace(/[()"]/g, "").trim(),
      linkedin_keywords: t.linkedin_keywords,
      linkedin_url: linkedinDirectUrl,
      google_url: googleSearchUrl,
      dork_query: dorkQuery,
      search_url: linkedinDirectUrl // Default primary action to LinkedIn
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
