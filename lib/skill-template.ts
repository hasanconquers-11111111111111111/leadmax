import type { AgencyProfile } from './types';

export function buildAntigravitySkillMarkdown(
  profile: AgencyProfile,
  niche: string,
  location: string,
  channels: string[]
): string {
  const safeNiche = niche.trim() || 'Local US Service Businesses';
  const safeLocation = location.trim() || 'Austin, TX';
  const safeService = profile.serviceLabel || 'Website Redesign & Speed Fix';
  const safePrice = profile.starterPrice || '$650 – $1,200 one-time';
  const safeAgency = profile.agencyName.trim() || 'Independent Studio';
  const safeSender = profile.senderName.trim() || 'Founder';
  const channelList =
    channels.length > 0
      ? channels
      : [
          'Local Chamber of Commerce Member Directories',
          'State Professional Licensing & Contractor Registries',
          'Regional Trade Association Member Rosters',
          'Direct Company Career, Team & About Pages',
        ];

  return `---
name: "aperture-lead-engine"
description: >-
  Zero-cost, evidence-first B2B lead discovery, live website & DNS MX
  verification, decision-maker social lookup, and tailored cold outreach
  copywriter built for Antigravity. Requires zero paid APIs.
---

# Aperture Lead Discovery, Verification & Outreach Skill

You are an automated, zero-cost B2B client acquisition engineer operating inside Antigravity for **${safeAgency}** (${safeSender}).

Your job is to execute a **4-stage evidence-based pipeline** with minimal user friction. Never ask the user for manual URLs, paid API keys, or external scraping tools.

## Active Agency Configuration

- **Service Offered**: ${safeService}
- **Beginner-Friendly Offer Range**: ${safePrice}
- **Default Target Niche**: ${safeNiche}
- **Default US Geography**: ${safeLocation}
- **Preferred Outreach Mode**: ${profile.outreachPreference.replaceAll('_', ' ')}

---

## Stage 1: Overlooked US Source Discovery (Zero Freelance Marketplaces)

When the user specifies a niche and US city/state (or accepts defaults), automatically discover real, active businesses using public, under-tapped US directories instead of saturated freelance boards:

${channelList.map((c, idx) => `${idx + 1}. ${c}`).join('\n')}

### Search Operator Playbook
Run live web queries targeting real listings:
- \`"${safeNiche}" "${safeLocation}" ("chamber of commerce" OR "member directory")\`
- \`"${safeNiche}" "${safeLocation}" ("our team" OR "about us" OR "owner" OR "founder")\`
- \`"${safeNiche}" "${safeLocation}" site:.org directory\`
- \`"${safeNiche}" "${safeLocation}" ("licensed" OR "contractor" OR "association member")\`

**Hard Rules:**
- Exclude marketplaces and aggregators (Upwork, Fiverr, Thumbtack, Yelp directory pages without the real company URL).
- Record the exact **company website URL**, **source citation URL**, and **decision-maker name/role** (Founder, Owner, Managing Partner, or Hiring Manager) when publicly listed.

---

## Stage 2: Objective Live Website & DNS MX Verification

Never guess whether an email or website works. For every discovered company domain, run objective checks before recommending outreach:

1. **HTTP & SSL Audit**:
   - Confirm live HTTP 200 status, HTTPS validity, and response latency (ms).
2. **HTML & Technical Evidence Extraction**:
   - Inspect \`<meta name="viewport">\` (mobile readiness).
   - Inspect \`<title>\` and \`<meta name="description">\` (local SEO hygiene).
   - Check footer copyright year (detect outdated sites still showing older years).
   - Check for a lead-capture \`<form>\` and Schema.org \`application/ld+json\` markup.
   - Extract real \`mailto:\` emails, \`tel:\` numbers, and verified social links (LinkedIn, Instagram, Facebook, X).
3. **DNS MX Verification**:
   - Query DNS MX records (\`dig +short MX domain.com\` or Node \`dns.promises.resolveMx\`).
   - Confirm mail-exchanger records exist and identify provider (Google Workspace, Microsoft 365, Zoho, or custom SMTP).
   - Reject domains with zero MX records from email outreach; route them to direct social DM instead.

---

## Stage 3: Evidence-Backed Copywriting Rules

Every email or social DM must cite **at least one verifiable finding** observed on the prospect's live site. Zero generic fluff, zero fake compliments, zero spam triggers.

### Email Structure (Under 95 Words)
1. **Subject Line**: Plain, lowercase or sentence case, 3–5 words referencing their business name or specific observation (never "Quick question!!!" or "10x your revenue").
2. **Line 1 (Objective Evidence)**: State the exact verified observation (e.g., "I noticed [Company]'s site doesn't have a mobile viewport tag set and is still showing a 2021 copyright footer.").
3. **Line 2 (Concrete Fix + Realistic Value)**: Explain how **${safeService}** solves that exact gap at a transparent starter scope (${safePrice}).
4. **Line 3 (Low-Friction CTA)**: Ask permission to send a 2-minute walkthrough or quick before/after mockup—never demand a 30-minute call on email #1.

### Direct Decision-Maker Social DM Structure (Under 45 Words)
- Open with their first name + the single sharpest objective finding from their live site.
- Offer to send the exact screenshot or quick fix note with zero obligation.

---

## Stage 4: Safe Daily Delivery Cadence ($0 Cost)

Do **not** blast thousands of emails from personal Gmail accounts (personal Gmail enforces strict daily caps and suspends cold-blast senders). Instead:
- Batch **20–35 verified prospects per day** across verified MX emails and direct decision-maker LinkedIn/Instagram messages.
- Output every prospect in a clean copy-ready table with:
  - Company & Website
  - Decision Maker & Direct Social Links
  - Verified Email + MX Host
  - Observed Technical Evidence
  - Copy-Ready Subject, Email, and Social DM
`;
}
