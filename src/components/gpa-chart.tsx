"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  CustomTooltipProps,
} from "@/components/ui/chart";
import { GpaSnapshot } from "@/lib/dated-gpa";
import { GPA_WEIGHTS } from "@/lib/grades";

const chartConfig = {
  gpa: {
    label: "GPA",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function GpaChart({ chartData }: { chartData: GpaSnapshot[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GPA Over Time</CardTitle>
        <CardDescription>
          Bucketed by day, inferred from assignment due dates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              bottom: 30,
            }}
          >
            <CartesianGrid vertical={true} />
            <YAxis
              domain={[0, GPA_WEIGHTS.weighted["A+"]]}
              tickCount={20}
              hide
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={25}
              angle={-90}
              tickFormatter={(value) =>
                value.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <ChartTooltip
              cursor={false}
              content={(props: CustomTooltipProps) => (
                <ChartTooltipContent {...props} hideLabel />
              )}
            />
            <Line
              dataKey="gpa"
              type="monotone"
              strokeWidth={2}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
