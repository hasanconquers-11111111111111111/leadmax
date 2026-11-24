import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { Type } from '@google/genai';
import {
  generateContentWithRetry,
  extractJsonFromText,
  formatGeminiError,
} from '@/lib/gemini';
import type { GroundingCitation, Prospect } from '@/lib/types';

interface ScrapedCandidate {
  title: string;
  url: string;
  snippet: string;
  sourceChannel: string;
  sourceUrl: string;
  locationHint?: string;
  phoneHint?: string;
  emailHint?: string;
  facebookHint?: string;
  instagramHint?: string;
  linkedinHint?: string;
}

interface StructuredLeadPayload {
  leads: {
    companyName: string;
    website: string;
    location: string;
    industry: string;
    decisionMakerName: string;
    decisionMakerRole: string;
    whyGoodFit: string;
  }[];
}

interface OsmNominatimResult {
  osm_type?: string;
  osm_id?: number;
  name?: string;
  display_name?: string;
  type?: string;
  extratags?: Record<string, string>;
}

const BLOCKED_DOMAINS = [
  'upwork.com',
  'fiverr.com',
  'freelancer.com',
  'thumbtack.com',
  'yelp.com',
  'yellowpages.com',
  'angi.com',
  'homeadvisor.com',
  'clutch.co',
  'bark.com',
  'bbb.org',
  'mapquest.com',
  'nextdoor.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'tiktok.com',
  'reddit.com',
  'wikipedia.org',
  'indeed.com',
  'glassdoor.com',
  'ziprecruiter.com',
  'expertise.com',
  'threebestrated.com',
  'porch.com',
  'houzz.com',
  'zillow.com',
  'healthgrades.com',
  'zocdoc.com',
  'webmd.com',
  'tripadvisor.com',
  'groupon.com',
  'amazon.com',
  'apple.com',
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',
  'chamberofcommerce.com',
  'manta.com',
  'dnb.com',
  'zoominfo.com',
  'opencorporates.com',
  'alignable.com',
];

const STOP_WORDS = new Set([
  'independent',
  'boutique',
  'family',
  'commercial',
  'residential',
  'local',
  'small',
  'best',
  'top',
  'contractors',
  'contractor',
  'clinics',
  'clinic',
  'studios',
  'studio',
  'installers',
  'installer',
  'companies',
  'company',
  'agencies',
  'agency',
  'businesses',
  'business',
  'services',
  'service',
  'shops',
  'shop',
  'firms',
  'firm',
  'and',
  'for',
  'the',
  'with',
  'near',
  'in',
]);

const SYNONYM_MAP: Record<string, string[]> = {
  hvac: ['HVAC', 'air conditioning', 'heating'],
  plumbing: ['plumbing', 'plumber'],
  dental: ['dental', 'dentist'],
  orthodontic: ['orthodontics', 'orthodontist'],
  architecture: ['architect', 'architecture'],
  interior: ['interior design'],
  roofing: ['roofing', 'roofer'],
  solar: ['solar'],
  legal: ['law firm', 'attorney'],
  law: ['law office', 'attorney'],
  chiropractic: ['chiropractor'],
  medspa: ['med spa', 'aesthetics'],
  landscaping: ['landscaping', 'lawn care'],
  electrical: ['electrician', 'electrical'],
  auto: ['auto repair', 'mechanic'],
  fitness: ['gym', 'pilates'],
  accounting: ['CPA', 'accounting'],
  real: ['real estate'],
};

function buildCleanSearchKeywords(niche: string): string[] {
  const tokens = niche
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const expanded: string[] = [];
  const seen = new Set<string>();

  const pushTerm = (term: string) => {
    const norm = term.trim().toLowerCase();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      expanded.push(term.trim());
    }
  };

  for (const token of tokens) {
    const synonyms = SYNONYM_MAP[token];
    if (synonyms) {
      synonyms.forEach(pushTerm);
    } else {
      pushTerm(token);
    }
  }

  if (expanded.length === 0 && niche.trim()) {
    pushTerm(niche.trim());
  }

  return expanded.slice(0, 4);
}

