'use client';

import { BarChart, PieChart, Activity } from 'lucide-react'; // Added Activity icon for empty state
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
  isLoading: boolean; // Use the isLoading prop from parent
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


export function ExpenseDashboard({ transactions, selectedCurrency, isLoading }: ExpenseDashboardProps) {

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

   const chartHeight = "280px"; // Define chart height once

  return (
    <Card className="shadow-md h-full bg-card"> {/* Ensure card takes full height and uses card background */}
      <CardHeader>
        <CardTitle className="text-xl">Expense Dashboard</CardTitle> {/* Slightly larger title */}
         <CardDescription>
            {isLoading && expenseSummary.length === 0 ? ( // Show skeleton only when truly loading initial data
               <Skeleton className="h-5 w-40" /> /* Skeleton for total */
            ) : (
               `Total Expenses: ${formatCurrency(totalExpenses, selectedCurrency)}`
            )}
          </CardDescription>
      </CardHeader>
      <CardContent className="pt-2"> {/* Reduced top padding */}
         {isLoading && expenseSummary.length === 0 ? ( // Show loading skeleton only when initially loading
             <div className={`flex flex-col items-center justify-center h-[${chartHeight}] space-y-3`}> {/* Match chart height */}
               <Skeleton className="h-36 w-36 rounded-full" />
               <Skeleton className="h-4 w-48" />
               <p className="text-sm text-muted-foreground pt-1">Categorizing expenses...</p>
             </div>
           ) : transactions.filter(tx => tx.amount < 0).length === 0 ? ( // Check if there are any actual expenses
           <div className={`flex flex-col items-center justify-center h-[${chartHeight}] text-center`}> {/* Match chart height */}
              <Activity
                 className="h-12 w-12 text-muted-foreground opacity-30 mb-4"
                 strokeWidth={1.5}
               />
               <p className="text-muted-foreground font-medium">
                 No expense data to display.
               </p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  Upload a statement or ensure it contains expense transactions.
                </p>
            </div>
         ) : (
          <Tabs defaultValue="bar">
            <TabsList className="grid w-full grid-cols-2 mb-5"> {/* Increased margin bottom */}
              <TabsTrigger value="bar"><BarChart className="mr-2 h-4 w-4" />Bar Chart</TabsTrigger>
              <TabsTrigger value="pie"><PieChart className="mr-2 h-4 w-4" />Pie Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="bar">
               {/* Add explicit height for ChartContainer */}
              <ChartContainer config={chartConfig} className={`h-[${chartHeight}] w-full`}>
                <RechartsBarChart
                   accessibilityLayer
                   data={expenseSummary}
                   layout="vertical"
                   margin={{ left: 0, right: 30, top: 5, bottom: 10 }} // Adjusted margins, less left margin
                >
                   <CartesianGrid horizontal={false} strokeDasharray="2 3" opacity={0.5} />
                  <XAxis type="number" dataKey="total" hide />
                  <YAxis
                     dataKey="category"
                     type="category"
                     tickLine={false}
                     tickMargin={8} // Reduced tick margin
                     axisLine={false}
                     tickFormatter={(value) => {
                       const label = chartConfig[value]?.label || value;
                       return typeof label === 'string' ? (label.length > 10 ? label.substring(0, 10) + '...' : label) : label;
                     }}
                     width={80} // Ensure enough width for labels
                   />
                  <ChartTooltip
                     cursor={false}
                     content={<ChartTooltipContent hideLabel formatter={(value, name) => `${chartConfig[name]?.label}: ${formatCurrency(value as number, selectedCurrency)}`} />} // Format currency in tooltip, show label
                   />
                   <Bar dataKey="total" layout="vertical" radius={4}> {/* Slightly rounded bars */}
                      {expenseSummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} name={entry.category} /> // Pass category as name
                      ))}
                    </Bar>
                </RechartsBarChart>
              </ChartContainer>
             </TabsContent>
             <TabsContent value="pie">
               {/* Add explicit height for ChartContainer */}
               <ChartContainer config={chartConfig} className={`h-[${chartHeight}] w-full`}>
                 <RechartsPieChart>
                   <ChartTooltip
                     cursor={false}
                      content={<ChartTooltipContent hideLabel formatter={(value, name) => `${chartConfig[name]?.label}: ${formatCurrency(value as number, selectedCurrency)}`} />} // Format currency in tooltip, show label
                   />
                   <Pie
                     data={expenseSummary}
                     dataKey="total"
                     nameKey="category"
                     innerRadius={60} // Slightly larger inner radius
                     outerRadius={90} // Slightly larger outer radius
                     paddingAngle={2} // Add padding between slices
                     strokeWidth={1} // Thinner stroke
                     startAngle={90}
                     endAngle={-270} // Animate clockwise
                   >
                     {expenseSummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} name={entry.category} stroke={entry.fill} /> // Pass name for tooltip/legend
                      ))}
                   </Pie>
                   <RechartsLegend
                     content={<ChartLegendContent nameKey="category" className="text-xs flex-wrap justify-center gap-x-4 gap-y-1"/>} // Allow wrapping, add gaps
                     verticalAlign="bottom"
                     wrapperStyle={{ paddingTop: '15px', paddingBottom: '0px' }} // Adjust padding
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
