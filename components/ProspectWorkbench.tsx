'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { exportProspectsToCsv, parseCsvToProspects } from '@/lib/csv';
import type {
  AgencyProfile,
  LeadCampaign,
  OutreachDraft,
  Prospect,
} from '@/lib/types';
import ProspectInspector from './ProspectInspector';

interface ProspectWorkbenchProps {
  campaign: LeadCampaign | null;
  profile: AgencyProfile;
  selectedProspectId: string | null;
  isBatchAuditing: boolean;
  onSelectProspect: (id: string) => void;
  onRunAudit: (prospectId: string) => Promise<void>;
  onAuditAll: () => Promise<void>;
  onUpdateDraft: (prospectId: string, draft: OutreachDraft) => void;
  onUpdateEmail: (prospectId: string, email: string) => void;
  onUpdateOutreachStatus: (
    prospectId: string,
    status: 'new' | 'copied' | 'sent'
  ) => void;
  onImportProspects: (prospects: Prospect[]) => void;
  onStartNewSearch: () => void;
}

type FilterKey = 'all' | 'issues' | 'mx_verified' | 'draft_ready';

const FILTER_TABS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'issues', label: 'Issues Found' },
  { id: 'mx_verified', label: 'MX Verified' },
  { id: 'draft_ready', label: 'Draft Ready' },
];

