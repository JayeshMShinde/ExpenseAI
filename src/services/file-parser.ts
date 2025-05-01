import type { Transaction } from '@/types'; // Import from the new types file

/**
 * Asynchronously parses a bank statement file (CSV or PDF) and extracts transaction data.
 *
 * **Note:** This is a mock implementation. Replace with actual parsing logic.
 *
 * @param file The file to parse.
 * @param fileType The type of the file ('csv' or 'pdf').
 * @returns A promise that resolves to an array of Transaction objects without IDs.
 */
export async function parseBankStatement(
  file: File,
  fileType: 'csv' | 'pdf'
): Promise<Omit<Transaction, 'id'>[]> { // Return type without 'id'

  console.log(`Parsing ${fileType} file: ${file.name}`);

  // Simulate network delay or processing time
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock data - Replace with actual parsing logic
  const mockTransactions: Omit<Transaction, 'id'>[] = [
    { date: '2024-07-01', description: 'Coffee Shop', amount: -5.50 },
    { date: '2024-07-01', description: 'Grocery Store', amount: -75.20 },
    { date: '2024-07-02', description: 'Salary Deposit', amount: 2500.00 },
    { date: '2024-07-03', description: 'Restaurant Dinner', amount: -45.00 },
    { date: '2024-07-04', description: 'Gas Station', amount: -50.00 },
    { date: '2024-07-05', description: 'Online Shopping - Books', amount: -30.00 },
    { date: '2024-07-06', description: 'Electricity Bill Payment', amount: -120.00 },
    { date: '2024-07-07', description: 'Movie Tickets', amount: -25.00 },
    { date: '2024-07-08', description: 'Public Transport Pass', amount: -60.00 },
    { date: '2024-07-09', description: 'Lunch with Friends', amount: -35.75 },
     { date: '2024-07-10', description: 'Gym Membership Fee', amount: -40.00 },
     { date: '2024-07-11', description: 'ATM Withdrawal', amount: -100.00 },
     { date: '2024-07-12', description: 'Streaming Service Subscription', amount: -15.99 },
     { date: '2024-07-13', description: 'Pharmacy Purchase', amount: -18.50 },
     { date: '2024-07-14', description: 'Concert Tickets', amount: -85.00 },
  ];

  // Simulate potential error for PDF parsing sometimes
  if (fileType === 'pdf' && Math.random() < 0.1) { // 10% chance of error for PDF
     throw new Error("Simulated PDF parsing error");
   }

  // In a real scenario, you'd use a library like PapaParse for CSV
  // or pdf-parse / pdfjs-dist for PDF and extract data.
  // This mock returns predefined data regardless of file content.
  return mockTransactions;
}
