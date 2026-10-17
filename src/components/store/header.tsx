import Image from "next/image";
import Link from "next/link";
import { CartButton } from "./cart/cart-button";
import { DesktopNav, MobileNav } from "./main-nav";
import { SearchBox } from "./search-box";

export function StoreHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <MobileNav />
        <Link href="/" className="shrink-0" aria-label="Magos del Sur — Inicio">
          <Image
            src="/logo.png"
            alt="Magos del Sur"
            width={1200}
            height={812}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <DesktopNav />
        {/* Celular: carrito a la derecha del logo. Escritorio: después del buscador. */}
        <div className="ml-auto flex items-center sm:order-last sm:ml-0">
          <CartButton />
        </div>
        <SearchBox className="order-last w-full sm:order-none sm:ml-auto sm:w-64" />
      </div>
    </header>
  );
}
