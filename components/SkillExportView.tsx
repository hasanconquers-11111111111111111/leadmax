'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { buildAntigravitySkillMarkdown } from '@/lib/skill-template';
import type { AgencyProfile, LeadCampaign } from '@/lib/types';

interface SkillExportViewProps {
  profile: AgencyProfile;
  niche: string;
  location: string;
  campaign: LeadCampaign | null;
}

export default function SkillExportView({
  profile,
  niche,
  location,
  campaign,
}: SkillExportViewProps) {
  const [copied, setCopied] = useState(false);

  const skillMarkdown = useMemo(() => {
    const channels = campaign?.sourceStrategy ?? [];
    return buildAntigravitySkillMarkdown(
      profile,
      campaign?.niche || niche,
      campaign?.location || location,
      channels
    );
  }, [profile, niche, location, campaign]);

  const handleCopySkill = async () => {
    try {
      await navigator.clipboard.writeText(skillMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard denial
    }
  };

  const handleDownloadSkill = () => {
    const blob = new Blob([skillMarkdown], {
      type: 'text/markdown;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-[1040px] px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#E5E5EA] pb-8">
        <div>
          <div className="text-xs font-medium text-[#6E6E73]">
            Portable Antigravity Skill · Zero External API Keys
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#1D1D1F]">
            Export Your Antigravity Skill
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6E6E73]">
            Drop this compiled <span className="font-mono text-[#1D1D1F]">SKILL.md</span> directly into your Antigravity skills folder. It encodes your offer, beginner pricing, overlooked US directory search operators, live DNS MX &amp; HTML checks, and evidence-first copywriting rules.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopySkill}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5EA] bg-white px-4 py-2.5 text-xs font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[#16A34A]" />
                Copied Markdown
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy SKILL.md
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadSkill}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0071E3] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#0077ED] whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            Download SKILL.md
          </button>
        </div>
      </div>

      {/* Concise 3-step install instructions */}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div>
          <div className="text-xs font-medium text-[#6E6E73]">01. Save Skill Folder</div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#1D1D1F]">
            Create <span className="font-mono text-xs">.agent/skills/aperture-lead-engine/</span> inside your Antigravity workspace and place <span className="font-mono text-xs">SKILL.md</span> inside it.
          </p>
        </div>
        <div>
          <div className="text-xs font-medium text-[#6E6E73]">02. Invoke With One Line</div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#1D1D1F]">
            Tell Antigravity: &ldquo;Find 15 independent roofers in Tampa with outdated sites and write evidence-based outreach.&rdquo;
          </p>
        </div>
        <div>
          <div className="text-xs font-medium text-[#6E6E73]">03. Copy &amp; Send Safely</div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#1D1D1F]">
            Antigravity runs using its built-in model at $0 extra cost—returning verified domains, social profiles, and copy-ready drafts.
          </p>
        </div>
      </div>

      {/* Compiled Markdown Preview */}
      <div className="mt-8 overflow-hidden rounded-xl border border-[#E5E5EA] bg-[#FAFAFC]">
        <div className="flex items-center justify-between border-b border-[#E5E5EA] bg-white px-5 py-3 text-xs text-[#6E6E73]">
          <span className="font-mono font-medium text-[#1D1D1F]">
            aperture-lead-engine/SKILL.md
          </span>
          <span className="font-mono tabular-nums">
            {skillMarkdown.split('\n').length} lines
          </span>
        </div>
        <pre className="max-h-[560px] overflow-auto p-6 font-mono text-xs leading-relaxed text-[#1D1D1F]">
          {skillMarkdown}
        </pre>
      </div>
    </section>
  );
}
