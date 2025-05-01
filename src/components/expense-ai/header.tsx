import { Banknote } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <a
          href="#"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <Banknote className="h-6 w-6 text-primary" />
          <span className="font-bold">ExpenseAI</span>
        </a>
      </nav>
      {/* Add User Profile/Auth section here if needed later */}
    </header>
  );
}
