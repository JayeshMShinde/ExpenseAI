import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans'; // Corrected import name
import './globals.css';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'ExpenseAI',
  description: 'Track your expenses intelligently.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> {/* Add suppressHydrationWarning */}
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          GeistSans.variable // Use the corrected variable name
        )}
       >
        {children}
      </body>
    </html>
  );
}
