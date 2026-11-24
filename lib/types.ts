export type ServiceType =
  | 'website_redesign'
  | 'local_seo'
  | 'lead_generation'
  | 'paid_ads'
  | 'custom';

export type OutreachPreference =
  | 'email_and_social'
  | 'social_dm_first'
  | 'email_only';

export type OutreachTone = 'audit_first' | 'direct_helpful' | 'short_dm';

export type ActiveWorkspaceView = 'setup' | 'workbench' | 'skill' | 'reality';

export interface AgencyProfile {
  senderName: string;
  agencyName: string;
  serviceType: ServiceType;
  serviceLabel: string;
  starterPrice: string;
  outreachPreference: OutreachPreference;
}

export interface SocialLinks {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  x?: string;
}

export interface AuditIssue {
  code: string;
  severity: 'high' | 'medium' | 'info';
  title: string;
  evidence: string;
  pitchAngle: string;
}

export interface AuditResult {
  checkedAt: string;
  reachable: boolean;
  httpStatus: number | null;
  finalUrl: string;
  responseMs: number | null;
  httpsValid: boolean;
  hasMobileViewport: boolean;
  pageTitle: string;
  metaDescription: string;
  hasMetaDescription: boolean;
  copyrightYear: number | null;
  hasContactForm: boolean;
  hasSchemaMarkup: boolean;
  brokenInternalLinks: string[];
  extractedEmails: string[];
  extractedPhones: string[];
  extractedSocials: SocialLinks;
  mxVerified: boolean;
  mxProvider: string;
  mxRecords: string[];
  issues: AuditIssue[];
  errorNote?: string;
}

export interface OutreachDraft {
  tone: OutreachTone;
  subject: string;
  emailBody: string;
  socialDm: string;
  evidenceUsed: string[];
  generatedAt: string;
}

export interface Prospect {
  id: string;
  companyName: string;
  website: string;
  location: string;
  industry: string;
  sourceChannel: string;
  sourceUrl: string;
  decisionMakerName: string;
  decisionMakerRole: string;
  decisionMakerEmail: string;
  socialLinks: SocialLinks;
  whyGoodFit: string;
  auditStatus: 'idle' | 'auditing' | 'done' | 'error';
  audit?: AuditResult;
  draft?: OutreachDraft;
  outreachStatus: 'new' | 'copied' | 'sent';
  importedFromCsv?: boolean;
}

export interface GroundingCitation {
  title: string;
  uri: string;
}

export interface LeadCampaign {
  id: string;
  niche: string;
  location: string;
  sourceStrategy: string[];
  createdAt: string;
  citations: GroundingCitation[];
  prospects: Prospect[];
}

export interface ServiceOption {
  id: ServiceType;
  label: string;
  beginnerPrice: string;
  summary: string;
  idealSignals: string;
}

export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'website_redesign',
    label: 'Website Redesign & Speed Fix',
    beginnerPrice: '$650 – $1,200 one-time',
    summary: 'Modernize outdated local business websites that lack mobile responsiveness, SSL, or clear booking forms.',
    idealSignals: 'Missing mobile viewport, old copyright year, slow load time, or missing meta tags.',
  },
  {
    id: 'local_seo',
    label: 'Local Search & Listing Optimization',
    beginnerPrice: '$450 – $850 / month',
    summary: 'Fix missing SEO metadata, broken pages, and local schema markup so neighborhood customers find them first.',
    idealSignals: 'Missing meta descriptions, absent LocalBusiness schema, thin titles, or broken links.',
  },
  {
    id: 'lead_generation',
    label: 'B2B Lead Generation & Appointment Setting',
    beginnerPrice: '$750 – $1,500 / month',
    summary: 'Deliver verified decision-maker lists and personalized outreach sequences for small agencies or contractors.',
    idealSignals: 'Active hiring or expansion, lean founder-led team, public directory presence without paid acquisition.',
  },
  {
    id: 'paid_ads',
    label: 'Starter Meta & Google Local Ads',
    beginnerPrice: '$600 – $1,000 / month + ad spend',
    summary: 'Launch focused local lead-capture campaigns without enterprise retainers—realistic for a beginner agency.',
    idealSignals: 'High-ticket local service (HVAC, roofing, dental, legal) with no tracking pixel or weak conversion form.',
  },
];

export interface NichePreset {
  niche: string;
  location: string;
  channels: string[];
}

export const NICHE_PRESETS: NichePreset[] = [
  {
    niche: 'Independent HVAC & Plumbing Contractors',
    location: 'Austin, TX',
    channels: ['Local Chamber of Commerce', 'Texas Licensing Directory', 'Trade Association Rosters'],
  },
  {
    niche: 'Family Dental & Orthodontic Clinics',
    location: 'Scottsdale, AZ',
    channels: ['State Dental Society Directory', 'Local Business Guilds', 'Direct Clinic Websites'],
  },
  {
    niche: 'Boutique Architecture & Interior Studios',
    location: 'Denver, CO',
    channels: ['AIA Chapter Directory', 'Regional Design Guides', 'Studio Career & About Pages'],
  },
  {
    niche: 'Commercial Roofing & Solar Installers',
    location: 'Tampa, FL',
    channels: ['State Contractor Registry', 'BBB Accredited Listings', 'Local Trade Chambers'],
  },
];

