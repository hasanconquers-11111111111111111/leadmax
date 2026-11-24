'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import type {
  AgencyProfile,
  OutreachDraft,
  OutreachTone,
  Prospect,
} from '@/lib/types';

interface ProspectInspectorProps {
  prospect: Prospect | null;
  profile: AgencyProfile;
  onRunAudit: (prospectId: string) => Promise<void>;
  onUpdateDraft: (prospectId: string, draft: OutreachDraft) => void;
  onUpdateEmail: (prospectId: string, email: string) => void;
  onUpdateOutreachStatus: (
    prospectId: string,
    status: 'new' | 'copied' | 'sent'
  ) => void;
}

const TONE_OPTIONS: { id: OutreachTone; label: string }[] = [
  { id: 'audit_first', label: 'Audit-First' },
  { id: 'direct_helpful', label: 'Direct & Helpful' },
  { id: 'short_dm', label: 'Short DM' },
];

export default function ProspectInspector({
  prospect,
  profile,
  onRunAudit,
  onUpdateDraft,
  onUpdateEmail,
  onUpdateOutreachStatus,
}: ProspectInspectorProps) {
  const [selectedTone, setSelectedTone] = useState<OutreachTone>(
    prospect?.draft?.tone ?? 'audit_first'
  );
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'dm' | 'address' | null>(null);

  if (!prospect) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-8 text-center">
        <p className="font-display text-base font-semibold text-[#1D1D1F]">
          Select a prospect to inspect evidence
        </p>
        <p className="mt-2 max-w-sm text-sm text-[#6E6E73]">
          Click any business on the left to review its live DNS MX record, website technical issues, decision-maker social profiles, and personalized outreach copy.
        </p>
      </div>
    );
  }

  const audit = prospect.audit;
  const htmlInspected = Boolean(audit?.reachable);
  const bestEmail =
    prospect.decisionMakerEmail || audit?.extractedEmails[0] || '';
  const allEmails = Array.from(
    new Set(
      [prospect.decisionMakerEmail, ...(audit?.extractedEmails ?? [])].filter(
        Boolean
      )
    )
  );

  const socials = {
    linkedin: prospect.socialLinks.linkedin || audit?.extractedSocials.linkedin,
    instagram:
      prospect.socialLinks.instagram || audit?.extractedSocials.instagram,
    facebook: prospect.socialLinks.facebook || audit?.extractedSocials.facebook,
    x: prospect.socialLinks.x || audit?.extractedSocials.x,
  };

  const linkedinPeopleSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    `${prospect.companyName} ${
      prospect.decisionMakerRole !== 'Decision Maker'
        ? prospect.decisionMakerRole
        : 'Owner OR Founder'
    }`
  )}`;

  const handleGenerateCopy = async () => {
    setIsDrafting(true);
    setDraftError(null);
    try {
      const res = await fetch('/api/outreach/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect,
          profile,
          tone: selectedTone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not draft outreach copy.');
      }
      onUpdateDraft(prospect.id, data.draft);
    } catch (err) {
      setDraftError(
        err instanceof Error ? err.message : 'Failed to generate copy.'
      );
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopy = async (text: string, field: 'email' | 'dm' | 'address') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      if (field === 'email' || field === 'dm') {
        onUpdateOutreachStatus(prospect.id, 'copied');
      }
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // ignore clipboard denial
    }
  };

  const gmailComposeUrl =
    prospect.draft && bestEmail
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
          bestEmail
        )}&su=${encodeURIComponent(prospect.draft.subject)}&body=${encodeURIComponent(
          prospect.draft.emailBody
        )}`
      : null;

  const mailtoUrl =
    prospect.draft && bestEmail
      ? `mailto:${encodeURIComponent(bestEmail)}?subject=${encodeURIComponent(
          prospect.draft.subject
        )}&body=${encodeURIComponent(prospect.draft.emailBody)}`
      : null;

  return (
    <div className="rounded-xl border border-[#E5E5EA] bg-white">
      {/* Header */}
      <div className="border-b border-[#E5E5EA] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-tight text-[#1D1D1F] truncate">
              {prospect.companyName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E6E73]">
              <span>{prospect.industry}</span>
              <span aria-hidden="true">·</span>
              <span>{prospect.location}</span>
              <span aria-hidden="true">·</span>
              <span>{prospect.sourceChannel}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={prospect.auditStatus === 'auditing'}
            onClick={() => onRunAudit(prospect.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {prospect.auditStatus === 'auditing' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {audit ? 'Re-run Audit' : 'Run Live Audit'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <a
            href={prospect.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[#0071E3] hover:underline"
          >
            {prospect.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            <ExternalLink className="h-3 w-3" />
          </a>
          {prospect.sourceUrl && prospect.sourceUrl !== prospect.website && (
            <a
              href={prospect.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#6E6E73] hover:text-[#1D1D1F] hover:underline"
            >
              Source citation
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Decision Maker & Direct Channels */}
      <div className="border-b border-[#E5E5EA] p-6">
        <div className="text-xs font-medium text-[#6E6E73]">
          Decision Maker &amp; Verified Channels
        </div>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-[#1D1D1F]">
              {prospect.decisionMakerName}
            </div>
            <div className="text-xs text-[#6E6E73]">
              {prospect.decisionMakerRole}
            </div>
          </div>
          {audit && (
            <div
              className={`text-xs font-medium ${
                audit.mxVerified ? 'text-[#16A34A]' : 'text-[#D97706]'
              }`}
            >
              {audit.mxVerified
                ? `MX Verified · ${audit.mxProvider}`
                : 'No MX Records · Use Social DM'}
            </div>
          )}
        </div>

        {/* Verified or Manually Entered Email Address */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="email"
              aria-label="Recipient email address"
              value={bestEmail}
              onChange={(e) => onUpdateEmail(prospect.id, e.target.value)}
              placeholder={
                audit
                  ? 'No public email scraped — paste owner email to enable Gmail compose'
                  : 'Run audit or paste contact email'
              }
              className="w-full rounded-lg border border-[#E5E5EA] bg-[#FAFAFC] px-3 py-2 font-mono text-xs text-[#1D1D1F] placeholder:font-sans placeholder:text-[#86868B] focus:border-[#0071E3] focus:bg-white focus:outline-none"
            />
            {bestEmail && (
              <button
                type="button"
                onClick={() => handleCopy(bestEmail, 'address')}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-xs font-medium text-[#0071E3] hover:bg-[#F5F5F7] whitespace-nowrap shrink-0"
              >
                {copiedField === 'address' ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          {allEmails.length > 1 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6E6E73]">
              <span>Also found on site:</span>
              {allEmails.slice(1).map((altEmail) => (
                <button
                  key={altEmail}
                  type="button"
                  onClick={() => onUpdateEmail(prospect.id, altEmail)}
                  className="font-mono text-[#0071E3] hover:underline"
                >
                  {altEmail}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direct Social Links */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {socials.linkedin ? (
            <a
              href={socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#0071E3] hover:underline"
            >
              LinkedIn Profile
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <a
              href={linkedinPeopleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#0071E3] hover:underline"
            >
              Find Decision Maker on LinkedIn
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {socials.instagram && (
            <a
              href={socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#0071E3] hover:underline"
            >
              Instagram
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {socials.facebook && (
            <a
              href={socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#0071E3] hover:underline"
            >
              Facebook
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {socials.x && (
            <a
              href={socials.x}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#0071E3] hover:underline"
            >
              X / Twitter
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Live Website & DNS Evidence */}
      <div className="border-b border-[#E5E5EA] p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#6E6E73]">
            Live Objective Evidence
          </span>
          {audit && (
            <span className="font-mono text-xs text-[#6E6E73] tabular-nums">
              {audit.httpStatus ? `HTTP ${audit.httpStatus}` : 'Unreachable'}
              {audit.responseMs !== null ? ` · ${audit.responseMs} ms` : ''}
            </span>
          )}
        </div>

        {prospect.auditStatus === 'auditing' ? (
          <div className="mt-4 space-y-2.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#F5F5F7]" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[#F5F5F7]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#F5F5F7]" />
          </div>
        ) : audit ? (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-[#6E6E73]">HTTPS / SSL</dt>
                <dd
                  className={`mt-0.5 font-medium ${
                    !htmlInspected
                      ? 'text-[#6E6E73]'
                      : audit.httpsValid
                        ? 'text-[#16A34A]'
                        : 'text-[#DC2626]'
                  }`}
                >
                  {!htmlInspected
                    ? audit.httpsValid
                      ? 'HTTPS Host'
                      : 'Unverified'
                    : audit.httpsValid
                      ? 'Valid HTTPS'
                      : 'Insecure HTTP'}
                </dd>
              </div>
              <div>
                <dt className="text-[#6E6E73]">Mobile Layout</dt>
                <dd
                  className={`mt-0.5 font-medium ${
                    !htmlInspected
                      ? 'text-[#6E6E73]'
                      : audit.hasMobileViewport
                        ? 'text-[#16A34A]'
                        : 'text-[#DC2626]'
                  }`}
                >
                  {!htmlInspected
                    ? 'Blocked / N/A'
                    : audit.hasMobileViewport
                      ? 'Responsive Tag'
                      : 'Missing Viewport'}
                </dd>
              </div>
              <div>
                <dt className="text-[#6E6E73]">SEO Meta</dt>
                <dd
                  className={`mt-0.5 font-medium ${
                    !htmlInspected
                      ? 'text-[#6E6E73]'
                      : audit.hasMetaDescription
                        ? 'text-[#16A34A]'
                        : 'text-[#D97706]'
                  }`}
                >
                  {!htmlInspected
                    ? 'Blocked / N/A'
                    : audit.hasMetaDescription
                      ? 'Present'
                      : 'Missing'}
                </dd>
              </div>
              <div>
                <dt className="text-[#6E6E73]">Footer Year</dt>
                <dd className="mt-0.5 font-mono font-medium text-[#1D1D1F] tabular-nums">
                  {!htmlInspected
                    ? 'N/A'
                    : (audit.copyrightYear ?? 'Not listed')}
                </dd>
              </div>
            </dl>

            {audit.issues.length > 0 ? (
              <div className="mt-5 space-y-2.5 border-t border-[#E5E5EA] pt-4">
                {audit.issues.map((issue) => (
                  <div key={issue.code} className="text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-[#1D1D1F]">
                        {issue.title}
                      </span>
                      <span
                        className={`font-medium shrink-0 ${
                          issue.severity === 'high'
                            ? 'text-[#DC2626]'
                            : issue.severity === 'medium'
                              ? 'text-[#D97706]'
                              : 'text-[#6E6E73]'
                        }`}
                      >
                        {issue.severity === 'high'
                          ? 'High impact'
                          : issue.severity === 'medium'
                            ? 'Improvement'
                            : 'Note'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[#6E6E73]">{issue.evidence}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-[#16A34A]">
                Site passed baseline HTTPS, mobile viewport, SEO meta, and internal link checks.
              </p>
            )}
          </>
        ) : prospect.auditStatus === 'error' ? (
          <p className="mt-3 text-xs text-[#DC2626]">
            Live website check encountered a network error or was blocked by the host firewall. Click &ldquo;Run Live Audit&rdquo; above to retry, or inspect the site directly.
          </p>
        ) : (
          <p className="mt-3 text-xs text-[#6E6E73]">
            Click &ldquo;Run Live Audit&rdquo; above to fetch this website directly from the server, verify DNS MX records, extract contact emails, and detect real technical issues.
          </p>
        )}
      </div>

      {/* Evidence-Backed Copywriter */}
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#6E6E73]">
            Evidence-Backed Copywriter
          </span>

          <div className="flex items-center gap-1 rounded-lg bg-[#F5F5F7] p-1">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTone(t.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedTone === t.id
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={isDrafting}
            onClick={handleGenerateCopy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0071E3] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ED] disabled:opacity-60"
          >
            {isDrafting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Writing Evidence-Based Pitch...
              </>
            ) : prospect.draft ? (
              'Regenerate Tailored Copy'
            ) : (
              'Generate Tailored Email & Social DM'
            )}
          </button>
        </div>

        {draftError && (
          <p className="mt-3 text-xs text-[#DC2626]">{draftError}</p>
        )}

        {prospect.draft && (
          <div className="mt-5 space-y-5">
            {/* Editable Email Draft */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1D1D1F]">
                  Email Draft
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `Subject: ${prospect.draft!.subject}\n\n${prospect.draft!.emailBody}`,
                        'email'
                      )
                    }
                    className="inline-flex items-center gap-1 font-medium text-[#0071E3] hover:underline whitespace-nowrap shrink-0"
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Email
                      </>
                    )}
                  </button>

                  {gmailComposeUrl && (
                    <a
                      href={gmailComposeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onUpdateOutreachStatus(prospect.id, 'sent')}
                      className="inline-flex items-center gap-1 font-medium text-[#1D1D1F] hover:text-[#0071E3] whitespace-nowrap shrink-0"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Gmail
                    </a>
                  )}

                  {mailtoUrl && (
                    <a
                      href={mailtoUrl}
                      onClick={() => onUpdateOutreachStatus(prospect.id, 'sent')}
                      className="inline-flex items-center gap-1 font-medium text-[#6E6E73] hover:text-[#1D1D1F] whitespace-nowrap shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Mail App
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-2 space-y-2 rounded-lg border border-[#E5E5EA] bg-[#FAFAFC] p-3.5">
                <div className="flex items-center gap-2 border-b border-[#E5E5EA] pb-2 text-xs">
                  <span className="text-[#6E6E73] shrink-0">Subject:</span>
                  <input
                    type="text"
                    aria-label="Email subject"
                    value={prospect.draft.subject}
                    onChange={(e) =>
                      onUpdateDraft(prospect.id, {
                        ...prospect.draft!,
                        subject: e.target.value,
                      })
                    }
                    className="w-full bg-transparent font-medium text-[#1D1D1F] focus:outline-none"
                  />
                </div>
                <textarea
                  aria-label="Email body"
                  rows={5}
                  value={prospect.draft.emailBody}
                  onChange={(e) =>
                    onUpdateDraft(prospect.id, {
                      ...prospect.draft!,
                      emailBody: e.target.value,
                    })
                  }
                  className="w-full resize-y bg-transparent text-sm leading-relaxed text-[#1D1D1F] focus:outline-none"
                />
              </div>
            </div>

            {/* Editable Direct Social DM */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1D1D1F]">
                  Direct Social DM (LinkedIn / Instagram)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(prospect.draft!.socialDm, 'dm')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0071E3] hover:underline whitespace-nowrap shrink-0"
                >
                  {copiedField === 'dm' ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy DM
                    </>
                  )}
                </button>
              </div>
              <textarea
                aria-label="Social direct message"
                rows={3}
                value={prospect.draft.socialDm}
                onChange={(e) =>
                  onUpdateDraft(prospect.id, {
                    ...prospect.draft!,
                    socialDm: e.target.value,
                  })
                }
                className="mt-2 w-full resize-y rounded-lg border border-[#E5E5EA] bg-[#FAFAFC] p-3.5 text-sm leading-relaxed text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white focus:outline-none"
              />
            </div>

            {/* Evidence transparency list */}
            {prospect.draft.evidenceUsed.length > 0 && (
              <div className="border-t border-[#E5E5EA] pt-3 text-xs text-[#6E6E73]">
                <span className="font-medium text-[#1D1D1F]">
                  Verified facts cited:
                </span>{' '}
                {prospect.draft.evidenceUsed.join(' · ')}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#E5E5EA] pt-3 text-xs">
              <span className="text-[#6E6E73]">
                Outreach status:{' '}
                <strong className="font-medium text-[#1D1D1F]">
                  {prospect.outreachStatus === 'sent'
                    ? 'Sent'
                    : prospect.outreachStatus === 'copied'
                      ? 'Copied'
                      : 'Ready'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateOutreachStatus(
                    prospect.id,
                    prospect.outreachStatus === 'sent' ? 'new' : 'sent'
                  )
                }
                className="font-medium text-[#0071E3] hover:underline"
              >
                {prospect.outreachStatus === 'sent'
                  ? 'Mark as ready'
                  : 'Mark as sent'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
