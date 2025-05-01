'use server';

/**
 * @fileOverview Summarizes monthly expenses using AI to provide insights into spending habits.
 *
 * - summarizeExpenses - A function that summarizes expenses.
 * - SummarizeExpensesInput - The input type for the summarizeExpenses function.
 * - SummarizeExpensesOutput - The return type for the summarizeExpenses function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { CategorizedTransaction } from '@/types'; // Use shared type

// Input Schema based on CategorizedTransaction
const CategorizedTransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  category: z.string().nullable(), // Allow null categories
});

const SummarizeExpensesInputSchema = z.object({
  transactions: z
    .array(CategorizedTransactionSchema) // Use the schema based on the shared type
    .describe('An array of categorized transaction objects to summarize.'),
});
export type SummarizeExpensesInput = z.infer<typeof SummarizeExpensesInputSchema>;

const SummarizeExpensesOutputSchema = z.object({
  summary: z.string().describe('A concise, insightful summary of the user\'s monthly expenses based on categories.'),
});
export type SummarizeExpensesOutput = z.infer<typeof SummarizeExpensesOutputSchema>;

export async function summarizeExpenses(input: SummarizeExpensesInput): Promise<SummarizeExpensesOutput> {
  // Optional: Filter out transactions with null categories if the summary should only include categorized ones
  // const categorizedOnly = input.transactions.filter(tx => tx.category !== null);
  // return summarizeExpensesFlow({ transactions: categorizedOnly });
  return summarizeExpensesFlow(input);
}

const summarizeExpensesPrompt = ai.definePrompt({
  name: 'summarizeExpensesPrompt',
  input: {
    schema: z.object({
      transactions: z
        .array(CategorizedTransactionSchema) // Use the schema based on the shared type
        .describe('An array of categorized transaction objects to summarize.'),
    }),
  },
  output: {
    schema: SummarizeExpensesOutputSchema,
  },
  prompt: `You are an AI financial analyst. Analyze the provided list of categorized transactions and provide a brief summary (2-3 sentences) of the user's spending patterns for the month. Highlight the top spending categories and offer one simple observation or suggestion.

Transactions:
{{#each transactions}}
- Date: {{date}}, Description: "{{description}}", Amount: {{amount}}, Category: {{category ?? 'Uncategorized'}}
{{/each}}

Generate the summary. Focus on expenses (negative amounts).`,
});

const summarizeExpensesFlow = ai.defineFlow<
  typeof SummarizeExpensesInputSchema,
  typeof SummarizeExpensesOutputSchema
>(
  {
    name: 'summarizeExpensesFlow',
    inputSchema: SummarizeExpensesInputSchema,
    outputSchema: SummarizeExpensesOutputSchema,
  },
  async input => {
    const {output} = await summarizeExpensesPrompt(input);
    if (!output?.summary) {
       throw new Error("AI failed to generate expense summary.");
    }
    return output;
  }
);
