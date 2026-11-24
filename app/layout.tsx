import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aperture — Automated Lead Discovery, Evidence Audit & Outreach Studio',
  description:
    'Zero-cost B2B client acquisition workspace with live US directory discovery, real website & DNS/MX evidence verification, tailored outreach copywriting, and downloadable Antigravity Skill export.',
  openGraph: {
    title: 'Aperture — Automated Lead Discovery, Evidence Audit & Outreach Studio',
    description:
      'Discover real US businesses from overlooked public directories, verify domains and website issues with objective evidence, and export a ready-to-use Antigravity Skill.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aperture — Automated Lead Discovery, Evidence Audit & Outreach Studio',
    description:
      'Discover real US businesses, verify MX records and live site issues, and generate evidence-backed outreach.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-white text-[#1D1D1F] font-sans antialiased selection:bg-[#0071E3]/15 selection:text-[#1D1D1F]"
      >
        {children}
      </body>
    </html>
  );
}
