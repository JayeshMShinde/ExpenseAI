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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { motion } from "framer-motion";
import { cn } from '@/lib/utils';

export type CurrencyCode = 'INR' | 'USD';

const ALL_MONTHS_VALUE = "all";
const DEFAULT_CATEGORY = 'Other';

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  const [transactions, setTransactions] = useState<CategorizedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategorizing, startCategorizing] = useTransition();
  const [isUpdatingCategory, startUpdatingCategory] = useTransition();
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS_VALUE);
  const { toast } = useToast();

  const calculateAvailableMonths = (txs: Transaction[]): string[] => {
    if (txs.length === 0) return [];

    const uniqueMonths = new Set<string>();
    txs.forEach(tx => {
      try {
         if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
             console.warn(`Invalid or missing date format for transaction: ${tx.description}, date: ${tx.date}`);
             return;
         }
        const date = parseISO(tx.date);
        const monthYear = format(date, 'yyyy-MM');
        uniqueMonths.add(monthYear);
      } catch (e) {
        console.error(`Error parsing date for transaction: ${tx.description}, date: ${tx.date}`, e);
      }
    });

    return Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
  };

  const handleTransactionsParsed = async (parsedTransactions: Transaction[]) => {
    const transactionsWithIds: CategorizedTransaction[] = parsedTransactions.map((tx, index) => ({
        ...tx,
        category: null,
        id: tx.id || `tx-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`,
    }));

    setTransactions(transactionsWithIds);
    setIsLoading(true);

    const months = calculateAvailableMonths(transactionsWithIds);
    setAvailableMonths(months);
    setSelectedMonth(months.length > 0 ? ALL_MONTHS_VALUE : ALL_MONTHS_VALUE);

    if (transactionsWithIds.length > 0) {
      const idsToCategorize = new Set(transactionsWithIds.map(tx => tx.id));
      setLoadingCategories(prev => new Set([...prev, ...idsToCategorize]));

      startCategorizing(async () => {
        let successfulCategorizationCount = 0;
        let failedCategorizationCount = 0;
        try {
          const transactionsForAI = transactionsWithIds.map(({ id, category, ...rest }) => rest);
          console.log(`Sending ${transactionsForAI.length} transactions to AI...`);

          const categorizedResult = await categorizeTransactions(transactionsForAI);
          console.log(`Received ${categorizedResult.length} categorized results from AI.`);

          setTransactions(prev =>
            prev.map((tx, index) => {
              const aiCategory = categorizedResult[index]?.category;
              const finalCategory = aiCategory || DEFAULT_CATEGORY;

              if (aiCategory) {
                successfulCategorizationCount++;
              } else {
                 failedCategorizationCount++;
              }

              return { ...tx, category: finalCategory };
            })
          );

          toast({
             title: 'AI Categorization Complete',
             description: `${successfulCategorizationCount} transactions categorized successfully. ${failedCategorizationCount > 0 ? `${failedCategorizationCount} defaulted to '${DEFAULT_CATEGORY}'.` : ''}`,
             variant: failedCategorizationCount > 0 ? 'default' : 'default',
          });
        } catch (error) {
          console.error('Error during AI categorization call:', error);
          toast({
            title: 'AI Categorization Error',
            description: `AI call failed: ${error instanceof Error ? error.message : 'Unknown error'}. Defaulting all to '${DEFAULT_CATEGORY}'.`,
            variant: 'destructive',
          });
           
           setTransactions(prev =>
            prev.map(tx => ({ ...tx, category: DEFAULT_CATEGORY }))
           );
           failedCategorizationCount = transactionsWithIds.length;
        } finally {
          setLoadingCategories(prev => {
            const newSet = new Set(prev);
            idsToCategorize.forEach(id => newSet.delete(id));
            return newSet;
          });
          setIsLoading(false);
           console.log(`Categorization Summary: Success=${successfulCategorizationCount}, Defaulted=${failedCategorizationCount}`);
        }
      });
    } else {
      setTransactions([]);
      setAvailableMonths([]);
      setSelectedMonth(ALL_MONTHS_VALUE);
      setIsLoading(false);
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
       
       setTransactions((prevTransactions) =>
         prevTransactions.map((tx) =>
           tx.id === transactionId ? { ...tx, category: newCategory || DEFAULT_CATEGORY } : tx
         )
       );
       setLoadingCategories(prev => {
           const newSet = new Set(prev);
           newSet.delete(transactionId);
           return newSet;
         });
       toast({
         title: "Category Updated",
         description: `Transaction category set to ${newCategory || DEFAULT_CATEGORY}.`,
         variant: 'default'
       });
     });
  };

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE) {
      return transactions;
    }
    return transactions.filter(tx => {
      try {
        if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) return false;
        const date = parseISO(tx.date);
        return format(date, 'yyyy-MM') === selectedMonth;
      } catch(e) {
        console.warn(`Invalid date during filtering: ${tx.date} for tx: ${tx.description}`);
        return false;
      }
    });
  }, [transactions, selectedMonth]);

  const isProcessing = isLoading || isCategorizing || isUpdatingCategory;
  const isInitialLoading = isLoading || (isCategorizing && transactions.length > 0);
  const showEmptyState = !isProcessing && transactions.length === 0;

  const formatDisplayMonth = (monthYear: string): string => {
    if (monthYear === ALL_MONTHS_VALUE) return "All Months";
    try {
       const [year, month] = monthYear.split('-');
       if (isNaN(parseInt(year)) || isNaN(parseInt(month))) return monthYear;
       const date = new Date(parseInt(year), parseInt(month) - 1);
       if (isNaN(date.getTime())) return monthYear;
       return format(date, 'MMMM yyyy');
    } catch {
       return monthYear;
    }
   };

  return (
    <div className="flex min-h-screen w-full flex-col bg-pattern">
      <Header
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:gap-8 md:p-8">
        {/* Container with staggered animations */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6"
        >
          {/* Top Section: Upload and Dashboard */}
          <motion.div 
            variants={itemVariants}
            className="grid gap-6,, md:grid-cols-1 lg:grid-cols-5"
          >
            <div className="lg:col-span-2">
              <FileUpload
                onTransactionsParsed={handleTransactionsParsed}
                setIsLoading={setIsLoading}
                isLoading={isProcessing}
              />
            </div>
            <div className="lg:col-span-3">
              <ExpenseDashboard
                transactions={filteredTransactions}
                selectedCurrency={selectedCurrency}
                isLoading={isInitialLoading}
                selectedMonthDisplay={formatDisplayMonth(selectedMonth)}
              />
            </div>
          </motion.div>

          {/* Filters Section */}
          {transactions.length > 0 && !isInitialLoading && (
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm bg-card/90 backdrop-blur-sm hover-lift transition-all">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4 p-4 pt-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <Label htmlFor="month-filter" className="text-sm font-medium">
                      Month:
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
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Bottom Section: Transaction Table */}
          <motion.div variants={itemVariants}>
            {!showEmptyState ? (
              <TransactionTable
                transactions={filteredTransactions}
                onUpdateCategory={handleUpdateCategory}
                loadingCategories={loadingCategories}
                isUpdatingCategory={isUpdatingCategory}
                selectedCurrency={selectedCurrency}
                isInitialLoading={isInitialLoading}
                isRowSaving={isUpdatingCategory || isCategorizing}
              />
            ) : (
              <Card className="shadow-md border-dashed border-primary/20 bg-card/80 backdrop-blur-sm hover-lift transition-all">
                <CardContent className="flex flex-col items-center justify-center p-10 gap-4 min-h-[400px]">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse"></div>
                    <FileSpreadsheet className="h-20 w-20 text-primary relative z-10 mb-3" strokeWidth={1.25}/>
                  </div>
                  <h2 className="text-2xl font-semibold text-center gradient-text">
                    Welcome to ExpenseAI
                  </h2>
                  <p className="text-lg text-center text-foreground max-w-md">
                    Ready to analyze your expenses?
                  </p>
                  <p className="text-sm text-center text-muted-foreground max-w-md">
                    Upload your bank statement (CSV or PDF) using the panel above to get started with AI-powered expense tracking.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </motion.div>
      </main>
      <Toaster />
    </div>
  );
}