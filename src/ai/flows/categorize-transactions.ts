'use server';

/**
 * @fileOverview An AI agent for categorizing transactions from bank statements.
 *
 * - categorizeTransactions - A function that categorizes a list of transactions.
 * - CategorizeTransactionsInput - The input type for the categorizeTransactions function.
 * - CategorizeTransactionsOutput - The return type for the categorizeTransactions function.
 */

import {ai} from '@/ai/ai-instance';
// Remove Transaction import, define inline or rely on Zod schema inference
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
// We will map this back to the original transactions in the main component.
const CategorizedOutputSchema = z.object({
  category: z.string().describe('The assigned category for the transaction.'),
  // Include original index or a key field if matching becomes ambiguous
  // originalIndex: z.number().optional().describe('Original index from input array, if needed for matching')
});

const CategorizeTransactionsOutputSchema = z.array(CategorizedOutputSchema).describe('A list containing the category for each input transaction, in the same order.');
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
    schema: z.array(
       z.object({
         category: z.string().describe('The assigned category for the transaction.'),
         // originalIndex: z.number().optional().describe('Optional: Original index from input array if helpful')
       })
     ).describe('An array containing the category for each input transaction, in the same order.'),
  },
  prompt: `You are an expert financial assistant specialized in categorizing bank transactions efficiently.

Analyze the following list of transactions. For each transaction, assign ONE category from the list below based on its description and amount.
If the amount is positive, categorize it as 'Income' unless the description clearly indicates a refund or transfer type.

Categories:
- Food: Restaurants, cafes, groceries, food delivery.
- Transport: Gas/fuel, public transit fares, ride-sharing (Uber, Lyft), parking fees, vehicle maintenance.
- Bills: Rent/mortgage, utilities (electricity, water, internet, phone), subscriptions (streaming, software), insurance premiums, loan payments.
- Entertainment: Movies, concerts, events, hobbies, books, games, streaming services (if not a recurring Bill).
- Shopping: Clothing, electronics, furniture, gifts, personal care items, online marketplaces (Amazon, etc.).
- Income: Salary, wages, deposits, bonuses, investment income, refunds (if clearly stated).
- Health & Wellness: Doctor visits, pharmacy, gym memberships, health insurance (if not under Bills).
- Travel: Flights, hotels, accommodations, travel activities.
- Other: ATM withdrawals, bank fees, transfers between accounts, donations, education costs, miscellaneous expenses not fitting elsewhere.

Transactions:
{{#each transactions}}
{{@index}}. Date: {{date}}, Desc: "{{description}}", Amt: {{amount}}
{{/each}}

Return the result as a JSON array. Each object in the array MUST only contain the 'category' field corresponding to the transaction at the same index in the input list. Ensure the output array has the exact same number of elements as the input transaction list.

Example Output Format (for 3 input transactions):
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

    const {output} = await prompt(promptInput);

    // Basic validation: Check if the output is an array and has the same length
    if (!output || !Array.isArray(output) || output.length !== input.length) {
       console.error(`AI output mismatch: Expected array of length ${input.length}, but received:`, output);
       // Option 1: Throw an error
       throw new Error(`AI categorization failed: Output format mismatch. Expected ${input.length} items.`);
       // Option 2: Return a default structure (e.g., all 'Other') - careful about implications
       // return input.map(() => ({ category: 'Other' }));
     }

     // Optional: Further validation to check if each item has a 'category' string
     const isValid = output.every(item => typeof item?.category === 'string');
     if (!isValid) {
        console.error(`AI output mismatch: Some items lack a 'category' string. Received:`, output);
        throw new Error('AI categorization failed: Invalid item format in output.');
     }

    // The output structure from the prompt matches the flow's output schema directly now.
    return output;
  }
);
