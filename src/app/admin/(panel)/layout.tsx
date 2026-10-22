import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { count, inArray } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { NEEDS_ATTENTION } from "@/lib/order-rules";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Panel — Magos del Sur" };

const NAV = [
  { href: "/admin/mostrador", label: "Mostrador" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(orders)
    .where(inArray(orders.status, NEEDS_ATTENTION));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Magos del Sur"
              width={1200}
              height={812}
              className="h-9 w-auto"
            />
            <span className="text-sm font-medium text-muted-foreground">
              Panel
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={buttonVariants({ variant: "ghost" })}
              >
                {item.label}
                {item.href === "/admin/pedidos" && pending > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                    {pending}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {admin.email}
            </span>
            <Link
              href="/"
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Ver tienda
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
