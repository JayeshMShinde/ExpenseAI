'use client';

import { useState, useTransition } from 'react';
import { Header } from '@/components/expense-ai/header';
import { FileUpload } from '@/components/expense-ai/file-upload';
import { TransactionTable } from '@/components/expense-ai/transaction-table';
import { ExpenseDashboard } from '@/components/expense-ai/expense-dashboard';
import { categorizeTransactions } from '@/ai/flows/categorize-transactions';
import type { Transaction, CategorizedTransaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export type CurrencyCode = 'INR' | 'USD';

export default function Home() {
  const [transactions, setTransactions] = useState<CategorizedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state for file parsing
  const [isCategorizing, startCategorizing] = useTransition(); // Transition for AI categorization
  const [isUpdatingCategory, startUpdatingCategory] = useTransition(); // Transition for manual update
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set()); // Track individual category loading
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR'); // State for currency
  const { toast } = useToast();

  const handleTransactionsParsed = async (parsedTransactions: Transaction[]) => {
    // Immediately display parsed transactions without category
    const initialCategorized = parsedTransactions.map(tx => ({ ...tx, category: null }));
    setTransactions(initialCategorized);
    setLoading(true); // Set loading true until categorization finishes or fails

    if (parsedTransactions.length > 0) {
      // Start AI categorization in a transition
      startCategorizing(async () => {
        const idsToCategorize = new Set(parsedTransactions.map(tx => tx.id));
        setLoadingCategories(prev => new Set([...prev, ...idsToCategorize]));
        try {
          // Prepare data for AI (remove ID)
          const transactionsForAI = parsedTransactions.map(({ id, ...rest }) => rest);
          const categorizedResult = await categorizeTransactions(transactionsForAI);

          // Match results back using description, date, amount
          setTransactions(prev =>
            prev.map(tx => {
              const categorized = categorizedResult.find(ctx =>
                ctx.description === tx.description &&
                ctx.date === tx.date &&
                ctx.amount === tx.amount
              );
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
            description: 'AI failed to categorize transactions. Please try again or categorize manually.',
            variant: 'destructive',
          });
           // Keep initially parsed transactions without categories on error
          setTransactions(initialCategorized);
        } finally {
          setLoadingCategories(prev => {
            const newSet = new Set(prev);
            idsToCategorize.forEach(id => newSet.delete(id));
            return newSet;
          });
          setIsLoading(false); // Set loading false after categorization attempt
        }
      });
    } else {
      // If parsing resulted in empty transactions (e.g., error or empty file)
      setTransactions([]);
      setIsLoading(false); // Set loading false if no transactions found
       toast({
          title: 'No Transactions Found',
          description: 'Could not find transactions in the uploaded file.',
          variant: 'destructive', // Or 'default' depending on desired severity
       });
    }
  };

  const handleUpdateCategory = (transactionId: string, newCategory: string) => {
     // Start manual update in a transition
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

  // Derived state to check if any background process is running
  const isProcessing = isLoading || isCategorizing || isUpdatingCategory;
  const isInitialLoading = isLoading || (isCategorizing && transactions.some(tx => tx.category === null));


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
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
              setLoading={setIsLoading} // Pass setLoading to FileUpload
              isLoading={isProcessing} // Disable upload during any processing
            />
          </div>
          <div className="lg:col-span-3">
            <ExpenseDashboard
              transactions={transactions}
              selectedCurrency={selectedCurrency}
            />
          </div>
        </div>

        {/* Bottom Section: Transaction Table */}
        <div className="grid gap-6">
           {/* Initial Loading Skeleton */}
           {isInitialLoading && transactions.length === 0 && (
             <Card className="shadow-md">
               <CardHeader>
                 <Skeleton className="h-6 w-1/3" />
               </CardHeader>
               <CardContent className="space-y-3">
                 <Skeleton className="h-9 w-full" />
                 <Skeleton className="h-9 w-full" />
                 <Skeleton className="h-9 w-[80%]" />
               </CardContent>
             </Card>
           )}

           {/* Transaction Table (conditionally rendered) */}
          {(transactions.length > 0 || isProcessing) && ( // Show table even if processing if there are transactions
              <TransactionTable
                  transactions={transactions}
                  onUpdateCategory={handleUpdateCategory}
                  loadingCategories={loadingCategories}
                  isUpdatingCategory={isUpdatingCategory}
                  selectedCurrency={selectedCurrency}
                  isInitialLoading={isInitialLoading} // Pass initial loading state
              />
          )}

          {/* Prompt to upload if no transactions and not loading */}
           {!isProcessing && transactions.length === 0 && (
             <Card className="shadow-md">
                <CardContent className="flex flex-col items-center justify-center p-10 gap-4">
                   <svg
                     xmlns="http://www.w3.org/2000/svg"
                     width="24"
                     height="24"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     className="h-16 w-16 text-muted-foreground opacity-50" // Larger icon
                   >
                     <path d="M4 12h16"></path>
                     <path d="M4 18h16"></path>
                     <path d="M4 6h16"></path>
                   </svg>
                   <p className="text-center text-muted-foreground">
                     No transactions yet. Upload a statement to get started.
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
