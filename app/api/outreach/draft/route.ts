import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { generateContentWithRetry, extractJsonFromText, formatGeminiError } from '@/lib/gemini';
import type { AgencyProfile, OutreachTone, Prospect } from '@/lib/types';

interface DraftResponsePayload {
  subject: string;
  emailBody: string;
  socialDm: string;
  evidenceUsed: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prospect = body?.prospect as Prospect | undefined;
    const profile = body?.profile as AgencyProfile | undefined;
    const tone: OutreachTone =
      body?.tone === 'direct_helpful' || body?.tone === 'short_dm'
        ? body.tone
        : 'audit_first';

    if (!prospect?.companyName || !profile?.serviceLabel) {
      return NextResponse.json(
        { error: 'Prospect details and agency profile are required.' },
        { status: 400 }
      );
    }

    const auditSummary = prospect.audit
      ? {
          reachable: prospect.audit.reachable,
          httpStatus: prospect.audit.httpStatus,
          httpsValid: prospect.audit.httpsValid,
          responseMs: prospect.audit.responseMs,
          hasMobileViewport: prospect.audit.hasMobileViewport,
          hasMetaDescription: prospect.audit.hasMetaDescription,
          copyrightYear: prospect.audit.copyrightYear,
          hasContactForm: prospect.audit.hasContactForm,
          brokenInternalLinks: prospect.audit.brokenInternalLinks,
          mxVerified: prospect.audit.mxVerified,
          mxProvider: prospect.audit.mxProvider,
          detectedIssues: prospect.audit.issues.map((i) => ({
            title: i.title,
            evidence: i.evidence,
          })),
        }
      : {
          note: 'Live audit has not been run yet; reference only verified business details.',
        };

    const toneGuidance: Record<OutreachTone, string> = {
      audit_first:
        'Lead immediately with the sharpest objective technical issue verified on their live website, explain the practical impact in plain English, and offer to send a short Loom/screenshot fix.',
      direct_helpful:
        'Warm, peer-to-peer founder tone. Keep it concise, transparent about beginner-friendly pricing only if relevant, and zero corporate jargon.',
      short_dm:
        'Ultra-short, punchy, conversational messages designed for busy local business owners reading on their phone.',
    };

    const prompt = `You are an elite B2B copywriter specializing in high-reply, evidence-based outreach for solo founders and small agencies.

SENDER PROFILE:
- Name: ${profile.senderName || 'Alex'}
- Agency: ${profile.agencyName || 'Independent Studio'}
- Service Offered: ${profile.serviceLabel}
- Realistic Beginner Price Range: ${profile.starterPrice}

PROSPECT RECORD:
- Company: ${prospect.companyName}
- Website: ${prospect.website}
- Location: ${prospect.location}
- Industry: ${prospect.industry}
- Decision Maker: ${prospect.decisionMakerName} (${prospect.decisionMakerRole})
- Found Via: ${prospect.sourceChannel}
- Context: ${prospect.whyGoodFit}

LIVE OBJECTIVE AUDIT EVIDENCE:
${JSON.stringify(auditSummary, null, 2)}

TONE INSTRUCTION:
${toneGuidance[tone]}

STRICT COPYWRITING RULES:
1. NEVER fabricate issues that are not in the LIVE OBJECTIVE AUDIT EVIDENCE above. Only cite verified facts.
2. Email body MUST be under 95 words, plain text, no bullet spam, no hype words ("synergy", "10x", "skyrocket", "I hope this email finds you well").
3. Subject line must be 3–6 words, natural and low-key (e.g., "${prospect.companyName} mobile site note").
4. Social DM (for LinkedIn / Instagram / Facebook direct message) MUST be under 45 words, conversational, referencing one concrete observation and asking a low-friction question.
5. Sign off with ${profile.senderName || 'Alex'}${profile.agencyName ? ` — ${profile.agencyName}` : ''}.`;

    const response = await generateContentWithRetry({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: 'Plain 3 to 6 word email subject line.',
            },
            emailBody: {
              type: Type.STRING,
              description: 'Concise evidence-backed email body under 95 words.',
            },
            socialDm: {
              type: Type.STRING,
              description: 'Direct social media message under 45 words for LinkedIn or Instagram.',
            },
            evidenceUsed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of exact verified facts cited in the copy.',
            },
          },
          required: ['subject', 'emailBody', 'socialDm', 'evidenceUsed'],
        },
      },
    });

    const text = response.text ?? '';
    const parsed = extractJsonFromText<DraftResponsePayload>(text);

    return NextResponse.json({
      draft: {
        tone,
        subject: parsed.subject,
        emailBody: parsed.emailBody,
        socialDm: parsed.socialDm,
        evidenceUsed: Array.isArray(parsed.evidenceUsed) ? parsed.evidenceUsed : [],
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: formatGeminiError(
          err,
          'Failed to generate personalized outreach copy.'
        ),
      },
      { status: 500 }
    );
  }
}