function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    return BLOCKED_DOMAINS.some(
      (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`)
    );
  } catch {
    return true;
  }
}

function normalizeUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function getRootOrigin(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return url;
  }
}

function decodeDdgUrl(rawHref: string): string | null {
  try {
    const normalized = rawHref.startsWith('//') ? `https:${rawHref}` : rawHref;
    const parsed = new URL(normalized);
    const uddg = parsed.searchParams.get('uddg');
    const target = uddg ? decodeURIComponent(uddg) : normalized;
    const targetUrl = new URL(target);
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') return null;
    return `${targetUrl.protocol}//${targetUrl.hostname}${
      targetUrl.pathname === '/' ? '' : targetUrl.pathname
    }`;
  } catch {
    return null;
  }
}

async function queryOpenStreetMap(
  keyword: string,
  location: string
): Promise<{ candidates: ScrapedCandidate[]; citations: GroundingCitation[] }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7500);
  const candidates: ScrapedCandidate[] = [];
  const citations: GroundingCitation[] = [];

  try {
    const query = `${keyword} ${location}`;
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&extratags=1&limit=20`;

    const res = await fetch(osmUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ApertureLeadEngine/1.0 (Open-Source US Directory Audit)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return { candidates, citations };

    const items = (await res.json()) as OsmNominatimResult[];
    for (const item of items) {
      const rawSite =
        item.extratags?.website ||
        item.extratags?.['contact:website'] ||
        item.extratags?.url ||
        '';
      const website = normalizeUrl(rawSite);
      if (!website || isBlockedDomain(website)) continue;

      const name = (item.name || '').trim();
      if (!name) continue;

      const osmRecordUrl =
        item.osm_type && item.osm_id
          ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`
          : website;

      candidates.push({
        title: name,
        url: getRootOrigin(website),
        snippet: item.display_name || `${name} in ${location}`,
        sourceChannel: 'OpenStreetMap US Public Directory',
        sourceUrl: osmRecordUrl,
        locationHint: location,
        phoneHint: item.extratags?.phone || item.extratags?.['contact:phone'],
        emailHint: item.extratags?.email || item.extratags?.['contact:email'],
        facebookHint:
          normalizeUrl(
            item.extratags?.['contact:facebook'] || item.extratags?.facebook
          ) || undefined,
        instagramHint:
          normalizeUrl(
            item.extratags?.['contact:instagram'] || item.extratags?.instagram
          ) || undefined,
        linkedinHint:
          normalizeUrl(item.extratags?.['contact:linkedin']) || undefined,
      });

      citations.push({
        title: `${name} · OpenStreetMap`,
        uri: osmRecordUrl,
      });
    }
  } catch {
    // non-fatal
  } finally {
    clearTimeout(timeout);
  }

  return { candidates, citations };
}

async function queryDuckDuckGoSingle(
  query: string
): Promise<{ candidates: ScrapedCandidate[]; citations: GroundingCitation[] }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  const candidates: ScrapedCandidate[] = [];
  const citations: GroundingCitation[] = [];

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return { candidates, citations };

    const html = await res.text();
    const $ = cheerio.load(html);

    $('.result').each((_, el) => {
      const linkEl = $(el).find('a.result__a').first();
      const rawHref = linkEl.attr('href') || '';
      const title = linkEl.text().trim().replace(/\s+/g, ' ');
      const snippet = $(el).find('.result__snippet').text().trim().replace(/\s+/g, ' ');

      const decoded = decodeDdgUrl(rawHref);
      if (!decoded || !title || isBlockedDomain(decoded)) return;

      candidates.push({
        title,
        url: getRootOrigin(decoded),
        snippet,
        sourceChannel: 'Live Web Direct Business Search',
        sourceUrl: decoded,
      });
      citations.push({ title, uri: decoded });
    });
  } catch {
    // non-fatal
  } finally {
    clearTimeout(timeout);
  }

  return { candidates, citations };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const niche = typeof body?.niche === 'string' ? body.niche.trim() : '';
    const location = typeof body?.location === 'string' ? body.location.trim() : '';
    const serviceLabel =
      typeof body?.serviceLabel === 'string' && body.serviceLabel.trim()
        ? body.serviceLabel.trim()
        : 'Website Redesign & Speed Fix';
    const starterPrice =
      typeof body?.starterPrice === 'string' && body.starterPrice.trim()
        ? body.starterPrice.trim()
        : '$650 – $1,200';
    const count = Math.min(Math.max(Number(body?.count) || 8, 4), 12);

    if (!niche || !location) {
      return NextResponse.json(
        { error: 'Please provide both a target niche and a US city or state.' },
        { status: 400 }
      );
    }

    const keywords = buildCleanSearchKeywords(niche);

    // 1. Live $0 OpenStreetMap Public Directory + polite DuckDuckGo web search
    const osmTasks = keywords.map((kw) => queryOpenStreetMap(kw, location));
    const ddgTask = queryDuckDuckGoSingle(`${keywords[0] || niche} ${location} website`);

    const results = await Promise.all([...osmTasks, ddgTask]);

    const allCandidates: ScrapedCandidate[] = [];
    const seenDomains = new Set<string>();
    const citations: GroundingCitation[] = [];
    const seenCitationUris = new Set<string>();

    for (const source of results) {
      for (const c of source.citations) {
        if (!seenCitationUris.has(c.uri)) {
          seenCitationUris.add(c.uri);
          citations.push(c);
        }
      }
      for (const cand of source.candidates) {
        try {
          const domain = new URL(cand.url).hostname
            .replace(/^www\./i, '')
            .toLowerCase();
          if (!domain || seenDomains.has(domain)) continue;
          seenDomains.add(domain);
          allCandidates.push(cand);
        } catch {
          continue;
        }
      }
    }

    if (allCandidates.length === 0) {
      return NextResponse.json(
        {
          error:
            'No direct business websites were found in public US directories for that query. Try a broader trade term (like "HVAC", "Dental", "Roofing", or "Plumbing") or a larger nearby city.',
        },
        { status: 404 }
      );
    }

    const topCandidates = allCandidates.slice(0, 16);

    // 2. Qualify and structure the real scraped leads with Gemini 4 Hydrogen (with transient retry)
    const prompt = `You are a B2B lead qualification analyst for a beginner agency offering "${serviceLabel}" (${starterPrice}).
Below are REAL US businesses scraped live from OpenStreetMap public business directories and direct web listings for "${niche}" in "${location}".

REAL SCRAPED CANDIDATES:
${JSON.stringify(
  topCandidates.map((c) => ({
    title: c.title,
    website: c.url,
    snippet: c.snippet,
    sourceChannel: c.sourceChannel,
  })),
  null,
  2
)}

TASK:
Select up to ${count} genuine operating local businesses (prefer independent/local businesses over big national retail chains when possible) from the scraped candidates above.
For each selected business:
- Clean the companyName (remove redundant city or SEO suffixes).
- Keep the EXACT website URL from the candidate—NEVER modify or invent domains.
- If a specific owner/founder name appears in the snippet, put it in decisionMakerName; otherwise use "Owner / Operations Lead".
- Write a crisp 1-sentence whyGoodFit tailored to "${serviceLabel}".`;

    const response = await generateContentWithRetry({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leads: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  companyName: { type: Type.STRING },
                  website: { type: Type.STRING },
                  location: { type: Type.STRING },
                  industry: { type: Type.STRING },
                  decisionMakerName: { type: Type.STRING },
                  decisionMakerRole: { type: Type.STRING },
                  whyGoodFit: { type: Type.STRING },
                },
                required: [
                  'companyName',
                  'website',
                  'location',
                  'industry',
                  'decisionMakerName',
                  'decisionMakerRole',
                  'whyGoodFit',
                ],
              },
            },
          },
          required: ['leads'],
        },
      },
    });

    const parsed = extractJsonFromText<StructuredLeadPayload>(
      response.text ?? '{"leads":[]}'
    );

    const candidateByDomain = new Map<string, ScrapedCandidate>();
    for (const c of topCandidates) {
      try {
        const d = new URL(c.url).hostname.replace(/^www\./i, '').toLowerCase();
        candidateByDomain.set(d, c);
      } catch {
        // ignore
      }
    }

    const prospects: Prospect[] = [];
    const emittedDomains = new Set<string>();

    for (const item of parsed.leads ?? []) {
      let domain = '';
      try {
        domain = new URL(item.website).hostname.replace(/^www\./i, '').toLowerCase();
      } catch {
        continue;
      }
      const matched = candidateByDomain.get(domain);
      if (!matched || emittedDomains.has(domain)) continue;
      emittedDomains.add(domain);

      prospects.push({
        id: `lead_${Date.now()}_${prospects.length}_${Math.random().toString(36).slice(2, 7)}`,
        companyName: item.companyName.trim(),
        website: matched.url,
        location: (item.location || location).trim(),
        industry: (item.industry || niche).trim(),
        sourceChannel: matched.sourceChannel,
        sourceUrl: matched.sourceUrl,
        decisionMakerName: item.decisionMakerName.trim() || 'Owner / Operations Lead',
        decisionMakerRole: item.decisionMakerRole.trim() || 'Owner / Founder',
        decisionMakerEmail: matched.emailHint || '',
        socialLinks: {
          linkedin: matched.linkedinHint,
          instagram: matched.instagramHint,
          facebook: matched.facebookHint,
        },
        whyGoodFit: item.whyGoodFit.trim(),
        auditStatus: 'idle',
        outreachStatus: 'new',
      });
    }

    if (prospects.length === 0) {
      return NextResponse.json(
        {
          error:
            'Scraped results did not match direct operating businesses for that query. Try a broader niche keyword or nearby metro area.',
        },
        { status: 404 }
      );
    }

    const sourceStrategy = Array.from(
      new Set([
        ...prospects.map((p) => p.sourceChannel),
        `Keywords queried: ${keywords.join(', ')}`,
      ])
    );

    return NextResponse.json({
      sourceStrategy,
      citations: citations.slice(0, 12),
      prospects,
    });
  } catch (err) {
    return NextResponse.json(
      { error: formatGeminiError(err, 'Failed to run live lead discovery.') },
      { status: 500 }
    );
  }
}
