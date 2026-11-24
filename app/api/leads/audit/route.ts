import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';
import * as cheerio from 'cheerio';
import type { AuditIssue, AuditResult, SocialLinks } from '@/lib/types';

const CURRENT_YEAR = new Date().getFullYear();

function isPrivateOrBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (
    !lower ||
    lower === 'localhost' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.localhost')
  ) {
    return true;
  }

  if (net.isIP(lower)) {
    const parts = lower.split('.').map(Number);
    if (parts.length === 4) {
      const [a, b] = parts;
      if (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      ) {
        return true;
      }
    } else if (
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80') ||
      lower === '::1'
    ) {
      return true;
    }
  }

  return false;
}

function classifyMxProvider(exchanges: string[]): string {
  if (exchanges.length === 0) return 'No MX records';
  const joined = exchanges.join(' ').toLowerCase();
  if (joined.includes('google') || joined.includes('aspmx')) return 'Google Workspace';
  if (joined.includes('outlook') || joined.includes('protection.outlook.com')) return 'Microsoft 365';
  if (joined.includes('barracudanetworks')) return 'Barracuda Mail';
  if (joined.includes('serverdata.net')) return 'Exchange / Intermedia';
  if (joined.includes('emailsrvr.com')) return 'Rackspace Email';
  if (joined.includes('zoho')) return 'Zoho Mail';
  if (joined.includes('secureserver.net')) return 'GoDaddy Mail';
  if (joined.includes('pphosted') || joined.includes('proofpoint')) return 'Proofpoint';
  if (joined.includes('mimecast')) return 'Mimecast';
  if (joined.includes('protonmail')) return 'Proton Mail';
  if (joined.includes('messagingengine')) return 'Fastmail';
  if (joined.includes('awsapps') || joined.includes('amazonses')) return 'Amazon WorkMail';
  if (joined.includes('icloud.com')) return 'iCloud Mail';
  if (joined.includes('mxroute') || joined.includes('cloudflare')) return 'Cloudflare / Custom';
  if (joined.includes('yahoodns')) return 'Yahoo / Business Mail';
  const primary = exchanges[0];
  return primary.length > 26 ? `${primary.slice(0, 23)}...` : primary;
}

function isValidEmailCandidate(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (clean.length < 6 || clean.length > 85) return false;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean)) return false;
  const blockedFragments = [
    'example.com',
    'domain.com',
    'email.com',
    'sentry.io',
    'wixpress.com',
    'wordpress.com',
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.webp',
    '.gif',
    'noreply@',
    'no-reply@',
    'donotreply@',
  ];
  return !blockedFragments.some((frag) => clean.includes(frag));
}

