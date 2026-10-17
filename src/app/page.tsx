import Image from "next/image";

// Página provisoria hasta que esté la tienda (Etapa 2).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <Image
        src="/logo.png"
        alt="Magos del Sur"
        width={1200}
        height={812}
        priority
        className="h-auto w-full max-w-md"
      />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-primary">Próximamente</h1>
        <p className="text-muted-foreground">
          Juegos de mesa, Magic y Pokémon en Quilmes Centro.
        </p>
      </div>
    </main>
  );
}
