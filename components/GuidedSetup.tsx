'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import {
  NICHE_PRESETS,
  SERVICE_OPTIONS,
  type AgencyProfile,
  type OutreachPreference,
  type ServiceType,
} from '@/lib/types';

interface GuidedSetupProps {
  profile: AgencyProfile;
  niche: string;
  location: string;
  isDiscovering: boolean;
  errorMessage: string | null;
  hasExistingLeads: boolean;
  onUpdateProfile: (next: AgencyProfile) => void;
  onUpdateTarget: (niche: string, location: string) => void;
  onLaunchDiscovery: (niche: string, location: string) => Promise<void>;
  onOpenWorkbench: () => void;
}

const OUTREACH_MODES: {
  id: OutreachPreference;
  title: string;
  detail: string;
}[] = [
  {
    id: 'email_and_social',
    title: 'Verified Email + Direct Social Profiles',
    detail:
      'Checks domain MX records, extracts live site emails, and surfaces decision-maker LinkedIn and Instagram links so you can reach owners without burning personal inboxes.',
  },
  {
    id: 'social_dm_first',
    title: 'Direct Decision-Maker Social DM First',
    detail:
      'Prioritizes direct founder and hiring-manager social profiles with crisp under-45-word evidence messages ready to paste.',
  },
  {
    id: 'email_only',
    title: 'Verified MX Email Only',
    detail:
      'Focuses on domains with confirmed Google Workspace or Microsoft 365 MX records and live-scraped contact addresses.',
  },
];

