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
import { Card, CardContent } from "@/components/ui/card"; // Keep CardContent
import { FileSpreadsheet } from 'lucide-react'; // Changed Icon for empty state

export type CurrencyCode = 'INR' | 'USD';

export default function Home() {
  const [transactions, setTransactions] = useState<CategorizedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false); // General loading (file parsing + initial AI)
  const [isCategorizing, startCategorizing] = useTransition(); // Transition for AI categorization specifically
  const [isUpdatingCategory, startUpdatingCategory] = useTransition(); // Transition for manual update
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set()); // Track individual category loading
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR'); // State for currency
  const { toast } = useToast();

  const handleTransactionsParsed = async (parsedTransactions: Transaction[]) => {
    // Immediately display parsed transactions without category
    const initialCategorized = parsedTransactions.map(tx => ({ ...tx, category: null, id: tx.id || `tx-${Date.now()}-${Math.random()}` })); // Ensure IDs are present
    setTransactions(initialCategorized);
    setIsLoading(true); // Indicate overall process started (parsing done, AI starting)

    if (parsedTransactions.length > 0) {
      const idsToCategorize = new Set(initialCategorized.map(tx => tx.id));
      setLoadingCategories(prev => new Set([...prev, ...idsToCategorize]));

      startCategorizing(async () => {
        try {
          // Prepare data for AI (remove ID if the flow doesn't expect it)
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
            description: 'AI failed to categorize transactions. Please categorize manually.',
            variant: 'destructive',
          });
           // Keep initially parsed transactions with null categories on error
           setTransactions(initialCategorized); // Ensure state remains the initial set
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

  // Derived state to check if any background process is running
  const isProcessingFile = isLoading && !isCategorizing && transactions.length > 0 && transactions.some(tx => tx.category === null); // File parsed, initial AI hasn't started/finished
  const isProcessingAI = isCategorizing; // When AI categorization is running
  const isProcessingUpdate = isUpdatingCategory; // When manual update is running

  // Combined loading state for disabling interactions or showing general loading indicators
  const isProcessing = isLoading || isProcessingAI || isProcessingUpdate;

  // Determine if the table should show the initial loading state (skeletons)
  const isInitialLoading = isLoading && transactions.length > 0 && transactions.some(tx => tx.category === null);

  const showEmptyState = !isProcessing && transactions.length === 0;


  return (
    <div className="flex min-h-screen w-full flex-col bg-background"> {/* Use standard background */}
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
              transactions={transactions}
              selectedCurrency={selectedCurrency}
              isLoading={isInitialLoading || isProcessingAI} // Show loading in dashboard during initial AI run
            />
          </div>
        </div>

        {/* Bottom Section: Transaction Table */}
        <div className="grid gap-6">
           {/* Show Table Card wrapper always if not initial empty state */}
          {!showEmptyState ? (
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
              <Card className="shadow-sm border-dashed border-border/50 bg-card"> {/* Dashed border, subtle bg */}
                 <CardContent className="flex flex-col items-center justify-center p-10 gap-4 min-h-[300px]"> {/* Min height */}
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
