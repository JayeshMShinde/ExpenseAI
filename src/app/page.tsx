'use client';

import { useState, useTransition, useMemo } from 'react';
import { Header } from '@/components/expense-ai/header';
import { FileUpload } from '@/components/expense-ai/file-upload';
import { TransactionTable } from '@/components/expense-ai/transaction-table';
import { ExpenseDashboard } from '@/components/expense-ai/expense-dashboard';
import { categorizeTransactions } from '@/ai/flows/categorize-transactions';
import type { Transaction, CategorizedTransaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Calendar as CalendarIcon } from 'lucide-react';
import { getMonth, getYear, parseISO, format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';


export type CurrencyCode = 'INR' | 'USD';

const ALL_MONTHS_VALUE = "all"; // Constant for the "All Months" option

export default function Home() {
  const [transactions, setTransactions] = useState<CategorizedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false); // General loading (file parsing + initial AI)
  const [isCategorizing, startCategorizing] = useTransition(); // Transition for AI categorization specifically
  const [isUpdatingCategory, startUpdatingCategory] = useTransition(); // Transition for manual update
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set()); // Track individual category loading
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR'); // State for currency
  const [availableMonths, setAvailableMonths] = useState<string[]>([]); // e.g., ["2024-07", "2024-08"]
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS_VALUE); // Default to "All Months"
  const { toast } = useToast();

  // Calculate available months from transactions
  const calculateAvailableMonths = (txs: Transaction[]): string[] => {
    if (txs.length === 0) return [];

    const uniqueMonths = new Set<string>();
    txs.forEach(tx => {
      try {
        const date = parseISO(tx.date);
        const monthYear = format(date, 'yyyy-MM'); // Format as YYYY-MM for sorting
        uniqueMonths.add(monthYear);
      } catch (e) {
        console.error(`Invalid date format for transaction: ${tx.description}`, e);
      }
    });

    // Sort months chronologically (descending - newest first)
    return Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
  };

  const handleTransactionsParsed = async (parsedTransactions: Transaction[]) => {
    // Ensure unique IDs are generated robustly
    const transactionsWithIds = parsedTransactions.map((tx, index) => ({
        ...tx,
        category: null, // Initialize category as null
        // Use a more robust ID generation strategy
        id: tx.id || `tx-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`,
    }));

    setTransactions(transactionsWithIds);
    setIsLoading(true); // Indicate overall process started (parsing done, AI starting)

    // Calculate and set available months
    const months = calculateAvailableMonths(transactionsWithIds);
    setAvailableMonths(months);
    // Default to "All Months" or the latest month if available
    setSelectedMonth(months.length > 0 ? ALL_MONTHS_VALUE : ALL_MONTHS_VALUE);

    if (transactionsWithIds.length > 0) {
      const idsToCategorize = new Set(transactionsWithIds.map(tx => tx.id));
      setLoadingCategories(prev => new Set([...prev, ...idsToCategorize]));

      startCategorizing(async () => {
        try {
          // Prepare data for AI (remove ID if the flow doesn't expect it)
          const transactionsForAI = transactionsWithIds.map(({ id, category, ...rest }) => rest); // Exclude id and initial null category
          const categorizedResult = await categorizeTransactions(transactionsForAI);

          // Match results back using description, date, amount
          setTransactions(prev =>
            prev.map(tx => {
              // Find the matching categorized transaction from AI result
              const categorized = categorizedResult.find(ctx =>
                ctx.description === tx.description &&
                ctx.date === tx.date && // Ensure date format matches if necessary
                ctx.amount === tx.amount
                // Add more matching criteria if needed for robustness
              );
               // Return the original transaction merged with the category if found, otherwise return original
              return categorized ? { ...tx, category: categorized.category } : tx;
            })
          );
          toast({
             title: 'AI Categorization Complete',
             description: 'Transactions have been categorized.',
          });
        } catch (error) {
          console.error('Error categorizing transactions:', error);
          toast({
            title: 'Categorization Error',
            description: 'AI failed to categorize transactions. Please categorize manually.',
            variant: 'destructive',
          });
           // Keep initially parsed transactions with null categories on error
           // State already has transactionsWithIds, ensure it's not cleared
           // setTransactions(transactionsWithIds); // No need to set again if it was set at the beginning
        } finally {
          setLoadingCategories(prev => {
            const newSet = new Set(prev);
            idsToCategorize.forEach(id => newSet.delete(id));
            return newSet;
          });
          setIsLoading(false); // Indicate overall initial process finished (AI attempted)
        }
      });
    } else {
      setTransactions([]); // Clear transactions if parsing yields nothing
      setAvailableMonths([]); // Clear available months
      setSelectedMonth(ALL_MONTHS_VALUE); // Reset month filter
      setIsLoading(false); // Stop loading if no transactions
       toast({
          title: 'No Transactions Found',
          description: 'Could not find transactions in the uploaded file.',
          variant: 'default',
       });
    }
  };

  const handleUpdateCategory = (transactionId: string, newCategory: string) => {
     startUpdatingCategory(() => {
       setLoadingCategories(prev => new Set(prev).add(transactionId));
       // Simulate API call delay for feedback
       setTimeout(() => {
          setTransactions((prevTransactions) =>
             prevTransactions.map((tx) =>
               tx.id === transactionId ? { ...tx, category: newCategory } : tx
             )
           );
           setLoadingCategories(prev => {
               const newSet = new Set(prev);
               newSet.delete(transactionId);
               return newSet;
             });
          toast({
             title: "Category Updated",
             description: `Transaction category set to ${newCategory}.`,
             variant: 'default'
           });
       }, 300); // 300ms simulated delay
     });
  };

  // Filter transactions based on selected month
  const filteredTransactions = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE) {
      return transactions;
    }
    return transactions.filter(tx => {
      try {
        const date = parseISO(tx.date);
        return format(date, 'yyyy-MM') === selectedMonth;
      } catch {
        return false; // Ignore transactions with invalid dates during filtering
      }
    });
  }, [transactions, selectedMonth]);


  // Derived state to check if any background process is running
  const isProcessingFile = isLoading && !isCategorizing && transactions.length > 0 && transactions.some(tx => tx.category === null); // File parsed, initial AI hasn't started/finished
  const isProcessingAI = isCategorizing; // When AI categorization is running
  const isProcessingUpdate = isUpdatingCategory; // When manual update is running

  // Combined loading state for disabling interactions or showing general loading indicators
  const isProcessing = isLoading || isProcessingAI || isProcessingUpdate;

  // Determine if the table should show the initial loading state (skeletons)
  // Show initial loading only if loading AND the selected filter is 'All' (or no months yet) AND some categories are null
  const isInitialLoading = isLoading && selectedMonth === ALL_MONTHS_VALUE && transactions.length > 0 && transactions.some(tx => tx.category === null);

  const showEmptyState = !isProcessing && transactions.length === 0;

  // Format month for display (e.g., "July 2024")
  const formatDisplayMonth = (monthYear: string): string => {
    if (monthYear === ALL_MONTHS_VALUE) return "All Months";
    try {
       const [year, month] = monthYear.split('-');
       const date = new Date(parseInt(year), parseInt(month) - 1);
       return format(date, 'MMMM yyyy');
    } catch {
       return monthYear; // Fallback
    }
   };


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40"> {/* Slightly off-white background */}
      <Header
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:gap-8 md:p-8">
        {/* Top Section: Upload and Dashboard */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-2">
             <FileUpload
              onTransactionsParsed={handleTransactionsParsed}
              setIsLoading={setIsLoading}
              isLoading={isProcessing} // Disable upload during any processing
            />
          </div>
          <div className="lg:col-span-3">
            <ExpenseDashboard
              transactions={filteredTransactions} // Pass filtered data
              selectedCurrency={selectedCurrency}
              isLoading={isInitialLoading || isProcessingAI} // Show loading in dashboard during initial AI run
              selectedMonthDisplay={formatDisplayMonth(selectedMonth)} // Pass display month
            />
          </div>
        </div>

         {/* Filters Section - Only show if transactions exist */}
         {transactions.length > 0 && (
            <Card className="shadow-sm bg-card">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                 <div className="flex items-center gap-2">
                     <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="month-filter" className="text-sm font-medium">
                        Filter by Month:
                     </Label>
                     <Select
                        value={selectedMonth}
                        onValueChange={setSelectedMonth}
                        disabled={availableMonths.length === 0 || isProcessing}
                     >
                        <SelectTrigger id="month-filter" className="w-[180px] h-9 text-sm">
                            <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value={ALL_MONTHS_VALUE}>All Months</SelectItem>
                        {availableMonths.map((month) => (
                            <SelectItem key={month} value={month}>
                                {formatDisplayMonth(month)}
                            </SelectItem>
                        ))}
                        </SelectContent>
                     </Select>
                  </div>
                  {/* Add more filters here in the future if needed */}
                </CardContent>
            </Card>
         )}


        {/* Bottom Section: Transaction Table */}
        <div className="grid gap-6">
           {/* Show Table Card wrapper always if not initial empty state */}
          {!showEmptyState ? (
              <TransactionTable
                  transactions={filteredTransactions} // Pass filtered data
                  onUpdateCategory={handleUpdateCategory}
                  loadingCategories={loadingCategories}
                  isUpdatingCategory={isUpdatingCategory} // Pass the transition state
                  selectedCurrency={selectedCurrency}
                  // Show loading skeletons only during initial AI categorization for 'All Months'
                  isInitialLoading={isInitialLoading}
                  isRowSaving={isProcessingUpdate || isProcessingAI} // Indicate if any save/AI process is running
              />
           ) : (
              // Initial Empty State - Prompt to upload
              <Card className="shadow-sm border-dashed border-border/50 bg-card">
                 <CardContent className="flex flex-col items-center justify-center p-10 gap-4 min-h-[300px]">
                    <FileSpreadsheet className="h-16 w-16 text-muted-foreground/40 mb-3" strokeWidth={1.25}/>
                    <p className="text-lg font-medium text-center text-foreground">
                      Ready to analyze your expenses?
                    </p>
                    <p className="text-sm text-center text-muted-foreground">
                       Upload your bank statement (CSV or PDF) using the panel above to get started.
                    </p>
                  </CardContent>
              </Card>
            )}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
