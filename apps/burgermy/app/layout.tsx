import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BURGERMY V1",
  description: "BURGERMY paket fast-food sipariş uygulaması",
  other: { "oryvex-app": "burgermy", "oryvex-version": "1" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
