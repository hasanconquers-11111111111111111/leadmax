'use client';

import { useState } from 'react';
import { FAILURE_DIAGNOSIS, OSS_CAPABILITIES } from '@/lib/types';

export default function RealityBriefView() {
  const [personalInboxes, setPersonalInboxes] = useState(12);
  const [socialAccounts, setSocialAccounts] = useState(2);

  // Conservative, realistic zero-burn daily outreach numbers
  const safeEmailsPerInbox = 20;
  const safeDmsPerAccount = 18;
  const dailySafeEmails = personalInboxes * safeEmailsPerInbox;
  const dailySafeDms = socialAccounts * safeDmsPerAccount;
  const totalDailyVerifiedTouches = dailySafeEmails + dailySafeDms;
  const estimatedMonthlyReplies = Math.round(totalDailyVerifiedTouches * 22 * 0.08);

  return (
    <section className="mx-auto max-w-[1080px] px-6 py-12 space-y-16">
      {/* Section 1: Honest Diagnosis */}
      <div>
        <div className="text-xs font-medium text-[#6E6E73]">
          Engineering Post-Mortem · Zero-Cost Architecture
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#1D1D1F] sm:text-4xl">
          What You Were Trying to Build — And Why Earlier Attempts Stalled
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#6E6E73]">
          Your goal was clear: an automated, $0 client-acquisition engine that finds real US businesses from overlooked places, verifies them objectively, writes high-reply outreach, and runs inside Antigravity without nagging you for API keys or URLs. Here is exactly where previous attempts hit hard physical walls, and how Aperture solves each one honestly.
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] text-xs font-medium text-[#6E6E73]">
                <th className="px-5 py-3.5 w-[24%]">Original Requirement</th>
                <th className="px-5 py-3.5 w-[38%]">Why It Couldn&apos;t Happen</th>
                <th className="px-5 py-3.5 w-[38%]">Working $0 Solution in Aperture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {FAILURE_DIAGNOSIS.map((item) => (
                <tr key={item.originalAsk} className="align-top">
                  <td className="px-5 py-4 font-medium text-[#1D1D1F]">
                    {item.originalAsk}
                  </td>
                  <td className="px-5 py-4 text-xs leading-relaxed text-[#6E6E73]">
                    {item.whyItFailed}
                  </td>
                  <td className="px-5 py-4 text-xs leading-relaxed text-[#1D1D1F]">
                    {item.workingSolution}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: 5 Proven Open-Source Primitives Built In */}
      <div className="border-t border-[#E5E5EA] pt-12">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[#1D1D1F]">
          The 5 Open-Source Lead Engineering Capabilities Installed Here
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6E6E73]">
          Instead of pretending to read 1,000 duplicate GitHub scraper wrappers, Aperture implements the five real open-source primitives those repositories rely on—natively on the server at $0 SaaS cost.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC] text-xs font-medium text-[#6E6E73]">
                <th className="px-5 py-3.5">Capability</th>
                <th className="px-5 py-3.5">Proven OSS Pattern</th>
                <th className="px-5 py-3.5">How Aperture Runs It Live</th>
                <th className="px-5 py-3.5 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {OSS_CAPABILITIES.map((cap) => (
                <tr key={cap.capability} className="align-top">
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#1D1D1F]">
                      {cap.capability}
                    </div>
                    <div className="mt-0.5 text-xs text-[#6E6E73]">
                      {cap.category}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs leading-relaxed text-[#6E6E73]">
                    {cap.ossPattern}
                  </td>
                  <td className="px-5 py-4 text-xs leading-relaxed text-[#1D1D1F]">
                    {cap.howApertureImplements}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-xs font-medium text-[#16A34A] tabular-nums">
                    {cap.cost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Interactive Safe Daily Outreach Calculator */}
      <div className="border-t border-[#E5E5EA] pt-12">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[#1D1D1F]">
          Safe $0 Daily Outreach Planner
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6E6E73]">
          Calculate your realistic, ban-free daily capacity using your existing personal inboxes plus direct decision-maker social messages—targeting evidence-verified prospects instead of 60,000-email spam blasts.
        </p>

        <div className="mt-6 grid gap-8 rounded-xl border border-[#E5E5EA] bg-[#FAFAFC] p-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="inbox-range"
                  className="font-medium text-[#1D1D1F]"
                >
                  Personal Email Accounts Available
                </label>
                <span className="font-mono font-semibold text-[#1D1D1F] tabular-nums">
                  {personalInboxes} inboxes
                </span>
              </div>
              <input
                id="inbox-range"
                type="range"
                min={1}
                max={20}
                value={personalInboxes}
                onChange={(e) => setPersonalInboxes(Number(e.target.value))}
                className="mt-2 w-full accent-[#0071E3]"
              />
              <p className="mt-1 text-xs text-[#6E6E73]">
                Capped at 20 personalized evidence emails per personal inbox/day to protect deliverability.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="social-range"
                  className="font-medium text-[#1D1D1F]"
                >
                  Social Profiles (LinkedIn / Instagram)
                </label>
                <span className="font-mono font-semibold text-[#1D1D1F] tabular-nums">
                  {socialAccounts} accounts
                </span>
              </div>
              <input
                id="social-range"
                type="range"
                min={1}
                max={5}
                value={socialAccounts}
                onChange={(e) => setSocialAccounts(Number(e.target.value))}
                className="mt-2 w-full accent-[#0071E3]"
              />
              <p className="mt-1 text-xs text-[#6E6E73]">
                Capped at 18 direct owner/founder DMs per profile/day to stay well inside human activity limits.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-6 rounded-lg border border-[#E5E5EA] bg-white p-5">
            <div>
              <dt className="text-xs text-[#6E6E73]">Safe Daily Emails</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold text-[#1D1D1F] tabular-nums">
                {dailySafeEmails}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#6E6E73]">Safe Daily Social DMs</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold text-[#1D1D1F] tabular-nums">
                {dailySafeDms}
              </dd>
            </div>
            <div className="border-t border-[#E5E5EA] pt-4">
              <dt className="text-xs text-[#6E6E73]">Total Verified Touches / Day</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold text-[#0071E3] tabular-nums">
                {totalDailyVerifiedTouches}
              </dd>
            </div>
            <div className="border-t border-[#E5E5EA] pt-4">
              <dt className="text-xs text-[#6E6E73]">Est. Replies / Month (8%)</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold text-[#16A34A] tabular-nums">
                ~{estimatedMonthlyReplies}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
