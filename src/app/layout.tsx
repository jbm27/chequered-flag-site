import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import BackToTop from "../components/BackToTop";
import type { Metadata } from "next";

// Default page title and description. Each page sets its own title, shown as "Page | The Chequered Flag".
export const metadata: Metadata = {
  metadataBase: new URL("https://www.thechequeredflag.net"),
  title: {
    default: "The Chequered Flag | Workshop, fabrication and vehicle hire in Karen, Nairobi",
    template: "%s | The Chequered Flag",
  },
  description:
    "Vehicle workshop, fabrication and self-drive vehicle hire on Ngong Road, Karen, Nairobi. Established 1975.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">
        <SiteHeader />
        {children}
        <SiteFooter />
        <BackToTop />
      </body>
    </html>
  );
}
