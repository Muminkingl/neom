'use client';

import { Calendar } from 'lucide-react';
import { useId, useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  XAxis,
} from 'recharts';

import { buttonVariants } from '@/components/ui/button';
import { ArrowDown01Icon } from './icons';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { usePatients } from '@/app/context/PatientContext';

type ActivityTimeframe = 'weekly' | 'monthly' | 'yearly';

type ActivityDataPoint = {
  timestamp: number;
  appointments: number;
  attended: number;
};

const activityChartConfig = {
  appointments: {
    label: 'Appointments Booked',
    color: '#008294',
  },
  attended: {
    label: 'Patients Attended',
    color: '#0d9488',
  },
} satisfies ChartConfig;

const shortWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
});
const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});
const shortMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
});

const chartFormatters: Record<ActivityTimeframe, (value: number) => string> = {
  weekly: (value) => shortWeekdayFormatter.format(new Date(value)),
  monthly: (value) => shortDateFormatter.format(new Date(value)),
  yearly: (value) => shortMonthFormatter.format(new Date(value)),
};

const weeklyTooltipFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const datedTooltipFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const monthlyTooltipFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

function formatTooltipDate(timeframe: ActivityTimeframe, value: number) {
  const d = new Date(value);
  if (timeframe === 'weekly') return weeklyTooltipFormatter.format(d);
  if (timeframe === 'monthly') return datedTooltipFormatter.format(d);
  return monthlyTooltipFormatter.format(d);
}

function getMidpoints(ticks: number[], domainEnd: number) {
  const points = ticks.at(-1) === domainEnd ? ticks : [...ticks, domainEnd];
  return points.slice(0, -1).map((tick, index) => tick + (points[index + 1] - tick) / 2);
}

