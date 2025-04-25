// app/layout.js
import { Poppins } from 'next/font/google';
import './globals.css';
import ClientBoundary from '@/components/ClientBoundary';

// Configure Poppins font outside component
const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata = {
  title: 'AkcherStock Dashboard',
  description: 'Gestion des catégories et produits',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    shortcut: '/favicon.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' }
    ]
  },
  manifest: '/manifest.json'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={poppins.className}>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.png?v=2" type="image/png" />
      </head>
      
      <ClientBoundary>
        <body suppressHydrationWarning className="antialiased">
          {children}
        </body>
      </ClientBoundary>
    </html>
  );
}