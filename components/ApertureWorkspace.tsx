'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  NICHE_PRESETS,
  SERVICE_OPTIONS,
  type ActiveWorkspaceView,
  type AgencyProfile,
  type LeadCampaign,
  type OutreachDraft,
  type Prospect,
} from '@/lib/types';
import TopNav from './TopNav';
import GuidedSetup from './GuidedSetup';
import ProspectWorkbench from './ProspectWorkbench';
import SkillExportView from './SkillExportView';
import RealityBriefView from './RealityBriefView';

const STORAGE_KEY_PROFILE = 'aperture_agency_profile_v1';
const STORAGE_KEY_CAMPAIGN = 'aperture_active_campaign_v1';

const DEFAULT_PROFILE: AgencyProfile = {
  senderName: 'Hasan',
  agencyName: 'Aperture Studio',
  serviceType: 'website_redesign',
  serviceLabel: SERVICE_OPTIONS[0].label,
  starterPrice: SERVICE_OPTIONS[0].beginnerPrice,
  outreachPreference: 'email_and_social',
};

export default function ApertureWorkspace() {
  const [activeView, setActiveView] = useState<ActiveWorkspaceView>('setup');
  const [profile, setProfile] = useState<AgencyProfile>(DEFAULT_PROFILE);
  const [targetNiche, setTargetNiche] = useState(NICHE_PRESETS[0].niche);
  const [targetLocation, setTargetLocation] = useState(NICHE_PRESETS[0].location);
  const [campaign, setCampaign] = useState<LeadCampaign | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore saved workspace cleanly from localStorage once on mount
  useEffect(() => {
    let active = true;
    const frameId = window.requestAnimationFrame(() => {
      if (!active) return;
      try {
        const savedProfile = window.localStorage.getItem(STORAGE_KEY_PROFILE);
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile) as AgencyProfile);
        }
        const savedCampaign = window.localStorage.getItem(STORAGE_KEY_CAMPAIGN);
        if (savedCampaign) {
          const parsed = JSON.parse(savedCampaign) as LeadCampaign;
          if (parsed && Array.isArray(parsed.prospects) && parsed.prospects.length > 0) {
            setCampaign(parsed);
            setTargetNiche(parsed.niche || NICHE_PRESETS[0].niche);
            setTargetLocation(parsed.location || NICHE_PRESETS[0].location);
            setSelectedProspectId(parsed.prospects[0].id);
            setActiveView('workbench');
          }
        }
      } catch {
        // ignore corrupted storage
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  // Persist profile changes
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore quota errors
    }
  }, [profile, hydrated]);

  // Persist active campaign changes
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (campaign) {
        window.localStorage.setItem(STORAGE_KEY_CAMPAIGN, JSON.stringify(campaign));
      }
    } catch {
      // ignore quota errors
    }
  }, [campaign, hydrated]);

  const auditSingleProspect = useCallback(
    async (prospectId: string, websiteUrl: string) => {
      setCampaign((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          prospects: prev.prospects.map((p) =>
            p.id === prospectId ? { ...p, auditStatus: 'auditing' } : p
          ),
        };
      });

      try {
        const res = await fetch('/api/leads/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website: websiteUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Audit failed');
        }

        setCampaign((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            prospects: prev.prospects.map((p) => {
              if (p.id !== prospectId) return p;
              const mergedEmail =
                p.decisionMakerEmail || data.audit?.extractedEmails?.[0] || '';
              return {
                ...p,
                decisionMakerEmail: mergedEmail,
                auditStatus: 'done',
                audit: data.audit,
              };
            }),
          };
        });
      } catch {
        setCampaign((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            prospects: prev.prospects.map((p) =>
              p.id === prospectId ? { ...p, auditStatus: 'error' } : p
            ),
          };
        });
      }
    },
    []
  );

  const runBatchAudits = useCallback(
    async (targets: Prospect[]) => {
      if (targets.length === 0) return;
      setIsBatchAuditing(true);
      try {
        // Run in controlled concurrency batches of 3 so we stay fast and polite to target servers
        for (let i = 0; i < targets.length; i += 3) {
          const chunk = targets.slice(i, i + 3);
          await Promise.all(
            chunk.map((item) => auditSingleProspect(item.id, item.website))
          );
        }
      } finally {
        setIsBatchAuditing(false);
      }
    },
    [auditSingleProspect]
  );

  const handleLaunchDiscovery = async (niche: string, location: string) => {
    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      const res = await fetch('/api/leads/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          location,
          serviceLabel: profile.serviceLabel,
          starterPrice: profile.starterPrice,
          outreachPreference: profile.outreachPreference,
          count: 8,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lead discovery failed.');
      }

      const nextCampaign: LeadCampaign = {
        id: `camp_${Date.now()}`,
        niche,
        location,
        sourceStrategy: data.sourceStrategy ?? [],
        createdAt: new Date().toISOString(),
        citations: data.citations ?? [],
        prospects: data.prospects ?? [],
      };

      setCampaign(nextCampaign);
      if (nextCampaign.prospects.length > 0) {
        setSelectedProspectId(nextCampaign.prospects[0].id);
      }
      setActiveView('workbench');

      // Immediately run live server-side website & DNS MX verification automatically
      void runBatchAudits(nextCampaign.prospects);
    } catch (err) {
      setDiscoveryError(
        err instanceof Error ? err.message : 'Unable to discover leads right now.'
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleRunSingleAuditById = async (prospectId: string) => {
    const target = campaign?.prospects.find((p) => p.id === prospectId);
    if (!target) return;
    await auditSingleProspect(target.id, target.website);
  };

  const handleAuditAll = async () => {
    if (!campaign?.prospects.length) return;
    await runBatchAudits(campaign.prospects);
  };

  const handleUpdateDraft = (prospectId: string, draft: OutreachDraft) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prospects: prev.prospects.map((p) =>
          p.id === prospectId ? { ...p, draft } : p
        ),
      };
    });
  };

  const handleUpdateEmail = (prospectId: string, email: string) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prospects: prev.prospects.map((p) =>
          p.id === prospectId ? { ...p, decisionMakerEmail: email } : p
        ),
      };
    });
  };

  const handleUpdateOutreachStatus = (
    prospectId: string,
    status: 'new' | 'copied' | 'sent'
  ) => {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prospects: prev.prospects.map((p) =>
          p.id === prospectId ? { ...p, outreachStatus: status } : p
        ),
      };
    });
  };

  const handleImportProspects = (imported: Prospect[]) => {
    if (imported.length === 0) return;
    setCampaign((prev) => {
      if (!prev) {
        return {
          id: `camp_csv_${Date.now()}`,
          niche: targetNiche || 'Imported CSV Prospects',
          location: targetLocation || 'United States',
          sourceStrategy: ['CSV Import + Live Website & DNS Audit'],
          createdAt: new Date().toISOString(),
          citations: [],
          prospects: imported,
        };
      }
      return {
        ...prev,
        prospects: [...imported, ...prev.prospects],
      };
    });
    setSelectedProspectId(imported[0].id);
    setActiveView('workbench');
    void runBatchAudits(imported);
  };

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      <TopNav
        activeView={activeView}
        onSelectView={setActiveView}
        onStartNewSearch={() => {
          setDiscoveryError(null);
          setActiveView('setup');
        }}
        prospectCount={campaign?.prospects.length ?? 0}
      />

      <main className="pb-16">
        {activeView === 'setup' && (
          <GuidedSetup
            profile={profile}
            niche={targetNiche}
            location={targetLocation}
            isDiscovering={isDiscovering}
            errorMessage={discoveryError}
            hasExistingLeads={(campaign?.prospects.length ?? 0) > 0}
            onUpdateProfile={setProfile}
            onUpdateTarget={(n, l) => {
              setTargetNiche(n);
              setTargetLocation(l);
            }}
            onLaunchDiscovery={handleLaunchDiscovery}
            onOpenWorkbench={() => setActiveView('workbench')}
          />
        )}

        {activeView === 'workbench' && (
          <ProspectWorkbench
            campaign={campaign}
            profile={profile}
            selectedProspectId={selectedProspectId}
            isBatchAuditing={isBatchAuditing}
            onSelectProspect={setSelectedProspectId}
            onRunAudit={handleRunSingleAuditById}
            onAuditAll={handleAuditAll}
            onUpdateDraft={handleUpdateDraft}
            onUpdateEmail={handleUpdateEmail}
            onUpdateOutreachStatus={handleUpdateOutreachStatus}
            onImportProspects={handleImportProspects}
            onStartNewSearch={() => setActiveView('setup')}
          />
        )}

        {activeView === 'skill' && (
          <SkillExportView
            profile={profile}
            niche={targetNiche}
            location={targetLocation}
            campaign={campaign}
          />
        )}

        {activeView === 'reality' && <RealityBriefView />}
      </main>
    </div>
  );
}
