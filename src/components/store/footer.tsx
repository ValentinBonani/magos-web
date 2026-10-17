import Link from "next/link";
import { instagramUrl, mapsUrl, SITE, whatsappUrl } from "@/lib/site";
import { NAV_LINKS } from "./nav";

export function StoreFooter() {
  return (
    <footer className="mt-16 bg-[var(--brand-black)] text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-white">{SITE.name}</p>
          <p className="text-sm">{SITE.tagline}.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Visitanos</p>
          <p>
            <a href={mapsUrl} target="_blank" rel="noopener" className="hover:text-white">
              {SITE.address}, {SITE.city}
            </a>
          </p>
          {SITE.hours.map((h) => (
            <p key={h}>{h}</p>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Contacto</p>
          <p>
            <a href={whatsappUrl()} target="_blank" rel="noopener" className="hover:text-white">
              WhatsApp: {SITE.whatsappDisplay}
            </a>
          </p>
          <p>
            <a href={instagramUrl} target="_blank" rel="noopener" className="hover:text-white">
              Instagram: @{SITE.instagram}
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-1 px-4 py-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          <Link href="/mi-pedido" className="hover:text-white">
            Mi pedido
          </Link>
          <span className="ml-auto text-white/50">© {new Date().getFullYear()} {SITE.name}</span>
        </nav>
      </div>
    </footer>
  );
}