export default function GuidedSetup({
  profile,
  niche,
  location,
  isDiscovering,
  errorMessage,
  hasExistingLeads,
  onUpdateProfile,
  onUpdateTarget,
  onLaunchDiscovery,
  onOpenWorkbench,
}: GuidedSetupProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [localNiche, setLocalNiche] = useState(niche);
  const [localLocation, setLocalLocation] = useState(location);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSelectService = (serviceId: ServiceType) => {
    const preset = SERVICE_OPTIONS.find((s) => s.id === serviceId);
    if (preset) {
      onUpdateProfile({
        ...profile,
        serviceType: serviceId,
        serviceLabel: preset.label,
        starterPrice: preset.beginnerPrice,
      });
    } else {
      onUpdateProfile({
        ...profile,
        serviceType: 'custom',
      });
    }
  };

  const goNextFromStep1 = () => {
    if (!profile.serviceLabel.trim()) {
      setValidationError('Enter the service you plan to offer.');
      return;
    }
    setValidationError(null);
    setStep(2);
  };

  const goNextFromStep2 = () => {
    if (!localNiche.trim() || !localLocation.trim()) {
      setValidationError('Enter both a target business type and a US city or state.');
      return;
    }
    setValidationError(null);
    onUpdateTarget(localNiche.trim(), localLocation.trim());
    setStep(3);
  };

  const handleSubmitDiscovery = async () => {
    setValidationError(null);
    onUpdateTarget(localNiche.trim(), localLocation.trim());
    await onLaunchDiscovery(localNiche.trim(), localLocation.trim());
  };

  const stepMeta =
    step === 1
      ? 'Step 1 of 3 · Your Service Offer'
      : step === 2
        ? 'Step 2 of 3 · Target US Niche'
        : 'Step 3 of 3 · Verification & Outreach';

  return (
    <section className="mx-auto max-w-[920px] px-6 py-12 lg:py-16">
      {/* Quiet step metadata + progress hairline */}
      <div className="mb-10">
        <div className="flex items-center justify-between gap-4 text-xs font-medium text-[#6E6E73]">
          <span>{stepMeta}</span>
          {hasExistingLeads && (
            <button
              type="button"
              onClick={onOpenWorkbench}
              className="text-[#0071E3] hover:underline whitespace-nowrap shrink-0"
            >
              Return to saved workbench
            </button>
          )}
        </div>
        <div className="mt-3 h-[2px] w-full bg-[#E5E5EA]">
          <div
            className="h-full bg-[#1D1D1F] transition-all duration-200"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F] sm:text-4xl">
              What service are you offering to clients?
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6E6E73]">
              Pick a beginner-friendly offer or write your own. Aperture uses this to pick overlooked US directories, audit websites for matching flaws, and draft realistic pitches.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {SERVICE_OPTIONS.map((option) => {
                const selected = profile.serviceType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectService(option.id)}
                    className={`flex flex-col justify-between rounded-xl border p-5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                      selected
                        ? 'border-[#0071E3] bg-[#F5F5F7]'
                        : 'border-[#E5E5EA] bg-white hover:bg-[#FAFAFC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-display text-base font-semibold text-[#1D1D1F]">
                          {option.label}
                        </span>
                        {selected && (
                          <Check className="h-4 w-4 shrink-0 text-[#0071E3]" />
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]">
                        {option.summary}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-xs text-[#6E6E73]">
                      <span>Suggested starter range</span>
                      <span className="font-mono font-medium text-[#1D1D1F] tabular-nums">
                        {option.beginnerPrice}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 grid gap-4 border-t border-[#E5E5EA] pt-6 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="service-label"
                  className="block text-xs font-medium text-[#6E6E73]"
                >
                  Offer Name
                </label>
                <input
                  id="service-label"
                  type="text"
                  value={profile.serviceLabel}
                  onChange={(e) =>
                    onUpdateProfile({
                      ...profile,
                      serviceType: 'custom',
                      serviceLabel: e.target.value,
                    })
                  }
                  placeholder="e.g. Website Redesign & Speed Fix"
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="starter-price"
                  className="block text-xs font-medium text-[#6E6E73]"
                >
                  Realistic Starter Price
                </label>
                <input
                  id="starter-price"
                  type="text"
                  value={profile.starterPrice}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, starterPrice: e.target.value })
                  }
                  placeholder="$650 – $1,200"
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="sender-name"
                  className="block text-xs font-medium text-[#6E6E73]"
                >
                  Your Name (For Sign-Off)
                </label>
                <input
                  id="sender-name"
                  type="text"
                  value={profile.senderName}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, senderName: e.target.value })
                  }
                  placeholder="Hasan"
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:border-[#0071E3] focus:outline-none"
                />
              </div>
            </div>

            {validationError && (
              <p className="mt-4 text-sm text-[#DC2626]">{validationError}</p>
            )}

            <div className="mt-8 flex items-center justify-end">
              <button
                type="button"
                onClick={goNextFromStep1}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0071E3] px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#0077ED] whitespace-nowrap shrink-0"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F] sm:text-4xl">
              Which US businesses should Aperture find?
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6E6E73]">
              No URLs needed. Name the business type and US city or state—Aperture automatically searches public US Chambers of Commerce, state registries, and direct company sites.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="target-niche"
                  className="block text-xs font-medium text-[#6E6E73]"
                >
                  Target Industry or Business Type
                </label>
                <input
                  id="target-niche"
                  type="text"
                  value={localNiche}
                  onChange={(e) => setLocalNiche(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goNextFromStep2();
                    }
                  }}
                  placeholder="e.g. Independent HVAC & Plumbing Contractors"
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-4 py-3 text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="target-location"
                  className="block text-xs font-medium text-[#6E6E73]"
                >
                  US City &amp; State
                </label>
                <input
                  id="target-location"
                  type="text"
                  value={localLocation}
                  onChange={(e) => setLocalLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goNextFromStep2();
                    }
                  }}
                  placeholder="e.g. Austin, TX"
                  className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] bg-white px-4 py-3 text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:border-[#0071E3] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-8 border-t border-[#E5E5EA] pt-6">
              <p className="text-xs font-medium text-[#6E6E73]">
                Or choose a high-intent starter target
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {NICHE_PRESETS.map((preset) => {
                  const active =
                    localNiche === preset.niche &&
                    localLocation === preset.location;
                  return (
                    <button
                      key={`${preset.niche}-${preset.location}`}
                      type="button"
                      onClick={() => {
                        setLocalNiche(preset.niche);
                        setLocalLocation(preset.location);
                        setValidationError(null);
                      }}
                      className={`rounded-xl border px-4 py-3.5 text-left transition-colors duration-150 ${
                        active
                          ? 'border-[#0071E3] bg-[#F5F5F7]'
                          : 'border-[#E5E5EA] bg-white hover:bg-[#FAFAFC]'
                      }`}
                    >
                      <div className="text-sm font-medium text-[#1D1D1F]">
                        {preset.niche}
                      </div>
                      <div className="mt-1 text-xs text-[#6E6E73]">
                        {preset.location} · {preset.channels[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {validationError && (
              <p className="mt-4 text-sm text-[#DC2626]">{validationError}</p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={goNextFromStep2}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0071E3] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ED] whitespace-nowrap shrink-0"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F] sm:text-4xl">
              How do you want to reach decision makers?
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6E6E73]">
              Every prospect is checked with live DNS MX verification and a real HTML website audit so you only send evidence-backed messages—never blind spam.
            </p>

            <div className="mt-8 space-y-3">
              {OUTREACH_MODES.map((mode) => {
                const selected = profile.outreachPreference === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      onUpdateProfile({ ...profile, outreachPreference: mode.id })
                    }
                    className={`flex w-full items-start justify-between gap-4 rounded-xl border p-5 text-left transition-colors duration-150 ${
                      selected
                        ? 'border-[#0071E3] bg-[#F5F5F7]'
                        : 'border-[#E5E5EA] bg-white hover:bg-[#FAFAFC]'
                    }`}
                  >
                    <div>
                      <div className="font-display text-base font-semibold text-[#1D1D1F]">
                        {mode.title}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[#6E6E73]">
                        {mode.detail}
                      </p>
                    </div>
                    {selected && (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Clean pre-flight summary strip */}
            <div className="mt-8 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] p-5">
              <div className="text-xs font-medium text-[#6E6E73]">
                Automated Pipeline Summary
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#1D1D1F]">
                <span className="font-medium">{profile.serviceLabel}</span>
                <span className="text-[#86868B]">·</span>
                <span className="font-mono text-xs tabular-nums">{profile.starterPrice}</span>
                <span className="text-[#86868B]">·</span>
                <span>{localNiche}</span>
                <span className="text-[#86868B]">·</span>
                <span>{localLocation}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#6E6E73]">
                Sources searched automatically: Local Chambers of Commerce, state trade registries, and direct company team pages (excludes Upwork, Fiverr, and aggregator noise).
              </p>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-lg border border-[#DC2626]/30 bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
                {errorMessage}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                disabled={isDiscovering}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5EA] bg-white px-4 py-2.5 text-sm font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                disabled={isDiscovering}
                onClick={handleSubmitDiscovery}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0071E3] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ED] disabled:opacity-70 whitespace-nowrap shrink-0"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching Live Directories...
                  </>
                ) : (
                  <>
                    Discover &amp; Audit Leads
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