function normalizeSocialUrl(href: string): string | null {
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.pathname === '/' || parsed.pathname.length < 2) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractContactsFromHtml(
  html: string,
  emailSet: Set<string>,
  phoneSet: Set<string>,
  extractedSocials: SocialLinks
) {
  const $ = cheerio.load(html);
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href) return;

    if (href.toLowerCase().startsWith('mailto:')) {
      const email = href.slice(7).split('?')[0].trim().toLowerCase();
      if (isValidEmailCandidate(email)) emailSet.add(email);
      return;
    }

    if (href.toLowerCase().startsWith('tel:')) {
      const phone = href.slice(4).trim();
      if (phone.replace(/\D/g, '').length >= 10) phoneSet.add(phone);
      return;
    }

    const lowerHref = href.toLowerCase();
    if (lowerHref.includes('linkedin.com/') && !extractedSocials.linkedin) {
      const norm = normalizeSocialUrl(href);
      if (norm) extractedSocials.linkedin = norm;
    } else if (lowerHref.includes('instagram.com/') && !extractedSocials.instagram) {
      const norm = normalizeSocialUrl(href);
      if (norm) extractedSocials.instagram = norm;
    } else if (lowerHref.includes('facebook.com/') && !extractedSocials.facebook) {
      const norm = normalizeSocialUrl(href);
      if (norm && !norm.includes('sharer.php')) extractedSocials.facebook = norm;
    } else if (
      (lowerHref.includes('x.com/') || lowerHref.includes('twitter.com/')) &&
      !extractedSocials.x
    ) {
      const norm = normalizeSocialUrl(href);
      if (norm && !norm.includes('intent/tweet')) extractedSocials.x = norm;
    }
  });

  const bodyText = $('body').text().replace(/\s+/g, ' ');
  const emailMatches =
    bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  for (const m of emailMatches) {
    if (isValidEmailCandidate(m)) emailSet.add(m.toLowerCase());
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawWebsite = typeof body?.website === 'string' ? body.website.trim() : '';

    if (!rawWebsite) {
      return NextResponse.json({ error: 'Website URL is required.' }, { status: 400 });
    }

    const normalizedInput = /^https?:\/\//i.test(rawWebsite)
      ? rawWebsite
      : `https://${rawWebsite}`;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedInput);
    } catch {
      return NextResponse.json({ error: 'Invalid website URL format.' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only http and https URLs are supported.' }, { status: 400 });
    }

    if (isPrivateOrBlockedHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Private or local hostnames cannot be audited.' },
        { status: 400 }
      );
    }

    const rootDomain = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();

    // 1. Live DNS MX Record Verification (properly rejecting RFC 7505 null MX ".")
    let mxRecords: string[] = [];
    try {
      const records = await dns.resolveMx(rootDomain);
      mxRecords = records
        .sort((a, b) => a.priority - b.priority)
        .map((r) => r.exchange.replace(/\.$/, '').trim())
        .filter(Boolean);
    } catch {
      mxRecords = [];
    }

    const mxVerified = mxRecords.length > 0;
    const mxProvider = classifyMxProvider(mxRecords);

    // 2. Live HTTP Website Fetch + Timing
    const startedAt = Date.now();
    let httpStatus: number | null = null;
    let finalUrl = parsedUrl.toString();
    let html = '';
    let reachable = false;
    let errorNote: string | undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const res = await fetch(parsedUrl.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      httpStatus = res.status;
      finalUrl = res.url || parsedUrl.toString();
      reachable = res.status >= 200 && res.status < 400;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
        const rawHtml = await res.text();
        html = rawHtml.slice(0, 450_000);
      }
      if (!reachable) {
        errorNote = `Website returned HTTP ${res.status}.`;
      }
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Connection failed';
      errorNote =
        msg.includes('abort') || msg.includes('Timeout')
          ? 'Website timed out after 9 seconds.'
          : `Unable to reach site directly (${msg}).`;
    } finally {
      clearTimeout(timeoutId);
    }

    const responseMs = reachable ? Date.now() - startedAt : null;
    const httpsValid = finalUrl.startsWith('https://');

    // 3. HTML & Contact Extraction using Cheerio
    let pageTitle = '';
    let metaDescription = '';
    let hasMobileViewport = false;
    let copyrightYear: number | null = null;
    let hasContactForm = false;
    let hasSchemaMarkup = false;
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();
    const extractedSocials: SocialLinks = {};
    const brokenInternalLinks: string[] = [];

    if (html) {
      const $ = cheerio.load(html);
      pageTitle = $('title').first().text().trim().replace(/\s+/g, ' ');
      metaDescription = (
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        ''
      )
        .trim()
        .replace(/\s+/g, ' ');

      const viewportAttr = $('meta[name="viewport"]').attr('content') || '';
      hasMobileViewport = viewportAttr.toLowerCase().includes('width=device-width');

      hasContactForm = $('form').length > 0;
      hasSchemaMarkup = $('script[type="application/ld+json"]').length > 0;

      extractContactsFromHtml(html, emailSet, phoneSet, extractedSocials);

      // Collect internal links for broken-link sampling and optional /contact subpage email discovery
      const candidateInternalLinks: string[] = [];
      let contactOrAboutUrl: string | null = null;

      $('a[href]').each((_, el) => {
        const href = ($(el).attr('href') || '').trim();
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
          return;
        }
        try {
          const resolved = new URL(href, finalUrl);
          if (resolved.hostname !== new URL(finalUrl).hostname) return;
          if (
            resolved.pathname === '/' ||
            resolved.hash ||
            /\.(pdf|jpg|jpeg|png|svg|zip|css|js)$/i.test(resolved.pathname)
          ) {
            return;
          }
          const lowerPath = resolved.pathname.toLowerCase();
          if (
            !contactOrAboutUrl &&
            (lowerPath.includes('contact') || lowerPath.includes('about') || lowerPath.includes('team'))
          ) {
            contactOrAboutUrl = resolved.toString();
          }
          if (
            candidateInternalLinks.length < 3 &&
            !candidateInternalLinks.includes(resolved.toString())
          ) {
            candidateInternalLinks.push(resolved.toString());
          }
        } catch {
          // ignore malformed relative links
        }
      });

      const bodyText = $('body').text().replace(/\s+/g, ' ');
      const copyrightMatches = bodyText.match(
        /(?:©|copyright|\(c\))\s*(?:20\d{2}\s*[-–]\s*)?(20\d{2})/gi
      );
      if (copyrightMatches && copyrightMatches.length > 0) {
        const years = copyrightMatches
          .map((str) => {
            const nums = str.match(/20\d{2}/g);
            return nums ? Number(nums[nums.length - 1]) : 0;
          })
          .filter((y) => y >= 2005 && y <= CURRENT_YEAR + 1);
        if (years.length > 0) {
          copyrightYear = Math.max(...years);
        }
      }

      // If homepage exposed no email, probe the /contact or /about subpage for real contact info
      const subpageTask =
        emailSet.size === 0 && contactOrAboutUrl
          ? (async () => {
              const subCtrl = new AbortController();
              const subTimeout = setTimeout(() => subCtrl.abort(), 4500);
              try {
                const subRes = await fetch(contactOrAboutUrl as string, {
                  method: 'GET',
                  redirect: 'follow',
                  signal: subCtrl.signal,
                  headers: {
                    'User-Agent':
                      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                  },
                });
                if (subRes.ok) {
                  const subHtml = (await subRes.text()).slice(0, 250_000);
                  extractContactsFromHtml(subHtml, emailSet, phoneSet, extractedSocials);
                  if (!hasContactForm && subHtml.toLowerCase().includes('<form')) {
                    hasContactForm = true;
                  }
                }
              } catch {
                // ignore secondary page fetch errors
              } finally {
                clearTimeout(subTimeout);
              }
            })()
          : Promise.resolve();

      // Sample up to 3 internal links to detect genuine broken pages
      const linkChecks = candidateInternalLinks.map(async (linkUrl) => {
        const linkCtrl = new AbortController();
        const linkTimeout = setTimeout(() => linkCtrl.abort(), 3500);
        try {
          const res = await fetch(linkUrl, {
            method: 'HEAD',
            redirect: 'follow',
            signal: linkCtrl.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApertureAudit/1.0)' },
          });
          if (res.status === 404 || res.status >= 500) {
            brokenInternalLinks.push(`${new URL(linkUrl).pathname} (HTTP ${res.status})`);
          }
        } catch {
          // ignore network hiccups on secondary probes
        } finally {
          clearTimeout(linkTimeout);
        }
      });

      await Promise.all([subpageTask, ...linkChecks]);
    }

    // 4. Compile Objective Audit Issues (Evidence-First)
    const issues: AuditIssue[] = [];

    if (!reachable) {
      if (httpStatus === 403 || httpStatus === 429) {
        issues.push({
          code: 'WAF_BLOCKED',
          severity: 'info',
          title: `Automated scan blocked by host firewall (HTTP ${httpStatus})`,
          evidence: `Server request to ${parsedUrl.hostname} received HTTP ${httpStatus} (likely Cloudflare or WordPress bot protection). DNS MX check still completed.`,
          pitchAngle:
            'Open the site directly in your browser to inspect layout and copy—do not claim the site is down.',
        });
      } else {
        issues.push({
          code: 'SITE_UNREACHABLE',
          severity: 'high',
          title: 'Website failed live load check',
          evidence: errorNote || `Returned HTTP ${httpStatus ?? 'error'} on ${parsedUrl.hostname}.`,
          pitchAngle:
            'Verify in your browser; if the site is genuinely failing to load or timing out, offer a fast reliability and redesign fix.',
        });
      }
    } else {
      if (!httpsValid) {
        issues.push({
          code: 'NO_HTTPS',
          severity: 'high',
          title: 'Missing HTTPS / SSL redirect',
          evidence: `Final URL loaded over insecure HTTP (${finalUrl}).`,
          pitchAngle:
            'Browsers flag HTTP sites as "Not Secure," costing trust with local buyers before they call.',
        });
      }

      if (!hasMobileViewport) {
        issues.push({
          code: 'NO_MOBILE_VIEWPORT',
          severity: 'high',
          title: 'Not configured for mobile screens',
          evidence: 'No <meta name="viewport" content="width=device-width"> tag detected in HTML.',
          pitchAngle:
            'Over 60% of local service searches happen on phones; fixing mobile layout lifts calls immediately.',
        });
      }

      if (responseMs !== null && responseMs > 2500) {
        issues.push({
          code: 'SLOW_RESPONSE',
          severity: 'medium',
          title: 'Slow initial server response',
          evidence: `Measured ${(responseMs / 1000).toFixed(2)}s initial HTML load time.`,
          pitchAngle:
            'A sluggish landing page drops local visitors before they read your services or phone number.',
        });
      }

      if (!metaDescription) {
        issues.push({
          code: 'MISSING_META_DESC',
          severity: 'medium',
          title: 'Missing SEO meta description',
          evidence: 'Homepage has no <meta name="description"> tag for Google search snippets.',
          pitchAngle:
            'Adding clean search titles and descriptions improves click-through from local Google results.',
        });
      }

      if (copyrightYear !== null && copyrightYear <= CURRENT_YEAR - 2) {
        issues.push({
          code: 'OUTDATED_COPYRIGHT',
          severity: 'medium',
          title: `Outdated ${copyrightYear} footer copyright`,
          evidence: `Homepage footer still reads © ${copyrightYear} (current year is ${CURRENT_YEAR}).`,
          pitchAngle:
            'Signals the site has not been refreshed in years—an easy, objective conversation starter for a modern redesign.',
        });
      }

      if (!hasContactForm) {
        issues.push({
          code: 'NO_CONTACT_FORM',
          severity: 'medium',
          title: 'No lead capture form detected',
          evidence: 'Zero <form> elements found on the homepage or contact page.',
          pitchAngle:
            'After-hours visitors who prefer not to call have no quick way to request a quote.',
        });
      }

      if (!hasSchemaMarkup) {
        issues.push({
          code: 'NO_SCHEMA',
          severity: 'info',
          title: 'No LocalBusiness Schema.org markup',
          evidence: 'No application/ld+json structured data block found in page source.',
          pitchAngle:
            'Structured local business schema helps Google connect hours, service area, and reviews.',
        });
      }

      if (brokenInternalLinks.length > 0) {
        issues.push({
          code: 'BROKEN_LINKS',
          severity: 'high',
          title: 'Broken internal page detected',
          evidence: `Live check hit error on: ${brokenInternalLinks.join(', ')}.`,
          pitchAngle:
            'Pointing out a specific broken link proves you genuinely inspected their site and earns immediate replies.',
        });
      }
    }

    if (!mxVerified) {
      issues.push({
        code: 'NO_MX_RECORD',
        severity: 'info',
        title: 'Domain has no DNS MX mail records',
        evidence: `DNS MX lookup for ${rootDomain} returned 0 active mail servers.`,
        pitchAngle:
          'Avoid emailing this domain to protect deliverability—message the decision maker via LinkedIn or Instagram instead.',
      });
    }

    const result: AuditResult = {
      checkedAt: new Date().toISOString(),
      reachable,
      httpStatus,
      finalUrl,
      responseMs,
      httpsValid,
      hasMobileViewport,
      pageTitle,
      metaDescription,
      hasMetaDescription: Boolean(metaDescription),
      copyrightYear,
      hasContactForm,
      hasSchemaMarkup,
      brokenInternalLinks,
      extractedEmails: Array.from(emailSet).slice(0, 6),
      extractedPhones: Array.from(phoneSet).slice(0, 4),
      extractedSocials,
      mxVerified,
      mxProvider,
      mxRecords: mxRecords.slice(0, 4),
      issues,
      errorNote,
    };

    return NextResponse.json({ audit: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error while auditing website.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
