import type { Metadata } from "next";
import { Geist, Geist_Mono, Inika } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inika = Inika({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-inika",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StolTaom",
  description: "Stol bron qilish va taom buyurtma qilish xizmati",
  icons: "/favicon.ico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Layout forces dark mode at the <html> level. Legacy env flags like
  // DEFAULT_THEME and ENABLE_DARK_MODE are intentionally unused.

  // Do not force dark class here — let ThemeProvider apply dark/light client-side.
  // Server renders with suppressHydrationWarning to allow client to manage the class.
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inika.className} ${inika.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {process.env.NODE_ENV !== "production" ? (
            <Script id="strip-ext-attrs" strategy="beforeInteractive">
              {`
              (function () {
                try {
                  var ATTR_EXACT = ["bis_skin_checked", "bis_register"];
                  var ATTR_PREFIX = ["bis_", "__processed", "__pending", "__generated"];
                  function shouldRemove(name){
                    if (!name) return false;
                    if (ATTR_EXACT.indexOf(name) !== -1) return true;
                    for (var i=0;i<ATTR_PREFIX.length;i++){ if (name.indexOf(ATTR_PREFIX[i]) === 0) return true; }
                    return false;
                  }
                  function clean(el){
                    if (!el || !el.getAttributeNames) return;
                    var names = el.getAttributeNames();
                    for (var i=0;i<names.length;i++){
                      if (shouldRemove(names[i])) try { el.removeAttribute(names[i]); } catch(e) {}
                    }
                    var c = el.children || [];
                    for (var j=0;j<c.length;j++) clean(c[j]);
                  }
                  function sweep(){ clean(document.documentElement); }
                  // Initial sweep ASAP
                  sweep();
                  // Observe continuously in dev to strip late injections
                  var mo = new MutationObserver(function(mutations){
                    for (var k=0;k<mutations.length;k++){
                      var m = mutations[k];
                      if (m.type === 'attributes' && shouldRemove(m.attributeName)) {
                        try { m.target.removeAttribute(m.attributeName); } catch(e) {}
                      }
                      if (m.type === 'childList') {
                        for (var n=0;n<(m.addedNodes||[]).length;n++) clean(m.addedNodes[n]);
                      }
                    }
                  });
                  mo.observe(document.documentElement, { attributes: true, attributeFilter: null, subtree: true, childList: true });
                  // Periodic sweeps
                  setInterval(sweep, 1000);
                } catch(_) {}
              })();
            `}
            </Script>
          ) : null}
          {process.env.NODE_ENV !== "production" ? (
            <Script
              id="silence-hydration-warnings"
              strategy="beforeInteractive"
            >
              {`
              (function(){
                try {
                  var origError = console.error;
                  var origWarn = console.warn;
                  var BLOCK = [
                    'A tree hydrated but some attributes of the server rendered HTML',
                    'Text content does not match server-rendered HTML',
                    'Expected server HTML to contain a matching',
                    'Hydration failed because the initial UI does not match',
                    'There was an error while hydrating',
                  ];
                  function shouldBlock(args){
                    var s = Array.prototype.join.call(args, ' ');
                    for (var i=0;i<BLOCK.length;i++){ if (s.indexOf(BLOCK[i]) !== -1) return true; }
                    return false;
                  }
                  console.error = function(){ if (!shouldBlock(arguments)) return origError.apply(console, arguments); };
                  console.warn = function(){ if (!shouldBlock(arguments)) return origWarn.apply(console, arguments); };
                } catch(_) {}
              })();
            `}
            </Script>
          ) : null}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
