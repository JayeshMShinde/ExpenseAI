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
  // Allow category to be null or empty string from AI, handle downstream
  category: z.string().nullable().describe('The assigned category for the transaction (can be null if unsure).'),
});

const CategorizeTransactionsOutputSchema = z.array(CategorizedOutputSchema).describe('A list containing the category for each input transaction, returned in the *exact same order* as the input array.');
export type CategorizeTransactionsOutput = z.infer<typeof CategorizeTransactionsOutputSchema>;

export async function categorizeTransactions(input: CategorizeTransactionsInput): Promise<CategorizeTransactionsOutput> {
  // Add chunking logic if input is too large (e.g., > 100 transactions)
  const MAX_CHUNK_SIZE = 100; // Adjust as needed based on model limits/performance
  if (input.length > MAX_CHUNK_SIZE) {
    console.log(`Input too large (${input.length} transactions), chunking into sizes of ${MAX_CHUNK_SIZE}`);
    const chunks: CategorizeTransactionsInput[] = [];
    for (let i = 0; i < input.length; i += MAX_CHUNK_SIZE) {
      chunks.push(input.slice(i, i + MAX_CHUNK_SIZE));
    }

    const results: CategorizeTransactionsOutput = [];
    for (const chunk of chunks) {
       console.log(`Processing chunk of size ${chunk.length}`);
      try {
        const chunkResult = await categorizeTransactionsFlow(chunk);
        results.push(...chunkResult);
        // Optional: Add a small delay between chunks if hitting rate limits
        // await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
         console.error(`Error processing chunk: ${error}. Filling chunk with null categories.`);
         // Fill the result for this chunk with nulls on error
         results.push(...Array(chunk.length).fill({ category: null }));
      }
    }

    // Final length check after processing all chunks
    if (results.length !== input.length) {
       console.error(`CRITICAL: Final result length (${results.length}) does not match input length (${input.length}) after chunking. Returning potentially incomplete data.`);
       // Pad with nulls if necessary, though ideally this shouldn't happen if error handling is correct
        while (results.length < input.length) {
            results.push({ category: null });
        }
        if (results.length > input.length) {
            results.splice(input.length); // Truncate if too long
        }
    }
    return results;

  } else {
    // Process as a single chunk if within limits
    return categorizeTransactionsFlow(input);
  }
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

Analyze the following list of transactions. For EACH transaction in the input list, assign EXACTLY ONE category from the list below based primarily on its description and secondarily on the amount.
If the amount is positive, STRONGLY prefer the 'Income' category unless the description VERY clearly indicates a refund, return, or internal transfer.
If you are unsure or the transaction doesn't fit clearly, use 'Other'.

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

VERY IMPORTANT INSTRUCTIONS:
1. Return the result as a valid JSON array.
2. Each object in the array MUST contain ONLY the 'category' field (e.g., { "category": "Food" }).
3. The output array MUST have the EXACT same number of elements as the input transaction list. This is CRITICAL. Count the input items and ensure the output array matches.
4. The category for the transaction at index 'i' in the input list MUST be at index 'i' in the output array. MAINTAIN THE ORIGINAL ORDER STRICTLY.
5. If a transaction doesn't clearly fit any category, use 'Other'. Do NOT skip any transaction; provide a category (or 'Other') for every single input.

Example Input (3 transactions):
0. 2024-07-01, "Coffee Shop", -5.50
1. 2024-07-02, "Salary Deposit", 2500.00
2. 2024-07-04, "Gas Station", -50.00

Example Output Format (Must match number of inputs exactly):
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

    console.log(`Sending ${input.length} transactions to AI for categorization...`); // Log input count

    const {output} = await prompt(promptInput);

    console.log(`Received ${Array.isArray(output) ? output.length : 'non-array'} results from AI.`); // Log output count/type

    // Check if output is an array
    if (!Array.isArray(output)) {
        console.error(`AI output mismatch: Expected array, but received: ${typeof output}. Returning null categories.`);
        // Return an array of nulls with the expected length
        return Array(input.length).fill({ category: null });
    }

    // Handle length mismatch gracefully
    if (output.length !== input.length) {
        console.warn(`AI output length mismatch: Expected ${input.length}, received ${output.length}. Padding/truncating results.`);

        // Create a result array matching input length
        const correctedOutput: CategorizeTransactionsOutput = [];
        for (let i = 0; i < input.length; i++) {
            // Use the AI's category if available at the correct index, otherwise default to null
            const aiCategory = output[i]?.category;
            // Validate the category string (assign null if empty or not a string)
            const validatedCategory = (typeof aiCategory === 'string' && aiCategory.trim() !== '') ? aiCategory.trim() : null;
            correctedOutput.push({ category: validatedCategory });
        }
        return correctedOutput;

        // Old error throwing logic (replaced by graceful handling):
        // console.error(`AI output length mismatch: Expected ${input.length}, received ${output.length}`, output);
        // throw new Error(`AI categorization failed: Output format mismatch. Expected ${input.length} category objects, received ${output.length}.`);
    }

    // If lengths match, validate each category item
    const validatedOutput = output.map((item, index) => {
       const category = item?.category;
       if (typeof category === 'string' && category.trim() !== '') {
           return { category: category.trim() };
       } else {
           console.warn(`Invalid or missing category string at index ${index}. Defaulting to null.`);
           return { category: null }; // Default to null if category is missing, not a string, or empty
       }
    });

    // The output structure from the prompt matches the flow's output schema directly now.
    return validatedOutput;
  }
);
