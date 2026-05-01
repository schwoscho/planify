import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Planify — Your nutrition & fitness companion',
  description: 'AI-powered meal planning, calorie tracking, and nutrition coaching',
  manifest: '/manifest.json',
  themeColor: '#2D6A4F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Planify" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('planify-theme');
                if (theme) {
                  document.documentElement.setAttribute('data-theme', theme);
                } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}