import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-16 text-center sm:px-6">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary"><SearchX size={30} /></span>
        <p className="mt-7 font-mono text-[10px] uppercase tracking-[.2em] text-accent">A quiet corner</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">That page wandered off.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">The link may be old, or the thing you are looking for has not made it to the shelf yet.</p>
        <Link href="/" data-testid="link-not-found-home" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold text-primary-foreground hover:brightness-110"><ArrowLeft size={15} /> Back to Gulani</Link>
      </div>
    </div>
  );
}
