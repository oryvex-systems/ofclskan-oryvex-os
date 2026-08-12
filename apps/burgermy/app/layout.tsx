import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BURGERMY",
  description: "BURGERMY burger, menü ve çıtır lezzet sipariş uygulaması",
  applicationName: "BURGERMY",
  appleWebApp: { capable: true, title: "BURGERMY", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const basePath = process.env.NEXT_PUBLIC_BURGERMY_BASE_PATH || "";
  return <html lang="tr"><body><script src={`${basePath}/runtime-api-bridge.js`} />{children}</body></html>;
}
