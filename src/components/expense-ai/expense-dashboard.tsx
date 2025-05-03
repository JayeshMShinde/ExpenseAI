'use client';

import { BarChart, PieChart, Activity } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Legend as RechartsLegend,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import type { CategorizedTransaction, ExpenseSummary } from '@/types';
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatting';
import type { CurrencyCode } from '@/app/page';


interface ExpenseDashboardProps {
  transactions: CategorizedTransaction[];
  selectedCurrency: CurrencyCode;
  isLoading: boolean; // Loading state for initial AI categorization
  selectedMonthDisplay: string; // Display text for the selected month (e.g., "July 2024" or "All Months")
}

// Define chart colors - Ensure these map to globals.css or define directly
const chartColors: { [key: string]: string } = {
  Food: "hsl(var(--chart-1))",
  Transport: "hsl(var(--chart-2))",
  Bills: "hsl(var(--chart-3))",
  Entertainment: "hsl(var(--chart-4))",
  Shopping: "hsl(var(--chart-5))",
  Income: "hsl(var(--accent))", // Use accent for income
  Other: "hsl(var(--muted))", // Use muted for other
};

// Dynamically create chart config based on detected categories and colors
const createChartConfig = (summary: ExpenseSummary[]): ChartConfig => {
  const config: ChartConfig = {
    total: { label: "Total Expenses" },
  };
  summary.forEach(item => {
    if (!config[item.category]) {
      config[item.category] = {
        label: item.category,
        color: item.fill,
      };
    }
  });
   // Add 'Other' if not present but expenses exist
   if (summary.length > 0 && !config['Other']) {
      config['Other'] = { label: 'Other', color: chartColors['Other'] };
   }
  return config;
};


export function ExpenseDashboard({ transactions, selectedCurrency, isLoading, selectedMonthDisplay }: ExpenseDashboardProps) {

  const expenseSummary = useMemo((): ExpenseSummary[] => {
     // Don't calculate summary while initial AI categorization might be running
     // isLoading specifically refers to the initial AI load now
     // if (isLoading) return []; // Keep this if you want charts blank during initial AI load

    const summary: { [key: string]: number } = {};
    transactions.forEach((tx) => {
      // Only include expenses (negative amounts)
      if (tx.amount < 0) {
         // Default uncategorized to 'Other', or skip if category is null and you only want categorized data
         const category = tx.category || 'Other';
         summary[category] = (summary[category] || 0) + Math.abs(tx.amount);
      }
    });

    return Object.entries(summary)
      .map(([category, total]) => ({
        category,
        total,
        fill: chartColors[category] || chartColors['Other'], // Assign color
      }))
      .sort((a, b) => b.total - a.total); // Sort descending by total
  }, [transactions]); // Recalculate whenever filtered transactions change

   const totalExpenses = useMemo(() => {
     // Recalculate total based on the current (potentially filtered) transactions
     return expenseSummary.reduce((sum, item) => sum + item.total, 0);
   }, [expenseSummary]);

   const chartConfig = useMemo(() => createChartConfig(expenseSummary), [expenseSummary]);

   const chartHeight = "280px"; // Define chart height once

  return (
    <Card className="shadow-md h-full bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Expense Dashboard</CardTitle>
         <CardDescription>
           {/* Show month context first, then loading or total */}
            <span className="font-medium">{selectedMonthDisplay}: </span>
            {isLoading ? ( // Show loading indicator during initial AI categorization
               <span className="italic text-muted-foreground">Analyzing...</span>
            ) : (
               `Total Expenses: ${formatCurrency(totalExpenses, selectedCurrency)}`
            )}
          </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
         {isLoading ? ( // Show loading skeleton only when initially loading (AI categorization)
             <div className={`flex flex-col items-center justify-center h-[${chartHeight}] space-y-3`}>
               <Skeleton className="h-36 w-36 rounded-full" />
               <Skeleton className="h-4 w-48" />
               <p className="text-sm text-muted-foreground pt-1">Categorizing expenses...</p>
             </div>
           ) : transactions.filter(tx => tx.amount < 0).length === 0 ? ( // Check if filtered transactions have any expenses
           <div className={`flex flex-col items-center justify-center h-[${chartHeight}] text-center`}>
              <Activity
                 className="h-12 w-12 text-muted-foreground opacity-30 mb-4"
                 strokeWidth={1.5}
               />
               <p className="text-muted-foreground font-medium">
                 No expense data for {selectedMonthDisplay}.
               </p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  Check the selected month or upload a statement with expenses.
                </p>
            </div>
         ) : (
          <Tabs defaultValue="bar">
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger value="bar"><BarChart className="mr-2 h-4 w-4" />Bar Chart</TabsTrigger>
              <TabsTrigger value="pie"><PieChart className="mr-2 h-4 w-4" />Pie Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="bar">
              <ChartContainer config={chartConfig} className={`h-[${chartHeight}] w-full`}>
                <RechartsBarChart
                   accessibilityLayer
                   data={expenseSummary}
                   layout="vertical"
                   margin={{ left: 0, right: 30, top: 5, bottom: 10 }}
                >
                   <CartesianGrid horizontal={false} strokeDasharray="2 3" opacity={0.5} />
                  <XAxis type="number" dataKey="total" hide />
                  <YAxis
                     dataKey="category"
                     type="category"
                     tickLine={false}
                     tickMargin={8}
                     axisLine={false}
                     tickFormatter={(value) => {
                       const label = chartConfig[value]?.label || value;
                       // Truncate long labels
                       const displayLabel = typeof label === 'string' ? (label.length > 12 ? label.substring(0, 12) + '…' : label) : label;
                       return displayLabel;
                     }}
                     width={90} // Increased width slightly for potentially longer truncated labels
                   />
                  <ChartTooltip
                     cursor={false}
                     content={<ChartTooltipContent hideLabel formatter={(value, name) => `${chartConfig[name]?.label}: ${formatCurrency(value as number, selectedCurrency)}`} />}
                   />
                   <Bar dataKey="total" layout="vertical" radius={4}>
                      {expenseSummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} name={entry.category} />
                      ))}
                    </Bar>
                </RechartsBarChart>
              </ChartContainer>
             </TabsContent>
             <TabsContent value="pie">
               <ChartContainer config={chartConfig} className={`h-[${chartHeight}] w-full`}>
                 <RechartsPieChart>
                   <ChartTooltip
                     cursor={false}
                      content={<ChartTooltipContent hideLabel formatter={(value, name) => `${chartConfig[name]?.label}: ${formatCurrency(value as number, selectedCurrency)}`} />}
                   />
                   <Pie
                     data={expenseSummary}
                     dataKey="total"
                     nameKey="category"
                     innerRadius={60}
                     outerRadius={90}
                     paddingAngle={2}
                     strokeWidth={1}
                     startAngle={90}
                     endAngle={-270}
                   >
                     {expenseSummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} name={entry.category} stroke={entry.fill} />
                      ))}
                   </Pie>
                   <RechartsLegend
                     content={<ChartLegendContent nameKey="category" className="text-xs flex-wrap justify-center gap-x-4 gap-y-1"/>}
                     verticalAlign="bottom"
                     wrapperStyle={{ paddingTop: '15px', paddingBottom: '0px' }}
                    />
                 </RechartsPieChart>
               </ChartContainer>
             </TabsContent>
           </Tabs>
         )}
      </CardContent>
    </Card>
  );
}