export default function ProspectWorkbench({
  campaign,
  profile,
  selectedProspectId,
  isBatchAuditing,
  onSelectProspect,
  onRunAudit,
  onAuditAll,
  onUpdateDraft,
  onUpdateEmail,
  onUpdateOutreachStatus,
  onImportProspects,
  onStartNewSearch,
}: ProspectWorkbenchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const prospects = useMemo(() => campaign?.prospects ?? [], [campaign]);

  const metrics = useMemo(() => {
    const total = prospects.length;
    const mxVerified = prospects.filter((p) => p.audit?.mxVerified).length;
    const issuesFound = prospects.filter(
      (p) =>
        p.audit &&
        p.audit.issues.some((i) => i.severity === 'high' || i.severity === 'medium')
    ).length;
    const draftsReady = prospects.filter((p) => Boolean(p.draft)).length;
    return { total, mxVerified, issuesFound, draftsReady };
  }, [prospects]);

  const filteredProspects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return prospects.filter((p) => {
      if (activeFilter === 'issues') {
        const hasIssues =
          p.audit?.issues.some(
            (i) => i.severity === 'high' || i.severity === 'medium'
          ) ?? false;
        if (!hasIssues) return false;
      } else if (activeFilter === 'mx_verified') {
        if (!p.audit?.mxVerified) return false;
      } else if (activeFilter === 'draft_ready') {
        if (!p.draft) return false;
      }

      if (!q) return true;
      return (
        p.companyName.toLowerCase().includes(q) ||
        p.website.toLowerCase().includes(q) ||
        p.decisionMakerName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.sourceChannel.toLowerCase().includes(q)
      );
    });
  }, [prospects, searchQuery, activeFilter]);

  const selectedProspect = useMemo(() => {
    if (!prospects.length) return null;
    return (
      prospects.find((p) => p.id === selectedProspectId) ??
      filteredProspects[0] ??
      prospects[0]
    );
  }, [prospects, filteredProspects, selectedProspectId]);

  const handleExportCsv = () => {
    if (!prospects.length) return;
    const csv = exportProspectsToCsv(prospects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aperture-leads-${(campaign?.location || 'export')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setCsvText(content);
      setCsvError(null);
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvImport = () => {
    const parsed = parseCsvToProspects(csvText, campaign?.niche || profile.serviceLabel);
    if (parsed.length === 0) {
      setCsvError(
        'No valid rows with a company name and website URL were found. Example: Acme HVAC,https://acmehvac.com,info@acmehvac.com,Austin TX'
      );
      return;
    }
    setCsvError(null);
    setCsvText('');
    setShowCsvImport(false);
    onImportProspects(parsed);
  };

  if (!campaign || prospects.length === 0) {
    return (
      <section className="mx-auto max-w-[920px] px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[#1D1D1F]">
          Your prospect workbench is empty
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-[#6E6E73]">
          Run a 3-step guided discovery to pull verified US businesses from public directories, or import an existing CSV list to audit every website live.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStartNewSearch}
            className="rounded-lg bg-[#0071E3] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ED] whitespace-nowrap shrink-0"
          >
            Start Guided Discovery
          </button>
          <button
            type="button"
            onClick={() => setShowCsvImport((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5EA] bg-white px-5 py-2.5 text-sm font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] whitespace-nowrap shrink-0"
          >
            <Upload className="h-4 w-4" />
            Import CSV Leads
          </button>
        </div>

        {showCsvImport && (
          <div className="mx-auto mt-8 max-w-xl rounded-xl border border-[#E5E5EA] bg-white p-6 text-left">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#1D1D1F]">
                Import CSV for Live Website &amp; MX Audit
              </h2>
              <button
                type="button"
                onClick={() => setShowCsvImport(false)}
                className="text-[#6E6E73] hover:text-[#1D1D1F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-[#6E6E73]">
              Upload a .csv file or paste lines with headers like{' '}
              <span className="font-mono">company,website,email,location</span>.
            </p>
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileUpload}
                className="text-xs text-[#6E6E73] file:mr-3 file:rounded-md file:border file:border-[#E5E5EA] file:bg-[#F5F5F7] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#1D1D1F]"
              />
            </div>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={'company,website,email,location\nAustin Comfort Air,https://austincomfortair.com,,Austin TX'}
              className="mt-3 w-full rounded-lg border border-[#E5E5EA] bg-[#FAFAFC] p-3 font-mono text-xs text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
            />
            {csvError && <p className="mt-2 text-xs text-[#DC2626]">{csvError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCsvImport(false)}
                className="rounded-lg border border-[#E5E5EA] px-4 py-2 text-xs font-medium text-[#1D1D1F]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCsvImport}
                className="rounded-lg bg-[#0071E3] px-4 py-2 text-xs font-medium text-white hover:bg-[#0077ED]"
              >
                Import &amp; Audit Live
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-6 py-8">
      {/* Top Campaign Context & Tabular Summary Strip */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#E5E5EA] pb-6">
        <div>
          <div className="text-xs font-medium text-[#6E6E73]">
            {campaign.location} · {profile.serviceLabel} · {profile.starterPrice}
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#1D1D1F] sm:text-3xl">
            {campaign.niche}
          </h1>
          {campaign.sourceStrategy.length > 0 && (
            <p className="mt-1.5 text-xs text-[#6E6E73]">
              Sources queried: {campaign.sourceStrategy.join(' · ')}
            </p>
          )}
        </div>

        {/* Clean unboxed tabular metric strip */}
        <dl className="flex flex-wrap items-center gap-8 text-sm">
          <div>
            <dt className="text-xs text-[#6E6E73]">Discovered</dt>
            <dd className="mt-0.5 font-mono text-xl font-semibold text-[#1D1D1F] tabular-nums">
              {metrics.total}
            </dd>
          </div>
          <div className="h-8 w-[1px] bg-[#E5E5EA]" aria-hidden="true" />
          <div>
            <dt className="text-xs text-[#6E6E73]">MX Verified</dt>
            <dd className="mt-0.5 font-mono text-xl font-semibold text-[#16A34A] tabular-nums">
              {metrics.mxVerified}
            </dd>
          </div>
          <div className="h-8 w-[1px] bg-[#E5E5EA]" aria-hidden="true" />
          <div>
            <dt className="text-xs text-[#6E6E73]">Issues Detected</dt>
            <dd className="mt-0.5 font-mono text-xl font-semibold text-[#DC2626] tabular-nums">
              {metrics.issuesFound}
            </dd>
          </div>
          <div className="h-8 w-[1px] bg-[#E5E5EA]" aria-hidden="true" />
          <div>
            <dt className="text-xs text-[#6E6E73]">Drafts Ready</dt>
            <dd className="mt-0.5 font-mono text-xl font-semibold text-[#0071E3] tabular-nums">
              {metrics.draftsReady}
            </dd>
          </div>
        </dl>
      </div>

      {/* Controls Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter companies or owners..."
              className="w-64 rounded-lg border border-[#E5E5EA] bg-white py-2 pl-9 pr-3 text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:border-[#0071E3] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#F5F5F7] p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeFilter === tab.id
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isBatchAuditing}
            onClick={onAuditAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-3.5 py-2 text-xs font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {isBatchAuditing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {isBatchAuditing ? 'Auditing Sites...' : 'Audit All Live'}
          </button>

          <button
            type="button"
            onClick={() => setShowCsvImport((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-3.5 py-2 text-xs font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] whitespace-nowrap shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-3.5 py-2 text-xs font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Inline CSV Import Panel */}
      {showCsvImport && (
        <div className="mt-4 rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#1D1D1F]">
              Import CSV Leads to Run Live Website &amp; DNS MX Checks
            </h2>
            <button
              type="button"
              onClick={() => setShowCsvImport(false)}
              className="text-[#6E6E73] hover:text-[#1D1D1F]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileUpload}
              className="text-xs text-[#6E6E73] file:mr-3 file:rounded-md file:border file:border-[#E5E5EA] file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#1D1D1F]"
            />
            <span className="text-xs text-[#6E6E73]">
              Columns detected automatically: company, website, email, location, decision_maker, linkedin
            </span>
          </div>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'company,website,email,location\nLone Star Mechanical,https://lonestarmechanical.com,,Austin TX'}
            className="mt-3 w-full rounded-lg border border-[#E5E5EA] bg-white p-3 font-mono text-xs text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
          />
          {csvError && <p className="mt-2 text-xs text-[#DC2626]">{csvError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCsvImport(false)}
              className="rounded-lg border border-[#E5E5EA] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1D1D1F]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCsvImport}
              className="rounded-lg bg-[#0071E3] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0077ED]"
            >
              Add &amp; Audit Live
            </button>
          </div>
        </div>
      )}

      {/* Main Master-Detail Split Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left: High-Density Prospect Table */}
        <div className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white lg:col-span-7">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] text-xs font-medium text-[#6E6E73]">
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Decision Maker</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3 text-right">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {filteredProspects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-xs text-[#6E6E73]"
                    >
                      No prospects match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map((p) => {
                    const isSelected = selectedProspect?.id === p.id;
                    const actionableIssues =
                      p.audit?.issues.filter(
                        (i) => i.severity === 'high' || i.severity === 'medium'
                      ).length ?? 0;
                    const bestEmail =
                      p.decisionMakerEmail || p.audit?.extractedEmails[0] || '';

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectProspect(p.id)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isSelected ? 'bg-[#F5F5F7]' : 'hover:bg-[#FAFAFC]'
                        }`}
                      >
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-medium text-[#1D1D1F]">
                            {p.companyName}
                          </div>
                          <div className="mt-0.5 text-xs text-[#6E6E73] truncate max-w-[220px]">
                            {p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="text-xs font-medium text-[#1D1D1F]">
                            {p.decisionMakerName}
                          </div>
                          <div className="mt-0.5 text-xs text-[#6E6E73] truncate max-w-[180px]">
                            {bestEmail || p.decisionMakerRole}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top text-xs">
                          {p.auditStatus === 'auditing' ? (
                            <span className="inline-flex items-center gap-1.5 text-[#6E6E73]">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Checking live...
                            </span>
                          ) : p.audit ? (
                            <div>
                              <div
                                className={`font-medium ${
                                  p.audit.mxVerified
                                    ? 'text-[#16A34A]'
                                    : 'text-[#D97706]'
                                }`}
                              >
                                {p.audit.mxVerified ? 'MX Verified' : 'No MX'}
                              </div>
                              <div className="mt-0.5 text-[#6E6E73]">
                                {p.audit.mxProvider}
                              </div>
                            </div>
                          ) : p.auditStatus === 'error' ? (
                            <span className="font-medium text-[#DC2626]">
                              Audit failed
                            </span>
                          ) : (
                            <span className="text-[#86868B]">Pending audit</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top text-right font-mono text-xs tabular-nums">
                          {p.audit ? (
                            !p.audit.reachable &&
                            (p.audit.httpStatus === 403 || p.audit.httpStatus === 429) ? (
                              <span className="font-medium text-[#D97706]">
                                WAF Blocked
                              </span>
                            ) : !p.audit.reachable ? (
                              <span className="font-medium text-[#DC2626]">
                                Unreachable
                              </span>
                            ) : (
                              <span
                                className={`font-medium ${
                                  actionableIssues > 0
                                    ? 'text-[#DC2626]'
                                    : 'text-[#16A34A]'
                                }`}
                              >
                                {actionableIssues > 0
                                  ? `${actionableIssues} found`
                                  : 'Clean'}
                              </span>
                            )
                          ) : (
                            <span className="text-[#86868B]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Search Grounding Citations Footer */}
          {campaign.citations.length > 0 && (
            <div className="border-t border-[#E5E5EA] bg-[#FAFAFC] px-4 py-3.5">
              <div className="text-xs font-medium text-[#6E6E73]">
                Live Web Discovery Citations ({campaign.citations.length})
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {campaign.citations.slice(0, 8).map((c) => (
                  <a
                    key={c.uri}
                    href={c.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#6E6E73] hover:text-[#0071E3] hover:underline max-w-[240px] truncate"
                  >
                    <span className="truncate">{c.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Evidence & Outreach Inspector */}
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <ProspectInspector
            key={selectedProspect?.id ?? 'empty'}
            prospect={selectedProspect}
            profile={profile}
            onRunAudit={onRunAudit}
            onUpdateDraft={onUpdateDraft}
            onUpdateEmail={onUpdateEmail}
            onUpdateOutreachStatus={onUpdateOutreachStatus}
          />
        </div>
      </div>
    </section>
  );
}
