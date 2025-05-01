'use client';

import type * as React from 'react';
import { useState } from 'react';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { parseBankStatement } from '@/services/file-parser';
import type { Transaction } from '@/types';

interface FileUploadProps {
  onTransactionsParsed: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  isLoading: boolean;
}

export function FileUpload({
  onTransactionsParsed,
  setLoading,
  isLoading,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV or PDF file.',
          variant: 'destructive',
        });
        setSelectedFile(null);
        event.target.value = ''; // Clear the input
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const fileType = selectedFile.type === 'text/csv' ? 'csv' : 'pdf';
      // Add unique IDs to transactions (simple incrementing for now)
      let counter = 0;
      const parsedTransactions = await parseBankStatement(selectedFile, fileType);
      const transactionsWithIds = parsedTransactions.map(tx => ({
          ...tx,
          id: `tx-${Date.now()}-${counter++}`,
      }));

      onTransactionsParsed(transactionsWithIds);
      toast({
        title: 'File Processed',
        description: 'Transactions extracted successfully.',
      });
      setSelectedFile(null); // Clear selection after successful upload
      // Optionally clear the input value if needed, requires getting ref
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Parsing Error',
        description:
          'Failed to parse the bank statement. Please check the file format.',
        variant: 'destructive',
      });
      onTransactionsParsed([]); // Clear transactions on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Upload Bank Statement</h2>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="bank-statement">Select File (CSV or PDF)</Label>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            id="bank-statement"
            type="file"
            accept=".csv,.pdf"
            onChange={handleFileChange}
            disabled={isLoading}
            className="file:text-foreground"
          />
          <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            {isLoading ? 'Processing...' : 'Upload'}
          </Button>
        </div>
        {selectedFile && (
           <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
         )}
      </div>
    </div>
  );
}
