import type { ReactNode } from "react";
import Link from "next/link";
import { LEGAL_UPDATED } from "@/lib/legal.ts";
import { cn } from "@/lib/utils.ts";
import { NURMA, OUTER, SANS } from "@/views/seller/_lib/profile-design.tsx";

/** Shared layout for the legal pages: a title, the date, and readable sections. */
export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="profile-design bg-[#0C0F15]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className={cn(OUTER, "p-6 sm:p-8")}>
          <h1 className={cn(NURMA, "text-[34px] leading-tight text-white")}>{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
          {intro && <p className={cn(SANS, "mt-5 text-[15px] leading-7 text-white")}>{intro}</p>}
          <div className={cn(SANS, "mt-6 flex flex-col gap-6 text-[15px] leading-7 text-[#e4e4e6]")}>{children}</div>
          <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-sm">
            <Link href="/terms" className="text-[#7b3aec] hover:underline">Terms</Link>
            <Link href="/privacy" className="text-[#7b3aec] hover:underline">Privacy</Link>
            <Link href="/content-policy" className="text-[#7b3aec] hover:underline">Content policy</Link>
            <Link href="/copyright" className="text-[#7b3aec] hover:underline">Copyright</Link>
            <Link href="/report" className="text-[#7b3aec] hover:underline">Report content</Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl text-white">{title}</h2>
      {children}
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-[#7b3aec]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
