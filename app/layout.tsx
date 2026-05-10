import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Planify — Your AI nutrition & meal planning companion',
  description: 'AI-powered meal planning, calorie tracking, grocery lists, and personal nutrition coaching.',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Planify" />
        <meta name="theme-color" content="#2D6A4F" />
        <link rel="apple-touch-icon" href="/images/icon.png" />
        <link rel="icon" type="image/png" href="/images/icon.png" />
        {/* Tabler Icons — required for all UI icons */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.30.0/tabler-icons.min.css"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('planify-theme');var p=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t||p)}catch(e){}})()`
        }}/>
      </head>
      <body>{children}</body>
    </html>
  )
}