export function CirculationChart() {
  const { appointments, patients } = usePatients();
  const [timeframe, setTimeframe] = useState<ActivityTimeframe>('weekly');
  const [activeLabel, setActiveLabel] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');

  const dataSeries = useMemo(() => {
    const now = new Date();

    // ── WEEKLY: Current 7 days of this week (Sunday to Saturday) ──
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekly: ActivityDataPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const dayAppts = appointments.filter((a) => a.appointmentDate === dateStr);
      const attended = dayAppts.filter((a) => a.status === 'Completed' || a.status === 'Arrived').length;
      const registered = patients.filter((p) => p.createdAt && p.createdAt.startsWith(dateStr)).length;

      weekly.push({
        timestamp: d.getTime(),
        appointments: dayAppts.length + (dayAppts.length === 0 ? registered : 0),
        attended,
      });
    }

    // ── MONTHLY: Past 28 days ──
    const monthly: ActivityDataPoint[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().split('T')[0];

      const dayAppts = appointments.filter((a) => a.appointmentDate === dateStr);
      const attended = dayAppts.filter((a) => a.status === 'Completed' || a.status === 'Arrived').length;
      const registered = patients.filter((p) => p.createdAt && p.createdAt.startsWith(dateStr)).length;

      monthly.push({
        timestamp: d.getTime(),
        appointments: dayAppts.length + (dayAppts.length === 0 ? registered : 0),
        attended,
      });
    }

    // ── YEARLY: 12 months of current year ──
    const currentYear = now.getFullYear();
    const yearly: ActivityDataPoint[] = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(Date.UTC(currentYear, m, 1));
      const monthPrefix = `${currentYear}-${String(m + 1).padStart(2, '0')}`;

      const monthAppts = appointments.filter((a) => a.appointmentDate && a.appointmentDate.startsWith(monthPrefix));
      const attended = monthAppts.filter((a) => a.status === 'Completed' || a.status === 'Arrived').length;
      const registered = patients.filter((p) => p.createdAt && p.createdAt.startsWith(monthPrefix)).length;

      yearly.push({
        timestamp: d.getTime(),
        appointments: monthAppts.length + (monthAppts.length === 0 ? registered : 0),
        attended,
      });
    }

    return { weekly, monthly, yearly };
  }, [appointments, patients]);

  const currentData = dataSeries[timeframe];

  const chartTicks: Record<ActivityTimeframe, number[]> = useMemo(() => ({
    weekly: dataSeries.weekly.map((p) => p.timestamp),
    monthly: [0, 7, 14, 21, 27].filter((i) => i < dataSeries.monthly.length).map((i) => dataSeries.monthly[i].timestamp),
    yearly: dataSeries.yearly.filter((_, idx) => idx % 2 === 0).map((p) => p.timestamp),
  }), [dataSeries]);

  const chartDomains: Record<ActivityTimeframe, [number, number]> = useMemo(() => ({
    weekly: [dataSeries.weekly[0].timestamp, dataSeries.weekly[dataSeries.weekly.length - 1].timestamp],
    monthly: [dataSeries.monthly[0].timestamp, dataSeries.monthly[dataSeries.monthly.length - 1].timestamp],
    yearly: [dataSeries.yearly[0].timestamp, dataSeries.yearly[dataSeries.yearly.length - 1].timestamp],
  }), [dataSeries]);

  const chartMidpoints = useMemo(() => {
    return getMidpoints(chartTicks[timeframe], chartDomains[timeframe][1]);
  }, [chartTicks, chartDomains, timeframe]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#008294] animate-pulse" />
          <h2 className="text-lg font-bold text-foreground">Clinic Activity & Appointments</h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'lg' }),
              'text-accent-foreground capitalize cursor-pointer font-semibold',
            )}
          >
            {timeframe}
            <ArrowDown01Icon className="size-4 ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 p-1.5 shadow-lg">
            <DropdownMenuGroup>
              {(['weekly', 'monthly', 'yearly'] as const).map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setTimeframe(option)}
                  className={cn(
                    'rounded-lg capitalize cursor-pointer',
                    timeframe === option && 'text-[#008294] font-bold bg-teal-500/10',
                  )}
                >
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChartContainer
        config={activityChartConfig}
        className="mt-5 aspect-auto h-72 w-full grow [&_.recharts-surface]:overflow-visible"
        onMouseDown={(event) => event.preventDefault()}
      >
        <AreaChart
          data={currentData}
          accessibilityLayer={false}
          margin={{ left: 4, right: 4, top: 12, bottom: 4 }}
          style={{ overflow: 'visible' }}
          onMouseMove={(state) => {
            const label = state?.activeLabel;
            setActiveLabel(
              typeof label === 'number'
                ? label
                : label != null
                  ? Number(label)
                  : null,
            );
          }}
          onMouseLeave={() => setActiveLabel(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#008294" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#008294" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical
            horizontal={false}
            stroke="var(--border)"
            strokeDasharray="0"
          />
          {chartMidpoints.map((midpoint) => (
            <ReferenceLine
              key={midpoint}
              x={midpoint}
              stroke="var(--border)"
              strokeDasharray="6 6"
            />
          ))}
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={chartDomains[timeframe]}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            ticks={chartTicks[timeframe]}
            minTickGap={0}
            interval={0}
            padding={{ left: 0, right: 0 }}
            tick={({ x, y, payload }) => {
              const isActive = activeLabel === payload.value;
              return (
                <text
                  x={x}
                  y={y}
                  dy={14}
                  fill={
                    isActive
                      ? 'var(--secondary-foreground)'
                      : 'var(--muted-foreground)'
                  }
                  fontSize={12}
                  textAnchor="middle"
                  className="font-medium"
                >
                  {chartFormatters[timeframe](payload.value)}
                </text>
              );
            }}
          />
          <ChartTooltip
            cursor={{
              stroke: '#008294',
              strokeWidth: 1.5,
            }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;

              const point = payload[0].payload as ActivityDataPoint;

              return (
                <div className="bg-[#111719] text-white z-50 flex min-w-44 flex-col rounded-xl border border-slate-800 p-2.5 shadow-xl">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
                    <Calendar className="size-3 text-[#008294]" />
                    <span className="text-[11px] font-bold text-slate-200">
                      {formatTooltipDate(timeframe, point.timestamp)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#008294] size-2 rounded-full" />
                        <span className="text-[11px] text-slate-300 font-medium">
                          Appointments Booked
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white font-mono">
                        {point.appointments}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#0d9488] size-2 rounded-full" />
                        <span className="text-[11px] text-slate-300 font-medium">
                          Patients Attended
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white font-mono">
                        {point.attended}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="appointments"
            stroke="#008294"
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 4,
              stroke: '#008294',
              strokeWidth: 2,
              fill: 'var(--card)',
            }}
          />
          <Line
            type="monotone"
            dataKey="attended"
            stroke="#0d9488"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              stroke: '#0d9488',
              strokeWidth: 2,
              fill: 'var(--card)',
            }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
