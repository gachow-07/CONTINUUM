import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CONTINUUM", template: "%s · CONTINUUM" },
  description: "An engineering workspace that preserves the knowledge behind engineering projects — what was built, and why.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { fontSize: 13, background: "rgb(17 23 34 / 0.92)", border: "1px solid #2b3649", backdropFilter: "blur(12px)", boxShadow: "0 14px 34px -10px rgb(0 0 0 / 0.6)" } }} />
      </body>
    </html>
  );
}
