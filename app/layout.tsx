import type { Metadata } from "next";
import { Manrope, Martian_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Manrope for all text; Martian Mono for part numbers, file names, figures and small uppercase labels.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const martianMono = Martian_Mono({ variable: "--font-martian-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "CONTINUUM", template: "%s · CONTINUUM" },
  description: "An engineering workspace that preserves the knowledge behind engineering projects — what was built, and why.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${martianMono.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-right" toastOptions={{ style: { fontSize: 13 } }} />
      </body>
    </html>
  );
}
