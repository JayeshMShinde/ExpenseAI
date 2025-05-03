'use server';

/**
 * @fileOverview An AI agent for categorizing transactions from bank statements.
 *
 * - categorizeTransactions - A function that categorizes a list of transactions.
 * - CategorizeTransactionsInput - The input type for the categorizeTransactions function.
 * - CategorizeTransactionsOutput - The return type for the categorizeTransactions function.
 */

import {ai} from '@/ai/ai-instance';
// Transaction type is defined inline via Zod schema inference
import {z} from 'genkit';

// Define the input schema *without* id and category, as these are not sent to the AI
const TransactionInputSchema = z.object({
  date: z.string().describe("The date of the transaction (e.g., 'YYYY-MM-DD')."),
  description: z.string().describe("The description of the transaction from the statement."),
  amount: z.number().describe("The amount of the transaction. Negative for debits, positive for credits."),
});

const CategorizeTransactionsInputSchema = z.array(TransactionInputSchema).describe('A list of transactions to categorize.');
export type CategorizeTransactionsInput = z.infer<typeof CategorizeTransactionsInputSchema>;

// Define the output schema that the AI should return: just the category for each corresponding input transaction.
const CategorizedOutputSchema = z.object({
  category: z.string().describe('The assigned category for the transaction.'),
});

const CategorizeTransactionsOutputSchema = z.array(CategorizedOutputSchema).describe('A list containing the category for each input transaction, returned in the *exact same order* as the input array.');
export type CategorizeTransactionsOutput = z.infer<typeof CategorizeTransactionsOutputSchema>;

export async function categorizeTransactions(input: CategorizeTransactionsInput): Promise<CategorizeTransactionsOutput> {
  return categorizeTransactionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTransactionsPrompt',
  input: {
    schema: z.object({
      transactions: CategorizeTransactionsInputSchema, // Use the defined array schema
    }),
  },
  output: {
    // AI should output an array of objects, each containing only the category
    schema: CategorizeTransactionsOutputSchema, // Use the defined output schema
  },
  prompt: `You are an expert financial assistant specialized in categorizing bank transactions accurately and efficiently.

Analyze the following list of transactions. For each transaction, assign ONE category from the list below based primarily on its description and secondarily on the amount.
If the amount is positive, STRONGLY prefer the 'Income' category unless the description VERY clearly indicates a refund, return, or internal transfer.

Categories:
- Food: Restaurants, cafes, groceries, food delivery.
- Transport: Gas/fuel, public transit fares, ride-sharing (Uber, Lyft), parking fees, vehicle maintenance.
- Bills: Rent/mortgage, utilities (electricity, water, internet, phone), recurring subscriptions (streaming, software), insurance premiums, loan payments.
- Entertainment: Movies, concerts, events, hobbies, books, games, non-recurring streaming services.
- Shopping: Clothing, electronics, furniture, gifts, personal care items, online marketplaces (Amazon, etc.).
- Income: Salary, wages, deposits, bonuses, investment income, refunds (if explicitly stated).
- Health & Wellness: Doctor visits, pharmacy, gym memberships, health insurance (if not under Bills).
- Travel: Flights, hotels, accommodations, travel activities.
- Other: ATM withdrawals, bank fees, transfers between accounts, donations, education costs, government payments/fees, miscellaneous expenses not fitting elsewhere.

Transactions List (Index, Date, Description, Amount):
{{#each transactions}}
{{@index}}. {{date}}, "{{description}}", {{amount}}
{{/each}}

IMPORTANT INSTRUCTIONS:
1. Return the result as a JSON array.
2. Each object in the array MUST contain ONLY the 'category' field (e.g., { "category": "Food" }).
3. The output array MUST have the exact same number of elements as the input transaction list.
4. The category for the transaction at index 'i' in the input list MUST be at index 'i' in the output array. MAINTAIN THE ORIGINAL ORDER.
5. If a transaction doesn't clearly fit any category, use 'Other'.

Example Input (3 transactions):
0. 2024-07-01, "Coffee Shop", -5.50
1. 2024-07-02, "Salary Deposit", 2500.00
2. 2024-07-04, "Gas Station", -50.00

Example Output Format (Must match exactly):
[
  { "category": "Food" },
  { "category": "Income" },
  { "category": "Transport" }
]
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
  async (input) => {
     // The input here is already the array of transactions.
     // Wrap it in the object structure expected by the prompt's input schema.
     const promptInput = { transactions: input };

    console.log("Sending to AI for categorization:", JSON.stringify(promptInput, null, 2)); // Log input

    const {output} = await prompt(promptInput);

    console.log("Received from AI:", JSON.stringify(output, null, 2)); // Log output

    // Basic validation: Check if the output is an array and has the same length
    if (!output || !Array.isArray(output) || output.length !== input.length) {
       console.error(`AI output mismatch: Expected array of length ${input.length}, but received:`, output);
       // Throw a more informative error
       throw new Error(`AI categorization failed: Output format mismatch. Expected ${input.length} category objects, received ${Array.isArray(output) ? output.length : typeof output}.`);
     }

     // Optional: Further validation to check if each item has a 'category' string
     const invalidItems = output.filter((item, index) => typeof item?.category !== 'string' || item.category.trim() === '');
     if (invalidItems.length > 0) {
        console.error(`AI output mismatch: Some items lack a valid 'category' string or are empty. Invalid items:`, invalidItems);
        // You could try to salvage valid ones, but throwing is safer for consistency
        throw new Error(`AI categorization failed: Invalid item format in output at indices: ${output.map((item, index) => typeof item?.category !== 'string' ? index : -1).filter(i => i !== -1).join(', ')}.`);
     }

    // The output structure from the prompt matches the flow's output schema directly now.
    return output;
  }
);
