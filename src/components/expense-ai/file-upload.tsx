'use client';

import type * as React from 'react';
import { useState, useRef } from 'react'; // Import useRef
import { Upload, FileText, X, Loader2 } from 'lucide-react'; // Import Loader2

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { parseBankStatement } from '@/services/file-parser';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Import Card components

interface FileUploadProps {
  onTransactionsParsed: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void; // Accept setLoading from parent
  isLoading: boolean; // Accept isLoading from parent
}

export function FileUpload({
  onTransactionsParsed,
  setLoading, // Use the passed setLoading
  isLoading, // Use the passed isLoading
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

    setLoading(true); // Indicate start of processing using parent's state setter
    try {
      const fileType = selectedFile.type === 'text/csv' ? 'csv' : 'pdf';
      // Add unique IDs to transactions (simple incrementing for now)
      let counter = 0;
      const parsedTransactions = await parseBankStatement(selectedFile, fileType);
      const transactionsWithIds = parsedTransactions.map(tx => ({
          ...tx,
          id: `tx-${Date.now()}-${counter++}`,
      }));

      onTransactionsParsed(transactionsWithIds); // Pass parsed data to parent
       // Clear selection only on successful parse initiation
       clearSelection();
       // Success toast is handled by parent after AI categorization completes
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Parsing Error',
        description:
          `Failed to parse ${selectedFile.name}. Please check the file format or try again.`,
        variant: 'destructive',
      });
      onTransactionsParsed([]); // Clear transactions on error
      setLoading(false); // Stop loading on error using parent's setter
       // Optionally clear selection on error too, or let user retry
       // clearSelection();
    }
    // setLoading(false) is now handled in the parent component after AI categorization attempt
  };

  return (
    <Card className="shadow-md h-full"> {/* Ensure card takes full height */}
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
          {selectedFile && !isLoading && ( // Only show clear selection if not loading
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
           {isLoading ? (
             <>
               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
               Processing...
             </>
           ) : (
             <>
               <Upload className="mr-2 h-4 w-4" />
               Upload & Analyze
             </>
           )}
         </Button>
       </CardContent>
    </Card>
  );
}
