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
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"; // Ensure CardDescription is imported
import { Upload } from 'lucide-react'; // Import Upload icon

export type CurrencyCode = 'INR' | 'USD';

export default function Home() {
  const [transactions, setTransactions] = useState<CategorizedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state for file parsing AND initial categorization
  const [isCategorizing, startCategorizing] = useTransition(); // Transition for AI categorization
  const [isUpdatingCategory, startUpdatingCategory] = useTransition(); // Transition for manual update
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set()); // Track individual category loading
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR'); // State for currency
  const { toast } = useToast();

  const handleTransactionsParsed = async (parsedTransactions: Transaction[]) => {
    // Immediately display parsed transactions without category
    const initialCategorized = parsedTransactions.map(tx => ({ ...tx, category: null }));
    setTransactions(initialCategorized);
    setIsLoading(true); // Set loading true until categorization finishes or fails

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
           // We don't need to setTransactions(initialCategorized) again, as it's already the state
        } finally {
          setLoadingCategories(prev => {
            const newSet = new Set(prev);
            idsToCategorize.forEach(id => newSet.delete(id));
            return newSet;
          });
          setIsLoading(false); // Set loading false after categorization attempt completes
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
  const isProcessingFile = isLoading && transactions.length === 0; // When file upload component shows spinner
  const isProcessingAI = isCategorizing; // When AI categorization is running
  const isProcessingUpdate = isUpdatingCategory; // When manual update is running

  // Combined loading state for disabling interactions or showing general loading indicators
  const isProcessing = isProcessingFile || isProcessingAI || isProcessingUpdate;

  // Determine if the table should show the initial loading state (skeletons)
  const isInitialLoading = isLoading && transactions.some(tx => tx.category === null);


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/10"> {/* Slightly lighter background */}
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
              setIsLoading={setIsLoading} // Pass setIsLoading to FileUpload
              isLoading={isProcessing} // Disable upload during any processing
            />
          </div>
          <div className="lg:col-span-3">
            <ExpenseDashboard
              transactions={transactions}
              selectedCurrency={selectedCurrency}
              isLoading={isInitialLoading} // Pass loading state to dashboard
            />
          </div>
        </div>

        {/* Bottom Section: Transaction Table */}
        <div className="grid gap-6">
           {/* Show Table Card wrapper always if not initial empty state */}
          {transactions.length > 0 || isProcessing ? (
              <TransactionTable
                  transactions={transactions}
                  onUpdateCategory={handleUpdateCategory}
                  loadingCategories={loadingCategories}
                  isUpdatingCategory={isUpdatingCategory} // Pass the transition state
                  selectedCurrency={selectedCurrency}
                  isInitialLoading={isInitialLoading} // Pass initial AI loading state
                  isRowSaving={isProcessingUpdate || isProcessingAI} // Indicate if any save/AI process is running
              />
           ) : (
              // Initial Empty State - Prompt to upload
              <Card className="shadow-sm border-dashed border-muted-foreground/30"> {/* Dashed border for empty state */}
                 <CardContent className="flex flex-col items-center justify-center p-10 gap-4 min-h-[300px]"> {/* Min height */}
                    <Upload className="h-16 w-16 text-muted-foreground/50 mb-2" strokeWidth={1.5}/>
                    <p className="text-lg font-medium text-center text-muted-foreground">
                      Ready to analyze your expenses?
                    </p>
                    <p className="text-sm text-center text-muted-foreground/80">
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
