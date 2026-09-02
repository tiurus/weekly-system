import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: "Weekly System",
  description:
    "Спокойная система недели, которая подстраивается под твой ресурс.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Weekly System",
    description: "Нагрузка следует за ресурсом.",
    images: [
      {
        url: "/og.png",
        width: 1680,
        height: 945,
        alt: "Weekly System — нагрузка следует за ресурсом",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Weekly System",
    description: "Нагрузка следует за ресурсом.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
