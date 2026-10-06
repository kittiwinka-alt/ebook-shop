import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// สร้าง Supabase Client สำหรับดึงข้อมูลใน Server Component
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ฟังก์ชันดึง Metadata และ Favicon จาก Database อัตโนมัติ
export async function generateMetadata(): Promise<Metadata> {
  try {
    const { data: settings } = await supabase
      .from("site_settings")
      .select("store_name, store_subtitle, logo_url")
      .eq("id", "default")
      .maybeSingle();

    const storeTitle = settings?.store_name || "Win's Dev Store";
    const storeDesc = settings?.store_subtitle || "DIGITAL ASSETS & E-BOOKS";
    // ถ้ามี URL ในดาต้าเบสให้ใช้ค่านั้น ถ้าไม่มีให้ fallback ไปที่ /logo.png
    const logoUrl = settings?.logo_url || "/logo.png";

    return {
      title: storeTitle,
      description: storeDesc,
      icons: {
        icon: logoUrl,
        shortcut: logoUrl,
        apple: logoUrl,
      },
    };
  } catch (error) {
    return {
      title: "Win's Dev Store",
      description: "DIGITAL ASSETS & E-BOOKS",
      icons: {
        icon: "/logo.png",
      },
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ดึง logo_url มาใส่ในแท็ก <link> เพื่อป้องกันบราวเซอร์บางตัวไม่อัปเดต
  let currentLogo = "/logo.png";
  try {
    const { data: settings } = await supabase
      .from("site_settings")
      .select("logo_url")
      .eq("id", "default")
      .maybeSingle();
    if (settings?.logo_url) {
      currentLogo = settings.logo_url;
    }
  } catch (_) {}

  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href={currentLogo} />
        <link rel="shortcut icon" href={currentLogo} />
        <link rel="apple-touch-icon" href={currentLogo} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}