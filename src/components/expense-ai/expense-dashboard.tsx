"use client";

import {
  BarChart,
  PieChart,
  Activity,
  TrendingUp,
  ArrowDown,
  Loader2,
} from "lucide-react"; // Added Loader2 import
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
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { CategorizedTransaction, ExpenseSummary } from "@/types";
import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatting";
import type { CurrencyCode } from "@/app/page";

interface ExpenseDashboardProps {
  transactions: CategorizedTransaction[];
  selectedCurrency: CurrencyCode;
  isLoading: boolean;
  selectedMonthDisplay: string;
}

// Enhanced chart colors with richer hues
const chartColors: { [key: string]: string } = {
  Food: "hsl(var(--chart-1))",
  Transport: "hsl(var(--chart-2))",
  Bills: "hsl(var(--chart-3))",
  Entertainment: "hsl(var(--chart-4))",
  Shopping: "hsl(var(--chart-5))",
  Income: "hsl(var(--accent))",
  Other: "hsl(var(--muted))",
};

const createChartConfig = (summary: ExpenseSummary[]): ChartConfig => {
  const config: ChartConfig = {
    total: { label: "Total Expenses" },
  };
  summary.forEach((item) => {
    if (!config[item.category]) {
      config[item.category] = {
        label: item.category,
        color: item.fill,
      };
    }
  });
  if (summary.length > 0 && !config["Other"]) {
    config["Other"] = { label: "Other", color: chartColors["Other"] };
  }
  return config;
};

