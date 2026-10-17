import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar — Panel Magos del Sur" };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <Image
        src="/logo.png"
        alt="Magos del Sur"
        width={1200}
        height={812}
        className="h-auto w-48"
        priority
      />
      <LoginForm />
    </main>
  );
}
