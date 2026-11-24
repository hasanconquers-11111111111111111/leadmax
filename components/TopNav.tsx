'use client';

import type { ActiveWorkspaceView } from '@/lib/types';

interface TopNavProps {
  activeView: ActiveWorkspaceView;
  onSelectView: (view: ActiveWorkspaceView) => void;
  onStartNewSearch: () => void;
  prospectCount: number;
}

const NAV_ITEMS: { id: ActiveWorkspaceView; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'workbench', label: 'Workbench' },
  { id: 'skill', label: 'Skill Export' },
  { id: 'reality', label: 'Reality Brief' },
];

export default function TopNav({
  activeView,
  onSelectView,
  onStartNewSearch,
  prospectCount,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 h-15 border-b border-[#E5E5EA] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-8 px-6">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectView(prospectCount > 0 ? 'workbench' : 'setup')}
          className="font-display text-lg font-semibold tracking-tight text-[#1D1D1F] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] rounded"
        >
          Aperture
        </button>

        {/* Zone 2: Four concise single-line navigation links */}
        <nav
          aria-label="Primary"
          className="flex items-center gap-6 overflow-x-auto text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-4 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                  isActive
                    ? 'text-[#1D1D1F] font-semibold'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[#1D1D1F]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartNewSearch}
            className="rounded-lg bg-[#0071E3] px-4 py-2 text-xs font-medium text-white transition-colors duration-150 hover:bg-[#0077ED] active:bg-[#0062C4] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2"
          >
            New Search
          </button>
        </div>
      </div>
    </header>
  );
}
