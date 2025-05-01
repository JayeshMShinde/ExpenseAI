'use server';

/**
 * @fileOverview An AI agent for categorizing transactions from bank statements.
 *
 * - categorizeTransactions - A function that categorizes a list of transactions.
 * - CategorizeTransactionsInput - The input type for the categorizeTransactions function.
 * - CategorizeTransactionsOutput - The return type for the categorizeTransactions function.
 */

import {ai} from '@/ai/ai-instance';
import type { Transaction, CategorizedTransaction } from '@/types'; // Use shared types
import {z} from 'genkit';

// Use the shared Transaction type for input, removing the ID as AI doesn't need it
const TransactionInputSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
});

const CategorizeTransactionsInputSchema = z.array(TransactionInputSchema).describe('A list of transactions to categorize.');
export type CategorizeTransactionsInput = z.infer<typeof CategorizeTransactionsInputSchema>;

// Define the output schema based on CategorizedTransaction, keeping ID for mapping back
const CategorizedTransactionOutputSchema = TransactionInputSchema.extend({
  // id: z.string().describe('The original ID of the transaction.'), // Include ID if needed for matching, but AI won't generate it. Let's rely on matching fields.
  category: z.string().describe('The category of the transaction.'),
});

// Output is an array of these categorized transactions
const CategorizeTransactionsOutputSchema = z.array(CategorizedTransactionOutputSchema).describe('A list of categorized transactions, matching the input structure plus a category.');
export type CategorizeTransactionsOutput = z.infer<typeof CategorizeTransactionsOutputSchema>;

export async function categorizeTransactions(input: CategorizeTransactionsInput): Promise<CategorizeTransactionsOutput> {
  return categorizeTransactionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTransactionsPrompt',
  input: {
    schema: z.object({
      transactions: z.array(TransactionInputSchema).describe('A list of transactions to categorize.'),
    }),
  },
  output: {
    // AI should output an array matching the structure it received, plus the category
    schema: z.array(
       TransactionInputSchema.extend({
         category: z.string().describe('The category of the transaction.'),
       })
     ),
  },
  prompt: `You are an expert financial assistant. Your task is to categorize bank transactions.

Use one of the following categories for each transaction:
- Food: Restaurants, cafes, groceries.
- Transport: Gas, public transit, ride-sharing, parking.
- Bills: Utilities (electricity, water, internet), rent/mortgage, subscriptions (streaming, software), insurance.
- Entertainment: Movies, concerts, hobbies, streaming services (if not under Bills).
- Shopping: Clothing, electronics, gifts, household items.
- Income: Salary, deposits, refunds.
- Other: Anything that doesn't fit neatly into the above categories (e.g., ATM withdrawals, bank fees, transfers).

Categorize the following transactions based on their description and amount. For deposits or positive amounts, categorize as 'Income'.

Transactions:
{{#each transactions}}
- Date: {{date}}, Description: "{{description}}", Amount: {{amount}}
{{/each}}

Return the result as a JSON array. Each object in the array should contain the original 'date', 'description', 'amount', and the assigned 'category'.
Example format for a single transaction in the output array:
{ "date": "YYYY-MM-DD", "description": "Transaction Description", "amount": -XX.XX, "category": "Chosen Category" }
`,
});


const categorizeTransactionsFlow = ai.defineFlow<
  typeof CategorizeTransactionsInputSchema,
  typeof CategorizeTransactionsOutputSchema
>(
  {
    name: 'categorizeTransactionsFlow',
    inputSchema: CategorizeTransactionsInputSchema,
    outputSchema: CategorizeTransactionsOutputSchema,
  },
  async input => {
     // Ensure input format matches prompt expectation
     const promptInput = { transactions: input };
    const {output} = await prompt(promptInput);

    // Basic validation: Check if the output is an array and has the same length
    if (!Array.isArray(output) || output.length !== input.length) {
      console.error('AI output mismatch: Expected array of same length as input.');
      // Attempt a fallback or throw error
       throw new Error('AI categorization failed: Output format mismatch.');
       // Fallback: Return input with null categories (or handle differently)
       // return input.map(tx => ({ ...tx, category: 'Other' }));
    }

    // Further validation could check if essential fields exist in each output object

    return output!;
  }
);
