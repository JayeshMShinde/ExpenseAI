'use client';

import type * as React from 'react';
import { useState, useRef } from 'react'; // Import useRef
import { Upload, FileText, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { parseBankStatement } from '@/services/file-parser';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Import Card components

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
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the file input
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.type === 'application/pdf') {
        setSelectedFile(file);
         toast({
           title: 'File Selected',
           description: `Ready to upload: ${file.name}`,
         });
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV or PDF file.',
          variant: 'destructive',
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
             fileInputRef.current.value = ''; // Clear the input using ref
         }
      }
    } else {
       setSelectedFile(null); // Clear selection if no file chosen
    }
  };

   const clearSelection = () => {
     setSelectedFile(null);
     if (fileInputRef.current) {
       fileInputRef.current.value = ''; // Clear the input using ref
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
       // Clear selection only on successful parse and pass to parent
       clearSelection();
       // Toast for success is now handled in the parent component upon receiving transactions
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Parsing Error',
        description:
          `Failed to parse ${selectedFile.name}. Please check the file format or try again.`,
        variant: 'destructive',
      });
      onTransactionsParsed([]); // Clear transactions on error
       // Optionally clear selection on error too, or let user retry
       // clearSelection();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md"> {/* Add shadow */}
       <CardHeader>
          <CardTitle>Upload Statement</CardTitle>
          <CardDescription>Select a CSV or PDF bank statement file.</CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="grid w-full items-center gap-2">
           <Label htmlFor="bank-statement" className="sr-only"> {/* Hide label visually, still accessible */}
              Select File (CSV or PDF)
           </Label>
           <Input
             id="bank-statement"
             type="file"
             ref={fileInputRef} // Attach ref
             accept=".csv,.pdf"
             onChange={handleFileChange}
             disabled={isLoading}
             className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" // Styled input
           />
         </div>
          {selectedFile && (
            <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate max-w-[180px]">{selectedFile.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={clearSelection}
                disabled={isLoading}
               >
                 <X className="h-4 w-4" />
                 <span className="sr-only">Clear selection</span>
               </Button>
            </div>
          )}
         <Button onClick={handleUpload} disabled={!selectedFile || isLoading} className="w-full">
           <Upload className="mr-2 h-4 w-4" />
           {isLoading ? 'Processing...' : 'Upload & Analyze'}
         </Button>
       </CardContent>
    </Card>
  );
}
