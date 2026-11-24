import type { Prospect } from './types';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

export function parseCsvToProspects(csvText: string, defaultIndustry = 'Imported Lead'): Prospect[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstRow = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = firstRow.some((cell) =>
    ['company', 'business', 'name', 'website', 'url', 'domain', 'email'].some((k) =>
      cell.includes(k)
    )
  );

  const headers = hasHeader ? firstRow : ['company', 'website', 'email', 'location', 'decision_maker'];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const findIndex = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const companyIdx = findIndex(['company', 'business', 'organization', 'name']);
  const websiteIdx = findIndex(['website', 'url', 'domain', 'site']);
  const emailIdx = findIndex(['email', 'mail']);
  const locationIdx = findIndex(['location', 'city', 'state', 'address']);
  const dmIdx = findIndex(['contact', 'founder', 'owner', 'decision', 'person']);
  const roleIdx = findIndex(['role', 'title', 'position']);
  const linkedinIdx = findIndex(['linkedin']);

  const prospects: Prospect[] = [];

  dataLines.forEach((line, idx) => {
    const cols = parseCsvLine(line);
    const rawSite = websiteIdx >= 0 ? cols[websiteIdx] || '' : cols[1] || cols[0] || '';
    const website = normalizeWebsite(rawSite);
    const companyName =
      (companyIdx >= 0 ? cols[companyIdx] : cols[0])?.trim() ||
      (website ? new URL(website).hostname.replace(/^www\./, '') : '');

    if (!website || !companyName) return;

    prospects.push({
      id: `csv_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      companyName,
      website,
      location: (locationIdx >= 0 ? cols[locationIdx] : '')?.trim() || 'United States',
      industry: defaultIndustry,
      sourceChannel: 'CSV Import',
      sourceUrl: website,
      decisionMakerName:
        (dmIdx >= 0 ? cols[dmIdx] : '')?.trim() || 'Owner / Operations Lead',
      decisionMakerRole:
        (roleIdx >= 0 ? cols[roleIdx] : '')?.trim() || 'Decision Maker',
      decisionMakerEmail: (emailIdx >= 0 ? cols[emailIdx] : '')?.trim() || '',
      socialLinks: {
        linkedin:
          linkedinIdx >= 0 && cols[linkedinIdx]
            ? normalizeWebsite(cols[linkedinIdx]) || undefined
            : undefined,
      },
      whyGoodFit: 'Imported via CSV for live website verification and outreach drafting.',
      auditStatus: 'idle',
      outreachStatus: 'new',
      importedFromCsv: true,
    });
  });

  return prospects;
}

function csvEscape(value: string): string {
  const safe = (value ?? '').replace(/\r?\n/g, ' ');
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportProspectsToCsv(prospects: Prospect[]): string {
  const headers = [
    'Company',
    'Website',
    'Location',
    'Industry',
    'Source Channel',
    'Decision Maker',
    'Role',
    'Verified Email',
    'MX Verified',
    'MX Provider',
    'LinkedIn',
    'Instagram',
    'Facebook',
    'Detected Issues',
    'Outreach Subject',
    'Outreach Email',
    'Social DM',
    'Status',
  ];

  const rows = prospects.map((p) => {
    const bestEmail = p.decisionMakerEmail || p.audit?.extractedEmails[0] || '';
    const linkedin = p.socialLinks.linkedin || p.audit?.extractedSocials.linkedin || '';
    const instagram = p.socialLinks.instagram || p.audit?.extractedSocials.instagram || '';
    const facebook = p.socialLinks.facebook || p.audit?.extractedSocials.facebook || '';
    const issuesText = p.audit
      ? p.audit.issues.map((i) => `${i.title}: ${i.evidence}`).join(' | ')
      : 'Not audited';

    return [
      p.companyName,
      p.website,
      p.location,
      p.industry,
      p.sourceChannel,
      p.decisionMakerName,
      p.decisionMakerRole,
      bestEmail,
      p.audit ? (p.audit.mxVerified ? 'Yes' : 'No') : 'Pending',
      p.audit?.mxProvider || '',
      linkedin,
      instagram,
      facebook,
      issuesText,
      p.draft?.subject || '',
      p.draft?.emailBody || '',
      p.draft?.socialDm || '',
      p.outreachStatus,
    ]
      .map(csvEscape)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
