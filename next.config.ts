import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de productos en Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Las fotos se achican en el navegador antes de subirse; esto es un margen
      // por si el navegador no pudo procesarlas. Vercel corta en 4.5 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
