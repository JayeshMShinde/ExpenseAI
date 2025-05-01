'use client';

import { useState, useEffect, useTransition } from 'react';
import { Header } from '@/components/expense-ai/header';
import { FileUpload } from '@/components/expense-ai/file-upload';
import { TransactionTable } from '@/components/expense-ai/transaction-table';
import { ExpenseDashboard } from '@/components/expense-ai/expense-dashboard';
import { categorizeTransactions } from '@/ai/flows/categorize-transactions';
import type { Transaction, CategorizedTransaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from "@/components/ui/card"; // Import Card components

export default function Home() {
  const [transactions, setTransactions] = useState<CategorizedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state for file parsing
  const [isCategorizing, startCategorizing] = useTransition(); // Transition for AI categorization
  const [isUpdatingCategory, startUpdatingCategory] = useTransition(); // Transition for manual update
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set()); // Track individual category loading
  const { toast } = useToast();

  const handleTransactionsParsed = async (parsedTransactions: Transaction[]) => {
    // Immediately display parsed transactions without category
    const initialCategorized = parsedTransactions.map(tx => ({ ...tx, category: null }));
    setTransactions(initialCategorized);

    if (parsedTransactions.length > 0) {
      // Start AI categorization in a transition
      startCategorizing(async () => {
        const idsToCategorize = new Set(parsedTransactions.map(tx => tx.id));
        setLoadingCategories(prev => new Set([...prev, ...idsToCategorize]));
        try {
          const categorizedResult = await categorizeTransactions(parsedTransactions);
          setTransactions(prev =>
            prev.map(tx => {
              const categorized = categorizedResult.find(ctx => ctx.description === tx.description && ctx.date === tx.date && ctx.amount === tx.amount); // Match based on fields AI uses
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
            description: 'AI failed to categorize transactions.',
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
        }
      });
    } else {
      // If parsing resulted in empty transactions (e.g., error or empty file)
      setTransactions([]);
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
             variant: 'default' // Use default instead of accent/success
           });
       }, 300); // 300ms simulated delay
     });
  };

  // Derived state to check if any background process is running
  const isProcessing = isLoading || isCategorizing || isUpdatingCategory;


  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-3">
            <FileUpload
              onTransactionsParsed={handleTransactionsParsed}
              setLoading={setIsLoading}
              isLoading={isLoading || isCategorizing} // Disable upload during parsing or initial categorization
            />
          </div>
          <div className="lg:col-span-4">
            <ExpenseDashboard transactions={transactions} />
          </div>
        </div>
        <div className="grid gap-4">
           {(isLoading || isCategorizing || isUpdatingCategory) && transactions.length === 0 && (
             <Card>
               <CardHeader>
                 <Skeleton className="h-6 w-1/4" />
               </CardHeader>
               <CardContent className="space-y-2">
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
               </CardContent>
             </Card>
           )}
          {(transactions.length > 0 || isProcessing) && ( // Show table even if processing if there are transactions
              <TransactionTable
                  transactions={transactions}
                  onUpdateCategory={handleUpdateCategory}
                  loadingCategories={loadingCategories}
                  isUpdatingCategory={isUpdatingCategory}
              />
          )}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
