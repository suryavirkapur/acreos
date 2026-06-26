import { Link } from '@tanstack/react-router';

export default function Footer() {
  const year = new Date().getFullYear();

  const columns: Array<{ title: string; links: string[] }> = [
    { title: 'Platform', links: ['Sourcing', 'Diligence', 'Execution', 'Asset management'] },
    { title: 'Company', links: ['About', 'Careers', 'Blog', 'Press'] },
    { title: 'Resources', links: ['Docs', 'Security', 'Status', 'Contact'] },
  ];

  return (
    <footer className="border-t border-(--line) bg-(--paper-soft)/60">
      <div className="page-wrap grid gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="font-serif text-2xl font-semibold tracking-tight text-(--ink)">
            AcreOS
          </span>
          <p className="mt-3 max-w-xs text-sm text-(--ink-soft)">
            AI-native property investment. Agents carry the operational weight, end to end.
          </p>
          <Link to="/login" className="btn-brand mt-5 px-4 py-2 text-sm">
            Get started
          </Link>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="island-kicker mb-3 text-(--ink-faint)">{col.title}</p>
            <ul className="m-0 list-none space-y-2 p-0">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm text-(--ink-soft) transition hover:text-(--ink)"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-(--line)">
        <div className="page-wrap flex flex-col items-center justify-between gap-3 px-4 py-6 text-center text-sm text-(--ink-faint) sm:flex-row sm:text-left">
          <p className="m-0">&copy; {year} AcreOS, Inc. All rights reserved.</p>
          <p className="m-0">Built for investors, run by agents.</p>
        </div>
      </div>
    </footer>
  );
}
