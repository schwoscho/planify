import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Planify — Your AI nutrition & meal planning companion',
  description: 'AI-powered meal planning, calorie tracking, grocery lists, and personal nutrition coaching. Hit your health goals with Planify.',
  manifest: '/manifest.json',
  themeColor: '#2D6A4F',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Planify',
  },
  openGraph: {
    title: 'Planify — Your AI nutrition companion',
    description: 'AI-powered meal planning, calorie tracking, and nutrition coaching.',
    type: 'website',
    images: [{ url: '/images/og.png', width: 1200, height: 630 }],
  },
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
        <link rel="apple-touch-icon" href="/images/icon.png" />
        <link rel="icon" type="image/png" href="/images/icon.png" />
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