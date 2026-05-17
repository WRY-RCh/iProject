import './globals.css';
import Navbar from '@/components/Navbar';
import { toast, Toaster } from 'sonner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Prompt:wght@300;400;500;600&display=swap" 
          rel="stylesheet" 
        />
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
        />
      </head>
      <body className="no-scrollbar" style={{ overflowY: 'auto', height: '400px' }}>
        <Navbar />
        {children}

        <footer className="footer-register">
        &copy; 2026 iProject Management System. Built for Vision to Reality.
      </footer>

      <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}