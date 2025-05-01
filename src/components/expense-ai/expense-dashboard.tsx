'use client';

import { BarChart, PieChart } from 'lucide-react';
import type { BarChartConfig } from 'recharts';
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

interface ExpenseDashboardProps {
  transactions: CategorizedTransaction[];
}

// Define chart colors - Ensure these map to globals.css or define directly
const chartColors = {
  Food: "hsl(var(--chart-1))",
  Transport: "hsl(var(--chart-2))",
  Bills: "hsl(var(--chart-3))",
  Entertainment: "hsl(var(--chart-4))",
  Shopping: "hsl(var(--chart-5))",
  Income: "hsl(var(--accent))", // Use accent for income
  Other: "hsl(var(--muted))", // Use muted for other
};

const defaultChartConfig = {
  total: { label: "Total Expenses" },
  ...Object.keys(chartColors).reduce((acc, key) => {
    acc[key] = { label: key, color: chartColors[key] };
    return acc;
  }, {} as ChartConfig), // Add index signature to satisfy ChartConfig type
} satisfies ChartConfig;


export function ExpenseDashboard({ transactions }: ExpenseDashboardProps) {

  const expenseSummary = useMemo((): ExpenseSummary[] => {
    const summary: { [key: string]: number } = {};
    transactions.forEach((tx) => {
      if (tx.category && tx.amount < 0) { // Only sum expenses (negative amounts)
        const category = tx.category;
        summary[category] = (summary[category] || 0) + Math.abs(tx.amount);
      } else if (tx.amount < 0) { // Uncategorized expenses
         summary['Other'] = (summary['Other'] || 0) + Math.abs(tx.amount);
      }
    });

    return Object.entries(summary).map(([category, total]) => ({
      category,
      total,
      fill: chartColors[category] || chartColors['Other'], // Assign color
    }));
  }, [transactions]);

   const totalExpenses = useMemo(() => {
     return expenseSummary.reduce((sum, item) => sum + item.total, 0);
   }, [expenseSummary]);

   const formatCurrency = (value: number) =>
     new Intl.NumberFormat("en-US", {
       style: "currency",
       currency: "USD",
     }).format(value);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Monthly Expense Dashboard</CardTitle>
         <CardDescription>
            Total Expenses: {formatCurrency(totalExpenses)}
          </CardDescription>
      </CardHeader>
      <CardContent>
         {expenseSummary.length === 0 ? (
           <p className="text-center text-muted-foreground">
             No expense data to display. Upload transactions first.
           </p>
         ) : (
          <Tabs defaultValue="bar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bar"><BarChart className="mr-2 h-4 w-4" />Bar Chart</TabsTrigger>
              <TabsTrigger value="pie"><PieChart className="mr-2 h-4 w-4" />Pie Chart</TabsTrigger>
            </TabsList>
            <TabsContent value="bar">
              <ChartContainer config={defaultChartConfig} className="min-h-[200px] w-full aspect-auto">
                <RechartsBarChart accessibilityLayer data={expenseSummary} layout="vertical" margin={{ left: 20, right: 20 }}>
                   <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="total" hide />
                  <YAxis
                     dataKey="category"
                     type="category"
                     tickLine={false}
                     tickMargin={10}
                     axisLine={false}
                     tickFormatter={(value) => defaultChartConfig[value]?.label || value}
                   />
                  <ChartTooltip
                     cursor={false}
                     content={<ChartTooltipContent hideLabel />}
                   />
                   <RechartsLegend content={<ChartLegendContent />} />
                   <Bar dataKey="total" layout="vertical" radius={5}>
                      {expenseSummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} />
                      ))}
                    </Bar>
                </RechartsBarChart>
              </ChartContainer>
             </TabsContent>
             <TabsContent value="pie">
               <ChartContainer config={defaultChartConfig} className="min-h-[200px] w-full aspect-auto">
                 <RechartsPieChart>
                   <ChartTooltip
                     cursor={false}
                     content={<ChartTooltipContent hideLabel />}
                   />
                   <Pie
                     data={expenseSummary}
                     dataKey="total"
                     nameKey="category"
                     innerRadius={60}
                     strokeWidth={5}
                   >
                     {expenseSummary.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} />
                      ))}
                   </Pie>
                   <RechartsLegend content={<ChartLegendContent nameKey="category" />} />
                 </RechartsPieChart>
               </ChartContainer>
             </TabsContent>
           </Tabs>
         )}
      </CardContent>
    </Card>
  );
}
