# ExpenseAI - Intelligent Expense Tracker

This is a Next.js application built in Firebase Studio designed to help users track and analyze their expenses intelligently using AI.

## Features

*   **Bank Statement Upload:** Supports uploading bank statements in CSV or PDF format.
*   **AI-Powered Categorization:** Utilizes Genkit and Google AI (Gemini) to automatically categorize transactions based on their description and amount.
*   **Manual Categorization:** Allows users to manually edit or assign categories to transactions.
*   **Interactive Dashboard:** Displays expenses visually using bar and pie charts (powered by Recharts and ShadCN UI Charts).
*   **Currency Selection:** Supports viewing expenses in different currencies (INR/USD).
*   **Monthly Filtering:** Enables users to filter transactions and dashboard views by specific months or view all transactions.
*   **Responsive Design:** Built with Tailwind CSS and ShadCN UI for a consistent experience across devices.

## Technologies Used

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, ShadCN UI
*   **AI Integration:** Genkit, Google AI (Gemini)
*   **Charting:** Recharts, ShadCN UI Charts
*   **State Management:** React Hooks (`useState`, `useTransition`, `useMemo`)
*   **UI Components:** ShadCN UI
*   **File Parsing:** Mock parsing (can be replaced with libraries like PapaParse for CSV, pdf-parse for PDF)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Setup

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up environment variables:**
    *   Create a `.env` file in the root directory.
    *   Add your Google AI API key:
        ```env
        GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY
        ```
        *You can obtain an API key from [Google AI Studio](https://aistudio.google.com/).*

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    The application will be available at `http://localhost:9002` (or the specified port).

5.  **(Optional) Run Genkit development server:**
    If you need to test or debug Genkit flows independently, you can run:
    ```bash
    npm run genkit:dev
    # or for watching changes
    # npm run genkit:watch
    ```

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

*   `src/app/`: Main application pages and layout (Next.js App Router).
*   `src/components/`: Reusable UI components.
    *   `src/components/expense-ai/`: Components specific to the ExpenseAI feature.
    *   `src/components/ui/`: ShadCN UI components.
*   `src/ai/`: Genkit configuration and AI flows.
    *   `src/ai/flows/`: Specific AI tasks (categorization, summarization).
*   `src/lib/`: Utility functions (styling, formatting).
*   `src/services/`: Service functions (e.g., file parsing).
*   `src/types/`: TypeScript type definitions.
*   `public/`: Static assets.
*   `styles/`: Global CSS and Tailwind configuration.

## How It Works

1.  **Upload:** The user uploads a CSV or PDF bank statement via the `FileUpload` component.
2.  **Parse:** The `file-parser.ts` service (currently mocked) extracts transactions (`Transaction` type).
3.  **Categorize:**
    *   The main page (`src/app/page.tsx`) receives the parsed transactions.
    *   It calls the `categorizeTransactions` flow (`src/ai/flows/categorize-transactions.ts`).
    *   This flow uses Genkit and Google AI to analyze the transaction descriptions and amounts, returning suggested categories.
    *   The transactions are updated with the AI-assigned categories (`CategorizedTransaction` type).
4.  **Display:**
    *   The `TransactionTable` component displays the transactions, allowing manual category edits.
    *   The `ExpenseDashboard` component visualizes expense data by category using charts.
5.  **Interact:** Users can change the currency and filter transactions by month, updating both the table and the dashboard.
