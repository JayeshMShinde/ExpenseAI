'use client';

import { BarChart, PieChart } from 'lucide-react';
import type { BarChartConfig } from 'recharts'; // Keep this if specific config type is needed
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
import { formatCurrency } from '@/lib/formatting'; // Import the utility function
import type { CurrencyCode } from '@/app/page'; // Import CurrencyCode type


interface ExpenseDashboardProps {
  transactions: CategorizedTransaction[];
  selectedCurrency: CurrencyCode; // Add currency prop
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
   // Add 'Other' if not present but transactions exist
   if (summary.length > 0 && !config['Other']) {
      config['Other'] = { label: 'Other', color: chartColors['Other'] };
   }
  return config;
};


export function ExpenseDashboard({ transactions, selectedCurrency }: ExpenseDashboardProps) {

   // Determine if transactions are still loading (any category is null and data exists)
   const isLoading = useMemo(() => {
     return transactions.length > 0 && transactions.some(tx => tx.category === null);
   }, [transactions]);

  const expenseSummary = useMemo((): ExpenseSummary[] => {
     // Don't calculate summary while initial AI categorization might be running
     if (isLoading) return [];

    const summary: { [key: string]: number } = {};
    transactions.forEach((tx) => {
      // Only include expenses (negative amounts)
      if (tx.amount < 0) {
         const category = tx.category || 'Other'; // Default uncategorized to 'Other'
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
  }, [transactions, isLoading]);

   const totalExpenses = useMemo(() => {
     if (isLoading) return 0;
     return expenseSummary.reduce((sum, item) => sum + item.total, 0);
   }, [expenseSummary, isLoading]);

   const chartConfig = useMemo(() => createChartConfig(expenseSummary), [expenseSummary]);

  return (
    <Card className="shadow-md h-full"> {/* Ensure card takes full height */}
      <CardHeader>
        <CardTitle>Monthly Expense Dashboard</CardTitle>
         <CardDescription>
            {isLoading ? (
               <Skeleton className="h-5 w-32" /> /* Skeleton for total */
            ) : (
               `Total Expenses: ${formatCurrency(totalExpenses, selectedCurrency)}`
            )}
          </CardDescription>
      </CardHeader>
      <CardContent>
         {isLoading ? (
             <div className="flex flex-col items-center justify-center h-[250px] space-y-2"> {/* Match chart height */}
               <Skeleton className="h-32 w-32 rounded-full" />
               <Skeleton className="h-4 w-48" />
                <p className="text-sm text-muted-foreground">Categorizing expenses...</p>
             </div>
           ) : expenseSummary.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-[250px] text-center"> {/* Match chart height */}
              <svg
                 xmlns="http://www.w3.org/2000/svg"
                 width="24"
                 height="24"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="2"
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 className="h-12 w-12 text-muted-foreground opacity-30 mb-4"
               >
                 <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                 <path d="M7 8h10"></path>
                 <path d="M7 12h5"></path>
                 <path d="M10 16h4"></path>
                 <path d="m17.5 13.5-1.8 1.8-1.7-1.7"></path>
                 <path d="M14 16h.01"></path>
               </svg>
               <p className="text-muted-foreground">
                 No expense data to display.
               </p>
                <p className="text-sm text-muted-foreground/80">
                  Upload a transaction file first.
                </p>
            </div>
         ) : (
          <Tabs defaultValue="bar">
            <TabsList className="grid w-full grid-cols-2 mb-4"> {/* Add margin bottom */}
              <TabsTrigger value="bar"><BarChart className="mr-2 h-4 w-4" />Bar</TabsTrigger>
              <TabsTrigger value="pie"><PieChart className="mr-2 h-4 w-4" />Pie</TabsTrigger>
            </TabsList>
            <TabsContent value="bar">
               {/* Add explicit height for ChartContainer */}
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <RechartsBarChart
                   accessibilityLayer
                   data={expenseSummary}
                   layout="vertical"
                   margin={{ left: 10, right: 30, top: 10, bottom: 10 }} // Adjusted margins
                >
                   <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="total" hide />
                  <YAxis
                     dataKey="category"
                     type="category"
                     tickLine={false}
                     tickMargin={10}
                     axisLine={false}
                     tickFormatter={(value) => chartConfig[value]?.label || value}
                     width={80} // Adjust width for labels if needed
                   />
                  <ChartTooltip
                     cursor={false}
                     content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(value as number, selectedCurrency)} />} // Format currency in tooltip
                   />
                   {/* <RechartsLegend content={<ChartLegendContent />} /> */}
                   <Bar dataKey="total" layout="vertical" radius={4}> {/* Slightly rounded bars */}
                      {expenseSummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} name={chartConfig[entry.category]?.label as string} /> // Pass name for tooltip/legend
                      ))}
                    </Bar>
                </RechartsBarChart>
              </ChartContainer>
             </TabsContent>
             <TabsContent value="pie">
               {/* Add explicit height for ChartContainer */}
               <ChartContainer config={chartConfig} className="h-[250px] w-full">
                 <RechartsPieChart>
                   <ChartTooltip
                     cursor={false}
                     content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(value as number, selectedCurrency)} />} // Format currency in tooltip
                   />
                   <Pie
                     data={expenseSummary}
                     dataKey="total"
                     nameKey="category"
                     innerRadius={50} // Slightly smaller inner radius
                     outerRadius={80} // Slightly smaller outer radius
                     strokeWidth={3}
                     startAngle={90}
                     endAngle={-270} // Animate clockwise
                   >
                     {expenseSummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} name={chartConfig[entry.category]?.label as string} /> // Pass name for tooltip/legend
                      ))}
                   </Pie>
                   <RechartsLegend
                     content={<ChartLegendContent nameKey="category" className="text-xs"/>} // Smaller legend text
                     verticalAlign="bottom"
                     wrapperStyle={{ paddingTop: '20px' }} // Add padding above legend
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
