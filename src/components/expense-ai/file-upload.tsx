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
  setIsLoading: (loading: boolean) => void; // Accept setIsLoading from parent
  isLoading: boolean; // Accept isLoading from parent
}

export function FileUpload({
  onTransactionsParsed,
  setIsLoading, // Use the passed setIsLoading
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
           description: `Ready to process: ${file.name}`, // Changed wording
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

    setIsLoading(true); // Indicate start of processing using parent's state setter
    try {
      const fileType = selectedFile.type === 'text/csv' ? 'csv' : 'pdf';
      // Add unique IDs to transactions (simple incrementing for now)
      let counter = 0;
      const parsedTransactions = await parseBankStatement(selectedFile, fileType);
      const transactionsWithIds = parsedTransactions.map(tx => ({
          ...tx,
          // Ensure robust ID generation (consider UUID in a real app)
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
          error instanceof Error ? error.message : `Failed to parse ${selectedFile.name}. Please check the file format or try again.`, // Show error message if available
        variant: 'destructive',
      });
      onTransactionsParsed([]); // Clear transactions on error
      setIsLoading(false); // Stop loading on error using parent's setter
    }
    // setIsLoading(false) is handled in the parent component after AI categorization attempt
  };

  return (
    <Card className="shadow-sm h-full border border-border/70 hover:shadow-md transition-shadow duration-200 bg-card"> {/* Use card bg, slightly more subtle border */}
       <CardHeader>
          <CardTitle className="text-xl">Upload Statement</CardTitle> {/* Slightly larger title */}
          <CardDescription>Select a CSV or PDF bank statement file.</CardDescription>
       </CardHeader>
       <CardContent className="space-y-4 pt-2"> {/* Reduced top padding */}
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
             className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-input file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/90 cursor-pointer text-muted-foreground" // Updated file button style
           />
         </div>
          {selectedFile && !isLoading && ( // Only show clear selection if not loading
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/50 p-2 px-3"> {/* Lighter background, subtler border */}
              <div className="flex items-center gap-2 text-sm overflow-hidden"> {/* Prevent overflow */}
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate text-foreground/90" title={selectedFile.name}>{selectedFile.name}</span> {/* Add title for full name, slightly darker text */}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex-shrink-0" // Ensure button doesn't shrink
                onClick={clearSelection}
                disabled={isLoading}
                aria-label="Clear file selection" // Accessibility
               >
                 <X className="h-4 w-4" />
               </Button>
            </div>
          )}
         <Button onClick={handleUpload} disabled={!selectedFile || isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"> {/* Primary button */}
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
