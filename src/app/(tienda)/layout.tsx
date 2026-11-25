import { CartProvider } from "@/components/store/cart/cart-context";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { WhatsappButton } from "@/components/store/whatsapp-button";
import { getSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <CartProvider>
      {settings.constructionBanner && (
        <div className="bg-amber-400 px-4 py-1.5 text-center text-sm font-medium text-amber-950">
          🚧 Web en construcción: estamos terminando la tienda y algunas cosas pueden cambiar.
        </div>
      )}
      <StoreHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <StoreFooter />
      {settings.whatsappButton && <WhatsappButton />}
    </CartProvider>
  );
}
