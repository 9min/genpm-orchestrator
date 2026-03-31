import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "SceneForge",
  description: "AI video pipeline orchestrator — script to scenes, visualized as a DAG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
