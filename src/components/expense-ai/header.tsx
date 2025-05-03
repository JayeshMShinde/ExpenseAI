import type { CurrencyCode } from '@/app/page'; // Import CurrencyCode type
import { Banknote, IndianRupee, DollarSign } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export function Header({ selectedCurrency, onCurrencyChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      {/* Left Section: App Name */}
      <div className="flex items-center gap-2">
        <Banknote className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">ExpenseAI</span>
      </div>

      {/* Right Section: Currency Selector */}
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-20 justify-start">
              {selectedCurrency === 'INR' ? (
                <IndianRupee className="mr-2 h-4 w-4" />
              ) : (
                <DollarSign className="mr-2 h-4 w-4" />
              )}
              {selectedCurrency}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuLabel>Select Currency</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={selectedCurrency} onValueChange={(value) => onCurrencyChange(value as CurrencyCode)}>
              <DropdownMenuRadioItem value="INR">
                <IndianRupee className="mr-2 h-4 w-4" />
                INR (₹) - Indian Rupee
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="USD">
                <DollarSign className="mr-2 h-4 w-4" />
                USD ($) - US Dollar
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
