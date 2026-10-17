import { CartProvider } from "@/components/store/cart/cart-context";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { WhatsappButton } from "@/components/store/whatsapp-button";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <StoreHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <StoreFooter />
      <WhatsappButton />
    </CartProvider>
  );
}
