'use client';

import type * as React from 'react';
import { useState } from 'react';
import { Edit2, Save, XCircle, Loader2 } from 'lucide-react'; // Import Loader2

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { formatCurrency } from '@/lib/formatting'; // Import the utility function
import type { CurrencyCode } from '@/app/page'; // Import CurrencyCode type

interface TransactionTableProps {
  transactions: CategorizedTransaction[];
  onUpdateCategory: (transactionId: string, newCategory: string) => void;
  loadingCategories: Set<string>; // Track loading state per transaction ID
  isUpdatingCategory: boolean; // Global update state (for disabling inputs)
  selectedCurrency: CurrencyCode; // Add currency prop
  isInitialLoading: boolean; // Add prop for initial loading state
  isRowSaving: boolean; // Add this prop
}

// Predefined category options (can be expanded)
const CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Shopping', 'Income', 'Other'];

export function TransactionTable({
  transactions,
  onUpdateCategory,
  loadingCategories,
  isUpdatingCategory,
  selectedCurrency,
  isInitialLoading, // Destructure the prop
  isRowSaving, // Destructure the new prop
}: TransactionTableProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedCategory, setEditedCategory] = useState<string>('');

  const handleEditClick = (transaction: CategorizedTransaction) => {
    // Prevent editing if already saving another row or during initial load
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

   // More distinct badge variants using background colors from the theme
   const getCategoryBadgeVariant = (category: string | null): "default" | "secondary" | "destructive" | "outline" | "accent" | "muted" => {
     switch(category?.toLowerCase()) {
       case 'income': return 'accent'; // Use accent (green) for income
       case 'food': return 'default'; // Primary (blue)
       case 'transport': return 'secondary'; // Light cool gray
       case 'bills': return 'destructive'; // Red
       case 'entertainment': return 'outline'; // Outline
       case 'shopping': return 'default'; // Primary again
       case 'other': return 'muted'; // Muted gray
       default: return 'muted'; // Muted for uncategorized or null
     }
   }

   const formatDate = (dateString: string) => {
     try {
       return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     } catch (e) {
       return dateString; // Fallback if date is invalid
     }
   };


  return (
    <Card className="shadow-md">
       <CardHeader>
          <CardTitle>Transactions</CardTitle>
       </CardHeader>
       <CardContent>
         {/* Set a fixed height for the scroll area */}
       <ScrollArea className="h-[450px] w-full border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px] text-right">Amount</TableHead>
              <TableHead className="w-[180px]">Category</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoading ? (
               // Show skeleton rows during initial categorization
               Array.from({ length: 5 }).map((_, index) => (
                 <TableRow key={`skeleton-${index}`}>
                   <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                   <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                   <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                   <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                   <TableCell className="text-center"><Skeleton className="h-7 w-7 mx-auto" /></TableCell>
                 </TableRow>
               ))
             ) : transactions.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No transactions found.
                 </TableCell>
               </TableRow>
             ) : (
              transactions.map((transaction) => {
                 const isEditingCurrent = editingRowId === transaction.id;
                 const isLoadingCurrent = loadingCategories.has(transaction.id);
                 // Disable edit/save actions if initial loading, or if another row is being saved
                 const isDisabled = isInitialLoading || (isRowSaving && !isLoadingCurrent); // Use isRowSaving

                 return (
                   <TableRow key={transaction.id} className={isLoadingCurrent ? 'opacity-60' : ''} aria-disabled={isDisabled}>
                     <TableCell className="text-muted-foreground">{formatDate(transaction.date)}</TableCell>
                     <TableCell className="font-medium max-w-[250px] truncate" title={transaction.description}>{transaction.description}</TableCell>
                      <TableCell className={`text-right font-mono ${transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(transaction.amount, selectedCurrency)} {/* Use formatter */}
                      </TableCell>
                     <TableCell>
                       {isEditingCurrent ? (
                         <Input
                           type="text"
                           value={editedCategory}
                           onChange={handleCategoryChange}
                           list="category-suggestions"
                           className="h-8 text-sm" // Smaller input
                           disabled={isLoadingCurrent || isDisabled} // Disable input while saving this row or initial loading
                           autoFocus
                           onKeyDown={(e) => e.key === 'Enter' && handleSaveClick(transaction.id)} // Save on Enter
                         />
                       ) : (
                         <Badge
                           variant={getCategoryBadgeVariant(transaction.category)}
                           className="flex items-center justify-center w-fit capitalize" // Capitalize category name
                         >
                            {/* Show loader inside badge if only this category is loading (and not part of a global save) */}
                           {isLoadingCurrent && !isUpdatingCategory && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                           {transaction.category?.toLowerCase() || 'uncategorized'}
                         </Badge>
                       )}
                     </TableCell>
                     <TableCell className="text-center">
                       {isEditingCurrent ? (
                         <div className="flex justify-center gap-1">
                           <Button variant="ghost" size="icon" onClick={() => handleSaveClick(transaction.id)} className="h-7 w-7 text-accent hover:bg-accent/10" disabled={isLoadingCurrent || isDisabled}>
                             {isLoadingCurrent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                             <span className="sr-only">Save</span>
                           </Button>
                           <Button variant="ghost" size="icon" onClick={handleCancelClick} className="h-7 w-7 text-muted-foreground hover:bg-muted/50" disabled={isLoadingCurrent || isDisabled}>
                             <XCircle className="h-4 w-4" />
                             <span className="sr-only">Cancel</span>
                           </Button>
                         </div>
                       ) : (
                         <Button variant="ghost" size="icon" onClick={() => handleEditClick(transaction)} className="h-7 w-7" disabled={isDisabled || isLoadingCurrent}>
                            {/* Show spinner if loading this specific category (and not part of global save) */}
                           {isLoadingCurrent && !isUpdatingCategory ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Edit2 className="h-4 w-4" />}
                           <span className="sr-only">Edit</span>
                         </Button>
                       )}
                     </TableCell>
                   </TableRow>
                 );
               })
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
