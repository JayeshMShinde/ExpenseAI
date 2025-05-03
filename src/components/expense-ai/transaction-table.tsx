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

interface TransactionTableProps {
  transactions: CategorizedTransaction[];
  onUpdateCategory: (transactionId: string, newCategory: string) => void;
  loadingCategories: Set<string>; // Track loading state per transaction ID
  isUpdatingCategory: boolean; // Global update state (for disabling inputs)
}

// Predefined category options (can be expanded)
const CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Shopping', 'Income', 'Other'];

export function TransactionTable({
  transactions,
  onUpdateCategory,
  loadingCategories,
  isUpdatingCategory,
}: TransactionTableProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedCategory, setEditedCategory] = useState<string>('');

  const handleEditClick = (transaction: CategorizedTransaction) => {
    // Prevent editing if already saving another row
    if (isUpdatingCategory && editingRowId !== transaction.id) return;
    setEditingRowId(transaction.id);
    setEditedCategory(transaction.category || '');
  };

  const handleSaveClick = (transactionId: string) => {
    // Prevent saving if category is empty or unchanged (optional)
    // const originalCategory = transactions.find(tx => tx.id === transactionId)?.category || '';
    // if (!editedCategory || editedCategory === originalCategory) {
    //    handleCancelClick();
    //    return;
    // }
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
       case 'income': return 'accent'; // Green for income
       case 'food': return 'default'; // Using primary (dark) for food
       case 'transport': return 'secondary'; // Soft blue
       case 'bills': return 'destructive'; // Red for bills
       case 'entertainment': return 'outline'; // Outline variant
       case 'shopping': return 'default'; // Primary again, consider adding more variants/colors if needed
       case 'other': return 'muted'; // Muted variant
       default: return 'muted'; // Muted for uncategorized or null
     }
   }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { // Changed locale to en-IN
        style: 'currency',
        currency: 'INR', // Changed currency to INR
        minimumFractionDigits: 0, // Optional: Adjust based on common Rupee formatting
        maximumFractionDigits: 2,
    }).format(amount);
  }

  const formatDate = (dateString: string) => {
     try {
       return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     } catch (e) {
       return dateString; // Fallback if date is invalid
     }
   };

  const isInitialLoading = transactions.length > 0 && transactions.every(tx => tx.category === null) && !isUpdatingCategory;


  return (
    <Card className="shadow-md"> {/* Add shadow */}
       <CardHeader>
          <CardTitle>Transactions</CardTitle>
       </CardHeader>
       <CardContent>
         {/* Set a fixed height for the scroll area */}
       <ScrollArea className="h-[450px] w-full border rounded-md"> {/* Added border and rounded corners */}
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10"> {/* Sticky header */}
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead> {/* Fixed width */}
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px] text-right">Amount</TableHead> {/* Fixed width */}
              <TableHead className="w-[180px]">Category</TableHead> {/* Increased width */}
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
                 const isDisabled = isUpdatingCategory && !isEditingCurrent; // Disable other rows while one is saving

                 return (
                   <TableRow key={transaction.id} className={isLoadingCurrent ? 'opacity-60' : ''} aria-disabled={isDisabled}>
                     <TableCell className="text-muted-foreground">{formatDate(transaction.date)}</TableCell>
                     <TableCell className="font-medium max-w-[250px] truncate" title={transaction.description}>{transaction.description}</TableCell>
                     <TableCell className={`text-right font-mono ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                     <TableCell>
                       {isEditingCurrent ? (
                         <Input
                           type="text"
                           value={editedCategory}
                           onChange={handleCategoryChange}
                           list="category-suggestions"
                           className="h-8 text-sm" // Smaller input
                           disabled={isLoadingCurrent} // Disable input while saving this row
                           autoFocus
                           onKeyDown={(e) => e.key === 'Enter' && handleSaveClick(transaction.id)} // Save on Enter
                         />
                       ) : (
                         <Badge
                           variant={getCategoryBadgeVariant(transaction.category)}
                           className="flex items-center justify-center w-fit" // Ensure badge fits content
                         >
                            {/* Show loader inside badge if only this category is loading */}
                           {isLoadingCurrent && !isUpdatingCategory && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                           {transaction.category || 'Uncategorized'}
                         </Badge>
                       )}
                     </TableCell>
                     <TableCell className="text-center">
                       {isEditingCurrent ? (
                         <div className="flex justify-center gap-1">
                           <Button variant="ghost" size="icon" onClick={() => handleSaveClick(transaction.id)} className="h-7 w-7 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50" disabled={isLoadingCurrent}>
                             {isLoadingCurrent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                             <span className="sr-only">Save</span>
                           </Button>
                           <Button variant="ghost" size="icon" onClick={handleCancelClick} className="h-7 w-7 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800" disabled={isLoadingCurrent}>
                             <XCircle className="h-4 w-4" />
                             <span className="sr-only">Cancel</span>
                           </Button>
                         </div>
                       ) : (
                         <Button variant="ghost" size="icon" onClick={() => handleEditClick(transaction)} className="h-7 w-7" disabled={isDisabled || isLoadingCurrent}>
                            {/* Show spinner if loading this specific category (even if not editing) */}
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
