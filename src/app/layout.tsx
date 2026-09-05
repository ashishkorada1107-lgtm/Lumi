import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { GlobalSwipe } from "@/components/GlobalSwipe";
import { OfflineStatus } from "@/components/OfflineStatus";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DailyFlow — Personal Scheduling",
  description: "Personal schedule, tasks, activities and daily companion.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DailyFlow"
  },
};

export const viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={geist.className}>
        <ServiceWorkerRegister />
        <OfflineStatus />
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden bg-zinc-950">
          <div className="w-full flex-none md:w-56">
            <Navigation />
          </div>
          <GlobalSwipe>
            <div className="flex-grow md:p-7 overflow-y-auto overflow-x-hidden w-full h-full pb-24 md:pb-7">
              <div className="p-4 pt-16 md:p-0 min-h-full">
                {children}
              </div>
            </div>
          </GlobalSwipe>
        </div>
      </body>
    </html>
  );
}
