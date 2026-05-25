"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type PageNavLink = {
  href: string;
  label: string;
};

const PAGE_NAV_LINKS: PageNavLink[] = [
  { href: "/", label: "Investigation dashboard" },
  { href: "/pubmat", label: "Pubmat table" },
  { href: "/config", label: "Metric config" },
  { href: "/architecture", label: "Architecture" },
  { href: "/debug/ai-context", label: "AI context viewer" },
];

type PageShellProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

export function PageShell({ eyebrow, title, description, children }: PageShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#f4f6f3] px-5 py-6 text-[#18211d]">
      <div className="mx-auto max-w-375">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#537062]">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
            {/* {description ? <div className="mt-2 max-w-3xl text-sm leading-6 text-[#526258]">{description}</div> : null} */}
          </div>

          <nav className="flex flex-wrap gap-2 text-sm">
            {PAGE_NAV_LINKS.map((link) => (
              <Link
                aria-current={isActiveLink(pathname, link.href) ? "page" : undefined}
                className={isActiveLink(pathname, link.href) ? "nav-pill nav-pill-active" : "nav-pill"}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {children}
      </div>
    </main>
  );
}

function isActiveLink(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}