export interface OssCapabilityItem {
  category: string;
  capability: string;
  ossPattern: string;
  howApertureImplements: string;
  cost: string;
}

export const OSS_CAPABILITIES: OssCapabilityItem[] = [
  {
    category: 'Overlooked Source Discovery',
    capability: 'US Chambers, State Registries & Trade Rosters',
    ossPattern: 'Search-operator dorking (site:.org chamber, licensing rosters, association member pages)',
    howApertureImplements: 'Live Gemini 4 Hydrogen Search Grounding automatically targets non-freelance US public directories and returns clickable citations.',
    cost: '$0',
  },
  {
    category: 'Live HTML & Contact Extraction',
    capability: 'Email, Phone, Social & Leadership Scraping',
    ossPattern: 'Cheerio / BeautifulSoup DOM extraction + mailto:, tel:, JSON-LD Schema.org, and LinkedIn/Instagram regex parsing',
    howApertureImplements: 'Server-side HTML parser inspects every prospect URL live, extracting contact emails, social links, copyright year, and form presence.',
    cost: '$0',
  },
  {
    category: 'Domain & Mail Verification',
    capability: 'DNS MX Record & Provider Detection',
    ossPattern: 'Node dns.resolveMx / dnspython mail-exchanger validation (Google Workspace, Microsoft 365, Proofpoint)',
    howApertureImplements: 'Real server-side DNS MX resolution confirms the domain accepts mail and identifies its mail host before you ever draft an email.',
    cost: '$0',
  },
  {
    category: 'Objective Website Evidence Audit',
    capability: 'Technical Flaw Detection for High-Reply Pitches',
    ossPattern: 'HTTP status, SSL check, response latency, viewport meta check, SEO meta audit, and broken internal link sampling',
    howApertureImplements: 'Audits every live site and turns concrete, verifiable flaws into specific talking points so you never send generic cold spam.',
    cost: '$0',
  },
  {
    category: 'Precision Copywriting & Export',
    capability: 'Evidence-First Email, Social DM & Antigravity Skill',
    ossPattern: 'Structured prompt engineering + portable Markdown SKILL.md + RFC-4180 CSV export',
    howApertureImplements: 'Generates tailored emails and short decision-maker DMs referencing live audit findings, plus a downloadable SKILL.md for Antigravity.',
    cost: '$0',
  },
];

export interface FailureDiagnosisItem {
  originalAsk: string;
  whyItFailed: string;
  workingSolution: string;
}

export const FAILURE_DIAGNOSIS: FailureDiagnosisItem[] = [
  {
    originalAsk: 'Send 60,000 personalized emails per day from 12 personal Gmail accounts at $0.',
    whyItFailed:
      'Personal Gmail accounts hard-cap around 500 emails/day (and flag cold blasts after ~30–50/day). Sending 60,000/day requires ~1,500 warmed domains, dedicated SMTP pools, and DNS rotation—impossible on 12 personal inboxes without instant suspension.',
    workingSolution:
      'Pivot to evidence-backed precision outreach: 25–40 hyper-verified prospects per day combining verified business emails AND direct decision-maker LinkedIn/Instagram/Facebook DMs. Higher reply rate, zero domain burn, $0 cost.',
  },
  {
    originalAsk: 'Read and inspect the full source code of 1,000 GitHub repositories in a single prompt.',
    whyItFailed:
      'Even frontier models cannot fetch and audit 1,000 full GitHub repositories in one request due to API rate limits and context ceilings. Earlier attempts either hallucinated repo lists or stalled out asking you for URLs.',
    workingSolution:
      'Distill the 5 core engineering primitives shared across the top open-source lead tools (search dorking, Cheerio HTML/JSON-LD extraction, live DNS MX verification, HTTP/SEO auditing, and CSV/Skill export) and run them natively inside one clean app.',
  },
  {
    originalAsk: 'Ask for Ollama API keys, paid scraping proxies, or manual URLs before doing anything.',
    whyItFailed:
      'Requiring external keys or forcing you to paste URLs breaks the one-click workflow and introduces fragile dependencies that fail when you just want leads.',
    workingSolution:
      'Zero external API keys required. You answer 3 plain questions once, and Aperture automatically chooses overlooked US directories, discovers real businesses, runs live server-side verification, and lets you export a portable Antigravity SKILL.md.',
  },
  {
    originalAsk: 'Pitch $3,000–$4,000/month retainers as a beginner agency.',
    whyItFailed:
      'Cold prospects rarely pay $4,000/month to an unverified beginner without proof of work or concrete evidence of a problem on their business.',
    workingSolution:
      'Lead with realistic starter offers ($450–$1,200) anchored to an objective, verifiable issue detected on their live website (missing mobile viewport, broken links, or outdated copyright).',
  },
];
