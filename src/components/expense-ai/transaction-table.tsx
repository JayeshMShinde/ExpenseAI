'use client';

import type * as React from 'react';
import { useState } from 'react';
import { Edit2, Save, XCircle, CheckCircle } from 'lucide-react';

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

interface TransactionTableProps {
  transactions: CategorizedTransaction[];
  onUpdateCategory: (transactionId: string, newCategory: string) => void;
  loadingCategories: Set<string>; // Track loading state per transaction ID
  isUpdatingCategory: boolean;
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
    setEditingRowId(transaction.id);
    setEditedCategory(transaction.category || '');
  };

  const handleSaveClick = (transactionId: string) => {
    onUpdateCategory(transactionId, editedCategory);
    setEditingRowId(null);
  };

  const handleCancelClick = () => {
    setEditingRowId(null);
    setEditedCategory('');
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedCategory(event.target.value);
  };

  const getCategoryBadgeVariant = (category: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch(category?.toLowerCase()) {
      case 'income': return 'default'; // Using default (primary) for income for visual distinction
      case 'food': return 'secondary';
      case 'transport': return 'outline';
      case 'bills': return 'destructive'; // Use destructive temporarily for visibility
      case 'entertainment': return 'secondary'; // Needs more distinct variants or colors
      case 'shopping': return 'outline';
      default: return 'secondary';
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Transactions</h2>
       <ScrollArea className="h-[400px] w-full"> {/* Adjust height as needed */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center text-muted-foreground">
                   No transactions yet. Upload a statement to get started.
                 </TableCell>
               </TableRow>
             ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} className={loadingCategories.has(transaction.id) ? 'opacity-50' : ''}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{transaction.description}</TableCell>
                  <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-accent-foreground bg-accent/80' : ''}`}>
                     {formatCurrency(transaction.amount)}
                   </TableCell>
                  <TableCell>
                    {editingRowId === transaction.id ? (
                      <Input
                        type="text"
                        value={editedCategory}
                        onChange={handleCategoryChange}
                        list="category-suggestions"
                        className="h-8"
                        disabled={isUpdatingCategory}
                      />
                    ) : (
                      <Badge variant={getCategoryBadgeVariant(transaction.category)}>
                        {transaction.category || 'Uncategorized'}
                       {loadingCategories.has(transaction.id) && '...'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {editingRowId === transaction.id ? (
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleSaveClick(transaction.id)} className="h-7 w-7 text-accent" disabled={isUpdatingCategory}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleCancelClick} className="h-7 w-7 text-muted-foreground" disabled={isUpdatingCategory}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(transaction)} className="h-7 w-7" disabled={isUpdatingCategory || loadingCategories.has(transaction.id)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
       </ScrollArea>

      {/* Datalist for category suggestions */}
      <datalist id="category-suggestions">
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat} />
        ))}
      </datalist>
    </div>
  );
}
