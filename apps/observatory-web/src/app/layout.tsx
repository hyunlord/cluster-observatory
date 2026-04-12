import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cluster Observatory",
  description: "GKE resource dashboard for cluster capacity, node utilization, namespace usage, and GPU visibility."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
