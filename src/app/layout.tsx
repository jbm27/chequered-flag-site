import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { CONTACT } from "../lib/contact";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const waHref = `https://wa.me/${CONTACT.whatsappE164.replace("+", "")}`;

  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">
        <SiteHeader />
        {children}
        <SiteFooter />

        {/* Floating WhatsApp */}
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-medium shadow-sm hover:border-neutral-300"
          aria-label="WhatsApp Chequered Flag"
          title="WhatsApp Chequered Flag"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden />
          WhatsApp
        </a>
      </body>
    </html>
  );
}
