'use client';

import type { CurrencyCode } from '@/app/page';
import { Banknote, IndianRupee, DollarSign, Moon, Sun } from 'lucide-react';
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
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

interface HeaderProps {
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export function Header({ selectedCurrency, onCurrencyChange }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure hydration mismatch doesn't occur
  useEffect(() => {
    setMounted(true);
  }, []);

  // Theme toggle handler
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 md:px-6 backdrop-blur-sm transition-all">
      {/* Left Section: App Name with enhanced styling */}
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 p-2 rounded-full">
          <Banknote className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg gradient-text">ExpenseAI</span>
          <span className="text-xs text-muted-foreground hidden sm:inline-block">Smart Financial Insights</span>
        </div>
      </div>

      {/* Right Section: Theme Toggle and Currency Selector */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle - Only render after client-side hydration */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="mr-2"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}

        {/* Currency Selector with enhanced styling */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-20 justify-start hover-lift"
            >
              {selectedCurrency === 'INR' ? (
                <IndianRupee className="mr-2 h-4 w-4 text-primary" />
              ) : (
                <DollarSign className="mr-2 h-4 w-4 text-primary" />
              )}
              {selectedCurrency}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuLabel>Select Currency</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={selectedCurrency} onValueChange={(value) => onCurrencyChange(value as CurrencyCode)}>
              <DropdownMenuRadioItem value="INR" className="cursor-pointer">
                <IndianRupee className="mr-2 h-4 w-4" />
                INR (₹) - Indian Rupee
              </DropdownMenuRadioItem>
              {/* <DropdownMenuRadioItem value="USD" className="cursor-pointer">
                <DollarSign className="mr-2 h-4 w-4" />
                USD ($) - US Dollar
              </DropdownMenuRadioItem> */}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}