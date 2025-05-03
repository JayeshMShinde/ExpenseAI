'use client';

import type * as React from 'react';
import { useState } from 'react';
import { Edit2, Save, XCircle, Loader2, Info } from 'lucide-react'; // Import Loader2 and Info

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CategorizedTransaction } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatting';
import type { CurrencyCode } from '@/app/page';

interface TransactionTableProps {
  transactions: CategorizedTransaction[]; // Now potentially filtered
  onUpdateCategory: (transactionId: string, newCategory: string) => void;
  loadingCategories: Set<string>; // Track loading state per transaction ID
  isUpdatingCategory: boolean; // Global update state (for disabling inputs)
  selectedCurrency: CurrencyCode;
  isInitialLoading: boolean; // True only during initial AI categorization for "All Months"
  isRowSaving: boolean; // True if any row save or AI categorization is running
}

// Predefined category options (can be expanded)
const CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Shopping', 'Income', 'Other'];

export function TransactionTable({
  transactions,
  onUpdateCategory,
  loadingCategories,
  isUpdatingCategory,
  selectedCurrency,
  isInitialLoading, // Use this for skeleton rows
  isRowSaving,
}: TransactionTableProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedCategory, setEditedCategory] = useState<string>('');

  const handleEditClick = (transaction: CategorizedTransaction) => {
    // Prevent editing if another row is being saved OR during the initial AI load
    if ((isRowSaving && editingRowId !== transaction.id) || isInitialLoading) return;
    setEditingRowId(transaction.id);
    setEditedCategory(transaction.category || '');
  };

  const handleSaveClick = (transactionId: string) => {
     // Prevent saving if initial load is happening
     if (isInitialLoading) return;
    onUpdateCategory(transactionId, editedCategory || 'Other'); // Default to 'Other' if empty
    setEditingRowId(null);
  };

  const handleCancelClick = () => {
    setEditingRowId(null);
    setEditedCategory('');
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedCategory(event.target.value);
  };

   const getCategoryBadgeVariant = (category: string | null): "default" | "secondary" | "destructive" | "outline" | "accent" | "muted" => {
     switch(category?.toLowerCase()) {
       case 'income': return 'accent';
       case 'food': return 'default';
       case 'transport': return 'secondary';
       case 'bills': return 'destructive';
       case 'entertainment': return 'outline';
       case 'shopping': return 'default';
       case 'other': return 'muted';
       default: return 'muted';
     }
   }

   const formatDate = (dateString: string) => {
     try {
       return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // Added year
     } catch (e) {
       return dateString; // Fallback if date is invalid
     }
   };

   // Check if there are transactions to display *after* filtering and initial loading
   const hasTransactionsToShow = !isInitialLoading && transactions.length > 0;
   // Check if the table is empty *because* of filtering (and not initial load)
   const isEmptyDueToFilter = !isInitialLoading && transactions.length === 0;


  return (
    <Card className="shadow-md bg-card">
       <CardHeader>
          <CardTitle>Transactions</CardTitle>
       </CardHeader>
       <CardContent>
       <ScrollArea className="h-[450px] w-full border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[140px] text-right">Amount</TableHead>
              <TableHead className="w-[200px]">Category</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoading ? (
               // Show skeleton rows only during initial AI categorization for "All Months"
               Array.from({ length: 7 }).map((_, index) => ( // Increased skeleton rows
                 <TableRow key={`skeleton-${index}`}>
                   <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                   <TableCell><Skeleton className="h-5 w-full max-w-xs" /></TableCell>
                   <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                   <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                   <TableCell className="text-center"><Skeleton className="h-7 w-7 mx-auto" /></TableCell>
                 </TableRow>
               ))
             ) : isEmptyDueToFilter ? ( // Specific message when filtered results are empty
               <TableRow>
                 <TableCell colSpan={5} className="h-48 text-center text-muted-foreground"> {/* Taller empty row */}
                   <div className="flex flex-col items-center justify-center gap-2">
                       <Info className="h-8 w-8 text-muted-foreground/50" />
                       <span>No transactions found for the selected month.</span>
                   </div>
                 </TableCell>
               </TableRow>
             ) : hasTransactionsToShow ? ( // Only map if there are transactions after loading/filtering
              transactions.map((transaction) => {
                 const isEditingCurrent = editingRowId === transaction.id;
                 const isLoadingCurrent = loadingCategories.has(transaction.id);
                 // Disable edit/save actions if initial loading, OR if another row is being saved, OR if AI is running
                 const isDisabled = isInitialLoading || (isRowSaving && !isLoadingCurrent);

                 return (
                   <TableRow key={transaction.id} className={isLoadingCurrent ? 'opacity-60' : ''} aria-disabled={isDisabled}>
                     <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                     <TableCell className="font-medium max-w-xs truncate text-sm" title={transaction.description}>{transaction.description}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(transaction.amount, selectedCurrency)}
                      </TableCell>
                     <TableCell>
                       {isEditingCurrent ? (
                         <Input
                           type="text"
                           value={editedCategory}
                           onChange={handleCategoryChange}
                           list="category-suggestions"
                           className="h-8 text-sm"
                           disabled={isLoadingCurrent || isDisabled}
                           autoFocus
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') handleSaveClick(transaction.id);
                             if (e.key === 'Escape') handleCancelClick();
                           }}
                         />
                       ) : (
                         <Badge
                           variant={getCategoryBadgeVariant(transaction.category)}
                           className="flex items-center justify-center w-fit capitalize text-xs px-2 py-0.5" // Smaller badge text
                         >
                           {isLoadingCurrent && !isUpdatingCategory && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                           {transaction.category?.toLowerCase() || 'uncategorized'}
                         </Badge>
                       )}
                     </TableCell>
                     <TableCell className="text-center">
                       {isEditingCurrent ? (
                         <div className="flex justify-center gap-1">
                           <Button variant="ghost" size="icon" onClick={() => handleSaveClick(transaction.id)} className="h-7 w-7 text-green-600 hover:bg-green-100/50 dark:hover:bg-green-900/30" disabled={isLoadingCurrent || isDisabled}>
                             {isLoadingCurrent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                             <span className="sr-only">Save</span>
                           </Button>
                           <Button variant="ghost" size="icon" onClick={handleCancelClick} className="h-7 w-7 text-muted-foreground hover:bg-muted/50" disabled={isLoadingCurrent || isDisabled}>
                             <XCircle className="h-4 w-4" />
                             <span className="sr-only">Cancel</span>
                           </Button>
                         </div>
                       ) : (
                         <Button variant="ghost" size="icon" onClick={() => handleEditClick(transaction)} className="h-7 w-7 text-primary hover:bg-primary/10" disabled={isDisabled || isLoadingCurrent}>
                           {isLoadingCurrent && !isUpdatingCategory ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Edit2 className="h-4 w-4" />}
                           <span className="sr-only">Edit</span>
                         </Button>
                       )}
                     </TableCell>
                   </TableRow>
                 );
               })
            ) : (
                 // This case should ideally not be reached if showEmptyState handles the initial no-upload case
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Loading transactions or no data available.
                    </TableCell>
                 </TableRow>
            )}
          </TableBody>
        </Table>
       </ScrollArea>
       </CardContent>

      {/* Datalist for category suggestions */}
      <datalist id="category-suggestions">
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat} />
        ))}
      </datalist>
    </Card>
  );
}
