/**
 * Represents a transaction extracted from a bank statement.
 */
export interface Transaction {
  id: string; // Add an ID for key prop in lists
  /**
   * The date of the transaction.
   */
  date: string;
  /**
   * A description of the transaction.
   */
  description: string;
  /**
   * The amount of the transaction.  Positive values are credits, negative values are debits.
   */
  amount: number;
}

/**
 * Represents a transaction with an assigned category.
 */
export interface CategorizedTransaction extends Transaction {
  category: string | null; // Can be null initially or if uncategorized
}

/**
 * Represents the structure for expense summary data.
 */
export interface ExpenseSummary {
  category: string;
  total: number;
  fill: string; // Color for charts
}
