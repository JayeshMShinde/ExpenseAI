import { addDays, format, subMonths } from 'date-fns';
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

    // Mock data for the last three months
    const mockTransactions: Omit<Transaction, 'id'>[] = [];
    const today = new Date();
    const startDate = subMonths(today, 2); // Start two months ago

    for (let m = 0; m < 3; m++) {
        const currentMonth = subMonths(startDate, -m); // Iterate through each month
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            // Generate a varying number of transactions per day
            const transactionsPerDay = Math.floor(Math.random() * 5) + 1; // 1 to 5 transactions

            for (let t = 0; t < transactionsPerDay; t++) {
                const transactionDate = addDays(currentMonth, d - 1);
                const formattedDate = format(transactionDate, 'yyyy-MM-dd');

                const amount = parseFloat((Math.random() * 200 - 100).toFixed(2)); // Random amount between -100 and 100
                const descriptions = ["Coffee Shop", "Grocery Store", "Salary Deposit", "Restaurant Dinner", "Gas Station", "Online Shopping", "Utility Bill", "ATM Withdrawal", "Transfer", "Pharmacy"];
                const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
                
                mockTransactions.push({
                  date: formattedDate,
                  description: `${randomDescription} ${Math.random() > 0.5 ? `(${t+1})`:''}`, // Append counter to make descriptions more unique
                  amount,
                });
            }
        }
    }

  // Simulate potential error for PDF parsing sometimes
    if (fileType === 'pdf' && Math.random() < 0.1) { // 10% chance of error for PDF
        throw new Error("Simulated PDF parsing error");
    }

  // In a real scenario, you'd use a library like PapaParse for CSV
  // or pdf-parse / pdfjs-dist for PDF and extract data.
  // This mock returns predefined data regardless of file content.
  return mockTransactions;
}