export function ExpenseDashboard({
  transactions,
  selectedCurrency,
  isLoading,
  selectedMonthDisplay,
}: ExpenseDashboardProps) {
  // Calculate expense summary
  const expenseSummary = useMemo((): ExpenseSummary[] => {
    const summary: { [key: string]: number } = {};
    transactions.forEach((tx) => {
      if (tx.amount < 0) {
        const category = tx.category || "Other";
        summary[category] = (summary[category] || 0) + Math.abs(tx.amount);
      }
    });

    return Object.entries(summary)
      .map(([category, total]) => ({
        category,
        total,
        fill: chartColors[category] || chartColors["Other"],
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return expenseSummary.reduce((sum, item) => sum + item.total, 0);
  }, [expenseSummary]);

  // Find top expense category and percentage
  const topCategory = useMemo(() => {
    if (expenseSummary.length === 0) return null;
    const top = expenseSummary[0];
    const percentage = (top.total / totalExpenses) * 100;
    return {
      name: top.category,
      percentage: Math.round(percentage),
      fill: top.fill,
    };
  }, [expenseSummary, totalExpenses]);

  // Calculate income summary
  const incomeSummary = useMemo(() => {
    const income = transactions
      .filter((tx) => tx.amount > 0)
      .reduce((total, tx) => total + tx.amount, 0);

    return {
      total: income,
      net: income - totalExpenses,
    };
  }, [transactions, totalExpenses]);

  const chartConfig = useMemo(
    () => createChartConfig(expenseSummary),
    [expenseSummary]
  );
  const chartHeight = "280px";

  return (
    <div className="p-2">
      <Card className="shadow-md h-full bg-gradient-to-br from-card to-card/95 border-border/80 hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Expense Analytics
            </CardTitle>

            <div className="bg-secondary/70 px-3 py-1 rounded-full text-sm font-medium">
              {selectedMonthDisplay}
            </div>
          </div>

          <CardDescription className="flex gap-6 mt-2">
            {isLoading ? (
              <span className="italic text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing data...
              </span>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    Total Expenses
                  </span>
                  <span className="font-semibold text-destructive">
                    {formatCurrency(totalExpenses, selectedCurrency)}
                  </span>
                </div>

                {incomeSummary.total > 0 && (
                  <>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Total Income
                      </span>
                      <span className="font-semibold text-accent">
                        {formatCurrency(incomeSummary.total, selectedCurrency)}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Net Balance
                      </span>
                      <span
                        className={`font-semibold ${
                          incomeSummary.net >= 0
                            ? "text-emerald-500"
                            : "text-destructive"
                        }`}
                      >
                        {formatCurrency(incomeSummary.net, selectedCurrency)}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <div
              className={`flex flex-col items-center justify-center h-[${chartHeight}] space-y-3`}
            >
              <div className="relative">
                <Skeleton className="h-36 w-36 rounded-full" />
                <Skeleton className="h-36 w-36 rounded-full absolute top-0 left-0 animate-pulse opacity-50" />
              </div>
              <Skeleton className="h-4 w-48" />
              <p className="text-sm text-muted-foreground pt-1">
                Categorizing your transactions...
              </p>
            </div>
          ) : transactions.filter((tx) => tx.amount < 0).length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center h-[${chartHeight}] text-center`}
            >
              <div className="bg-muted/30 p-5 rounded-full mb-4">
                <Activity
                  className="h-12 w-12 text-muted-foreground opacity-30"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-muted-foreground font-medium">
                No expense data for {selectedMonthDisplay}.
              </p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Check the selected month or upload a statement with expenses.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="pie" className="mt-1">
              <TabsList className="grid w-full grid-cols-2 mb-5 bg-muted/60 p-1">
                <TabsTrigger
                  value="pie"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <PieChart className="mr-2 h-4 w-4" />
                  Pie Chart
                </TabsTrigger>
                <TabsTrigger
                  value="bar"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  Bar Chart
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pie" className="mt-0">
                <ChartContainer
                  config={chartConfig}
                  className={`h-[${chartHeight}] w-full`}
                >
                  <RechartsPieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) =>
                            `${chartConfig[name]?.label}: ${formatCurrency(
                              value as number,
                              selectedCurrency
                            )}`
                          }
                        />
                      }
                    />
                    <Pie
                      data={expenseSummary}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      strokeWidth={2}
                      stroke="rgba(255,255,255,0.15)"
                      startAngle={90}
                      endAngle={-270}
                      animationDuration={800}
                    >
                      {expenseSummary.map((entry) => (
                        <Cell
                          key={`cell-${entry.category}`}
                          fill={entry.fill}
                          name={entry.category}
                        />
                      ))}
                    </Pie>
                    <RechartsLegend
                      content={
                        <ChartLegendContent
                          nameKey="category"
                          className="text-xs flex-wrap justify-center gap-x-4 gap-y-2"
                        />
                      }
                      verticalAlign="bottom"
                      wrapperStyle={{
                        paddingTop: "15px",
                        paddingBottom: "0px",
                      }}
                    />
                  </RechartsPieChart>
                </ChartContainer>
              </TabsContent>

              <TabsContent value="bar" className="mt-0">
                <ChartContainer
                  config={chartConfig}
                  className={`h-[${chartHeight}] w-full`}
                >
                  <RechartsBarChart
                    accessibilityLayer
                    data={expenseSummary}
                    layout="vertical"
                    margin={{ left: 0, right: 30, top: 5, bottom: 10 }}
                    barGap={4}
                    // Removed animationDuration as it's not a valid prop
                  >
                    <CartesianGrid
                      horizontal={false}
                      strokeDasharray="3 3"
                      opacity={0.4}
                    />
                    <XAxis type="number" dataKey="total" hide />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tickLine={false}
                      tickMargin={8}
                      axisLine={false}
                      tickFormatter={(value) => {
                        const label = chartConfig[value]?.label || value;
                        const displayLabel =
                          typeof label === "string"
                            ? label.length > 12
                              ? label.substring(0, 12) + "…"
                              : label
                            : label;
                        return displayLabel;
                      }}
                      width={95}
                      fontSize={12}
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--primary-5)", opacity: 0.1 }}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) =>
                            `${chartConfig[name]?.label}: ${formatCurrency(
                              value as number,
                              selectedCurrency
                            )}`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="total"
                      layout="vertical"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={true}
                      animationDuration={800} // Move animationDuration to the Bar component
                    >
                      {expenseSummary.map((entry) => (
                        <Cell
                          key={`cell-${entry.category}`}
                          fill={entry.fill}
                          name={entry.category}
                        />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ChartContainer>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>

        {!isLoading &&
          topCategory &&
          transactions.filter((tx) => tx.amount < 0).length > 0 && (
            <CardFooter className="pt-0 pb-4 px-6">
              <div className="w-full bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-full p-2"
                    style={{ backgroundColor: `${topCategory.fill}25` }}
                  >
                    <ArrowDown
                      className="h-5 w-5"
                      style={{ color: topCategory.fill }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Top Expense Category
                    </p>
                    <p className="font-medium">{topCategory.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Percentage of Spending
                  </p>
                  <p className="font-semibold text-lg">
                    {topCategory.percentage}%
                  </p>
                </div>
              </div>
            </CardFooter>
          )}
      </Card>
    </div>
  );
}
