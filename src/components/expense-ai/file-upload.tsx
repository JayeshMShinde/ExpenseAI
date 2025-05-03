"use client";

import type * as React from "react";
import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2, ArrowUpCircle } from "lucide-react"; // Added ArrowUpCircle

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { parseBankStatement } from "@/services/file-parser";
import type { Transaction } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface FileUploadProps {
  onTransactionsParsed: (transactions: Transaction[]) => void;
  setIsLoading: (loading: boolean) => void;
  isLoading: boolean;
}

export function FileUpload({
  onTransactionsParsed,
  setIsLoading,
  isLoading,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    processFile(file);
  };

  const processFile = (file?: File) => {
    if (file) {
      if (file.type === "text/csv" || file.type === "application/pdf") {
        setSelectedFile(file);
        toast({
          title: "File Selected",
          description: `Ready to process: ${file.name}`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV or PDF file.",
          variant: "destructive",
        });
        clearSelection();
      }
    } else {
      clearSelection();
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fileType = selectedFile.type === "text/csv" ? "csv" : "pdf";
      let counter = 0;
      const parsedTransactions = await parseBankStatement(
        selectedFile,
        fileType
      );
      const transactionsWithIds = parsedTransactions.map((tx) => ({
        ...tx,
        id: `tx-${Date.now()}-${counter++}`,
      }));

      onTransactionsParsed(transactionsWithIds);
      clearSelection();
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Parsing Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to parse ${selectedFile.name}. Please check the file format or try again.`,
        variant: "destructive",
      });
      onTransactionsParsed([]);
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isLoading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div className="p-2">
      <Card className="shadow-md h-full border border-border/70 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Statement
          </CardTitle>
          <CardDescription>
            Select a CSV or PDF bank statement file to analyze your expenses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div
            className={`border-2 border-dashed rounded-lg ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-primary/50 bg-secondary/30"
            } transition-all duration-300 relative`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Input
              id="bank-statement"
              type="file"
              ref={fileInputRef}
              accept=".csv,.pdf"
              onChange={handleFileChange}
              disabled={isLoading}
              className="file:hidden cursor-pointer opacity-0 absolute inset-0 z-10"
            />
            <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
              <ArrowUpCircle
                className={`h-10 w-10 mb-3 ${
                  isDragging
                    ? "text-primary animate-bounce"
                    : "text-muted-foreground"
                }`}
              />
              <p className="text-sm font-medium mb-1">
                {isDragging ? "Drop file here" : "Drag & drop your file here"}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                or click to browse
              </p>
              <span className="px-3 py-1 bg-secondary/80 text-xs rounded-full text-muted-foreground">
                CSV or PDF files only
              </span>
            </div>
          </div>

          {selectedFile && !isLoading && (
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/70 p-3 transform transition-all duration-200 hover:bg-secondary/90">
              <div className="flex items-center gap-3 text-sm overflow-hidden">
                <div className="bg-primary/10 p-2 rounded-full">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                </div>
                <div className="overflow-hidden">
                  <p
                    className="font-medium truncate text-foreground/90"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB ·{" "}
                    {selectedFile.type === "text/csv" ? "CSV" : "PDF"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex-shrink-0 rounded-full"
                onClick={clearSelection}
                disabled={isLoading}
                aria-label="Clear file selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all duration-300 hover:shadow group"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4 group-hover:translate-y-[-2px] transition-transform" />
                Upload & Analyze
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
