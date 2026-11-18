import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import BackToTop from "../components/BackToTop";
import type { Metadata } from "next";
import { CONTACT } from "../lib/contact";

// Default page title and description. Each page sets its own title, shown as "Page | The Chequered Flag".
export const metadata: Metadata = {
  metadataBase: new URL("https://www.thechequeredflag.net"),
  title: {
    default: "The Chequered Flag | Workshop, fabrication and vehicle hire in Karen, Nairobi",
    template: "%s | The Chequered Flag",
  },
  description:
    "Vehicle workshop, fabrication and self-drive vehicle hire on Ngong Road, Karen, Nairobi. Established 1975.",
  // The tab icon, Google's search result icon and the iPhone home screen icon come from src/app/favicon.ico,
  // icon.png and apple-icon.png (Next.js adds the <link> tags). This names the site when shared.
  openGraph: { siteName: "The Chequered Flag", type: "website", images: ["/images/brand/logo-square-512.png"] },
};

// Tells Google the site's name and logo (structured data). Google decides when to show them.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: "The Chequered Flag", alternateName: "Chequered Flag", url: "https://www.thechequeredflag.net/" },
    {
      "@type": "Organization",
      name: "The Chequered Flag",
      url: "https://www.thechequeredflag.net/",
      logo: "https://www.thechequeredflag.net/images/brand/logo-square-512.png",
      telephone: CONTACT.phoneDisplay,
      email: CONTACT.email,
      foundingDate: "1975",
      address: { "@type": "PostalAddress", streetAddress: "Ngong Road", addressLocality: "Karen, Nairobi", addressCountry: "KE" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        <SiteHeader />
        {children}
        <SiteFooter />
        <BackToTop />
      </body>
    </html>
  );
}
