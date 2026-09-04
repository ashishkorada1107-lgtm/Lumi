import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumi — Personal Scheduling",
  description: "Personal schedule, tasks, activities and daily companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lumi"
  }
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
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden bg-zinc-950">
          <div className="w-full flex-none md:w-56">
            <Navigation />
          </div>
          <div className="flex-grow p-4 md:p-7 overflow-y-auto w-full pb-24 md:pb-7">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
