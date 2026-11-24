import { NextRequest, NextResponse } from 'next/server';
import { buildAntigravitySkillMarkdown } from '@/lib/skill-template';
import type { AgencyProfile } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profile = body?.profile as AgencyProfile | undefined;
    const niche = typeof body?.niche === 'string' ? body.niche : '';
    const location = typeof body?.location === 'string' ? body.location : '';
    const channels = Array.isArray(body?.channels)
      ? body.channels.filter((c: unknown): c is string => typeof c === 'string')
      : [];

    const safeProfile: AgencyProfile = {
      senderName: profile?.senderName || 'Founder',
      agencyName: profile?.agencyName || 'Aperture Studio',
      serviceType: profile?.serviceType || 'website_redesign',
      serviceLabel: profile?.serviceLabel || 'Website Redesign & Speed Fix',
      starterPrice: profile?.starterPrice || '$650 – $1,200 one-time',
      outreachPreference: profile?.outreachPreference || 'email_and_social',
    };

    const markdown = buildAntigravitySkillMarkdown(
      safeProfile,
      niche,
      location,
      channels
    );

    return NextResponse.json({
      filename: 'SKILL.md',
      markdown,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to compile Antigravity Skill.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
