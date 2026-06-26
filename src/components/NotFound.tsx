import { Link } from '@tanstack/react-router';

export default function NotFound() {
  return (
    <main className="page-wrap flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center">
      <p className="island-kicker text-(--ink-faint)">Error 404</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-(--ink) sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-sm text-(--ink-soft)">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn-brand px-5 py-2.5 text-sm">
          Back home
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-full border border-(--line) px-5 py-2.5 text-sm text-(--ink-soft) transition hover:text-(--ink)"
        >
          Go back
        </button>
      </div>
    </main>
  );
}
