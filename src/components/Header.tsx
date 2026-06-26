import { Link } from '@tanstack/react-router';
import { Building2, FileText, LineChart, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function AcreOsMark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="3" width="26" height="26" rx="7" fill="var(--brand)" />
        <path
          d="M16 8l7 16h-3.4l-1.2-3h-4.8l-1.2 3H9l7-16Zm0 5.6L14.3 18h3.4L16 13.6Z"
          fill="#fff"
        />
      </svg>
      <span className="font-serif text-2xl font-semibold tracking-tight text-(--ink)">AcreOS</span>
    </span>
  );
}

const PLATFORM = [
  { label: 'Sourcing agent', desc: 'Find and triage every deal', icon: Building2 },
  { label: 'Diligence agent', desc: 'Underwriting and valuation', icon: LineChart },
  { label: 'Execution agent', desc: 'Negotiation to close', icon: Sparkles },
  { label: 'Asset agent', desc: 'Manage and report', icon: FileText },
];

function PlatformDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="nav-trigger"
        data-open={open}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        Platform
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6l4 4 4-4"
          />
        </svg>
      </button>

      {open && (
        <div className="nav-menu rise-in w-[19rem]" role="menu">
          {PLATFORM.map((item) => (
            <a key={item.label} href="#platform" role="menuitem" onClick={() => setOpen(false)}>
              <span className="nav-menu-icon">
                <item.icon className="size-[1.05rem]" />
              </span>
              <span className="nav-menu-text">
                <span className="nav-menu-title">{item.label}</span>
                <span className="nav-menu-desc">{item.desc}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--paper)/80 backdrop-blur-md">
      <nav className="page-wrap flex items-center gap-6 py-4">
        <Link to="/" aria-label="AcreOS home">
          <AcreOsMark />
        </Link>

        <div className="ml-2 hidden items-center gap-6 md:flex">
          <PlatformDropdown />
          <a href="#how-it-works" className="nav-link">
            How it works
          </a>
          <a href="#manifesto" className="nav-link">
            Company
          </a>
        </div>

        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <Link to="/login" className="btn-login hidden sm:inline-flex">
            Log in
          </Link>
          <Link to="/login" className="btn-brand px-4 py-2 text-sm">
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
