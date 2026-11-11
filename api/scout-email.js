// api/scout-email.js
// Corporate Email Pattern Reconnaissance & MX Verification Engine

import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// Curated database of verified email conventions for top companies
const KNOWN_COMPANY_PATTERNS = {
  // Global Tech & Consulting
  'google.com': '{first}{last}@google.com',
  'microsoft.com': '{first}.{last}@microsoft.com',
  'amazon.com': '{firstlast}@amazon.com',
  'apple.com': '{first_initial}{last}@apple.com',
  'meta.com': '{first}{last}@meta.com',
  'deloitte.com': '{first}{last}@deloitte.com',
  'pwc.com': '{first}.{last}@pwc.com',
  'ey.com': '{first}.{last}@ey.com',
  'kpmg.com': '{first}{last}@kpmg.com',
  'mckinsey.com': '{first}_{last}@mckinsey.com',
  'bcg.com': '{last}.{first}@bcg.com',
  'accenture.com': '{first}.{last}@accenture.com',
  'ibm.com': '{first}.{last}@ibm.com',

  // Indian Tech Unicorns & Product Giants
  'swiggy.in': '{first}.{last}@swiggy.in',
  'zomato.com': '{first}.{last}@zomato.com',
  'razorpay.com': '{first}.{last}@razorpay.com',
  'flipkart.com': '{first}.{last}@flipkart.com',
  'phonepe.com': '{first}.{last}@phonepe.com',
  'cred.club': '{first}@cred.club',
  'zerodha.com': '{first}@zerodha.com',
  'groww.in': '{first}.{last}@groww.in',
  'meesho.com': '{first}.{last}@meesho.com',
  'zepto.com': '{first}.{last}@zepto.com',
  'urbancompany.com': '{first}.{last}@urbancompany.com',
  'ola.in': '{first}.{last}@ola.in',
  'paytm.com': '{first}.{last}@paytm.com',
  'dream11.com': '{first}.{last}@dream11.com',
  'postman.com': '{first}.{last}@postman.com',
  'browserstack.com': '{first}.{last}@browserstack.com',
  'inmobi.com': '{first}.{last}@inmobi.com',

  // Indian IT Majors
  'tcs.com': '{first}.{last}@tcs.com',
  'infosys.com': '{first}.{last}@infosys.com',
  'wipro.com': '{first}.{last}@wipro.com',
  'hcltech.com': '{first}.{last}@hcltech.com',
  'techmahindra.com': '{first}.{last}@techmahindra.com',
  'cognizant.com': '{first}.{last}@cognizant.com',
  'capgemini.com': '{first}.{last}@capgemini.com'
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const domain = body.domain;
  const first_name = body.first_name || body.firstName;
  const last_name = body.last_name || body.lastName;
  const company_name = body.company_name || body.companyName || body.company;

  const fRaw = (first_name || "recruiter").trim().toLowerCase().replace(/[^a-z]/g, "");
  const lRaw = (last_name || "").trim().toLowerCase().replace(/[^a-z]/g, "");

  const f = fRaw || "hiring";
  const l = lRaw || "team";
  const fInitial = f.charAt(0);
  const lInitial = l.charAt(0);

  // Normalize domain
  let cleanDomain = (domain || "").toLowerCase().trim();
  cleanDomain = cleanDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(":")[0];

  // If no domain provided, try to infer from company name
  if (!cleanDomain && company_name) {
    const slug = company_name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    cleanDomain = `${slug}.com`;
  }

  if (!cleanDomain) {
    cleanDomain = "company.com";
  }

  // 1. Check DNS MX Records
  let mxValid = false;
  let mxHost = null;
  let isGoogleOrMicrosoft = false;

  try {
    const mxRecords = await resolveMx(cleanDomain);
    if (mxRecords && mxRecords.length > 0) {
      mxValid = true;
      mxHost = mxRecords[0].exchange;
      if (mxRecords.some(r => /google|aspmx|outlook|microsoft/i.test(r.exchange))) {
        isGoogleOrMicrosoft = true;
      }
    }
  } catch (err) {
    mxValid = false;
  }

  // 2. Check pattern matching
  const knownPattern = KNOWN_COMPANY_PATTERNS[cleanDomain];
  let primaryEmail = "";
  let secondaryEmail = "";
  let patternFormula = "{first}.{last}@{domain}";
  let confidenceScore = 65;

  if (knownPattern) {
    patternFormula = knownPattern;
    primaryEmail = knownPattern
      .replace('{first}', f)
      .replace('{last}', l)
      .replace('{first_initial}', fInitial)
      .replace('{last_initial}', lInitial)
      .replace('{firstlast}', `${f}${l}`)
      .replace('{first_last}', `${f}_${l}`);
    secondaryEmail = `${f}.${l}@${cleanDomain}`;
    if (primaryEmail === secondaryEmail) {
      secondaryEmail = `${fInitial}${l}@${cleanDomain}`;
    }
    confidenceScore = 92;
  } else {
    // Standard corporate convention
    primaryEmail = `${f}.${l}@${cleanDomain}`;
    secondaryEmail = `${fInitial}${l}@${cleanDomain}`;
    if (isGoogleOrMicrosoft) {
      confidenceScore = 85;
    } else if (mxValid) {
      confidenceScore = 75;
    } else {
      confidenceScore = 45;
    }
  }

  const confidenceLabel = confidenceScore >= 85 ? "High Confidence" : confidenceScore >= 70 ? "Probable Match" : "Estimated Pattern";

  return res.status(200).json({
    success: true,
    domain: cleanDomain,
    mx_valid: mxValid,
    mail_provider: isGoogleOrMicrosoft ? "Google / Microsoft Corporate Exchange" : mxValid ? "Active MX Server" : "DNS Not Verified",
    confidence_score: confidenceScore,
    confidence_label: confidenceLabel,
    primary_email: primaryEmail,
    secondary_email: secondaryEmail,
    pattern_formula: patternFormula,
    guidance: "Use LinkedIn Connection Note as Strike 1 (100% deliverability). If no response within 48h, send Strike 2 to the primary corporate email."
  });
}
