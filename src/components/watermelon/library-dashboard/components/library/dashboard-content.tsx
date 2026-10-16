'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CirculationChart } from './circulation-chart';
import { CollectionDonutChart } from './collection-donut-chart';
import {
  ArrowDown01Icon,
  BookPlusIcon,
  CancelIcon,
  CheckoutIcon,
  Download01Icon,
  ReturnIcon,
  SparklesIcon,
  UserAdd02Icon,
  MembersIcon,
  CirculationIcon,
  CatalogIcon,
  ReportsIcon,
} from './icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePatients } from '@/app/context/PatientContext';
import { Calendar, User, UserCheck, Stethoscope, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import { ToothIcon } from '@/app/components/ToothIcon';

const quickActions = [
  { label: 'Register New Patient', href: '/dashboard/patient-form', icon: UserAdd02Icon },
  { label: 'Schedule Appointment', href: '/dashboard/schedule', icon: CirculationIcon },
  { label: 'Patient Directory', href: '/dashboard/patients', icon: MembersIcon },
  { label: 'Clinic Store & Supplies', href: '/dashboard/store', icon: CatalogIcon },
];

function extractRealTreatments(patients: any[]) {
  const counts: Record<string, number> = {
    'Restorative & Fillings': 0,
    'Endodontics & RCT': 0,
    'Orthodontics': 0,
    'Implants & Surgery': 0,
    'Periodontics & Cleaning': 0,
    'Prosthetics & Crowns': 0,
    'Consultations & Exams': 0,
  };

  const classifyTreatment = (text: string): string => {
    const t = (text || '').toLowerCase();
    if (t.includes('implant') || t.includes('extract') || t.includes('surg') || t.includes('bone')) {
      return 'Implants & Surgery';
    }
    if (t.includes('ortho') || t.includes('brace') || t.includes('align') || t.includes('wire')) {
      return 'Orthodontics';
    }
    if (t.includes('rct') || t.includes('root canal') || t.includes('pulp') || t.includes('endo')) {
      return 'Endodontics & RCT';
    }
    if (t.includes('clean') || t.includes('scal') || t.includes('hygiene') || t.includes('perio') || t.includes('polish')) {
      return 'Periodontics & Cleaning';
    }
    if (t.includes('crown') || t.includes('bridge') || t.includes('veneer') || t.includes('denture') || t.includes('prostho')) {
      return 'Prosthetics & Crowns';
    }
    if (t.includes('fill') || t.includes('decay') || t.includes('caries') || t.includes('composite') || t.includes('restor')) {
      return 'Restorative & Fillings';
    }
    return 'Consultations & Exams';
  };

  patients.forEach((patient) => {
    let hasToothTreatment = false;

    // Check tableData for tooth-specific treatments
    if (patient.tableData) {
      try {
        const parsed = typeof patient.tableData === 'string' ? JSON.parse(patient.tableData) : patient.tableData;
        if (parsed?.teeth && typeof parsed.teeth === 'object') {
          Object.values(parsed.teeth).forEach((tooth: any) => {
            if (tooth?.treatment && typeof tooth.treatment === 'string' && tooth.treatment.trim()) {
              counts[classifyTreatment(tooth.treatment)]++;
              hasToothTreatment = true;
            } else if (tooth?.condition && tooth.condition !== 'sound') {
              if (tooth.condition === 'decay') counts['Restorative & Fillings']++;
              else if (tooth.condition === 'rct') counts['Endodontics & RCT']++;
              else if (tooth.condition === 'implant') counts['Implants & Surgery']++;
              else if (tooth.condition === 'crown') counts['Prosthetics & Crowns']++;
              else if (tooth.condition === 'missing') counts['Implants & Surgery']++;
              hasToothTreatment = true;
            }
          });
        }
        if (Array.isArray(parsed?.scheduledProcedures)) {
          parsed.scheduledProcedures.forEach((sp: any) => {
            if (sp.procedure) {
              counts[classifyTreatment(sp.procedure)]++;
              hasToothTreatment = true;
            }
          });
        }
      } catch {}
    }

    if (!hasToothTreatment) {
      if (patient.treatment && patient.treatment.trim()) {
        counts[classifyTreatment(patient.treatment)]++;
      } else if (patient.diagnosis && patient.diagnosis.trim()) {
        counts[classifyTreatment(patient.diagnosis)]++;
      } else if (patient.currentTreatment && patient.currentTreatment.trim()) {
        counts[classifyTreatment(patient.currentTreatment)]++;
      } else {
        counts['Consultations & Exams']++;
      }
    }
  });

  return counts;
}

export function DashboardContent() {
  const { patients, appointments } = usePatients();

  // Dynamic metrics from patients context
  const totalPatientsCount = patients.length;
  const recentRegisteredCount = patients.filter((p) => {
    const createdDate = new Date(p.createdAt);
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    return createdDate > last30Days;
  }).length;

  const activeAppointmentsCount = appointments.filter(
    (a) => a.status === 'Scheduled' || a.status === 'Arrived'
  ).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointmentsCount = appointments.filter(
    (a) => a.appointmentDate === todayStr
  ).length;

  const realTreatments = useMemo(() => extractRealTreatments(patients), [patients]);
  const totalTreatmentsCount: number = useMemo(() => {
    return Object.values(realTreatments).reduce((sum: number, count: number) => sum + count, 0);
  }, [realTreatments]);

  const completedVisitsCount = appointments.filter(
    (a) => a.status === 'Completed'
  ).length;

  const dynamicMetrics = [
    {
      label: 'Total Patients',
      value: totalPatientsCount.toLocaleString(),
      note: `+${recentRegisteredCount} this month`,
      icon: ToothIcon,
      iconClassName: 'text-[#008294]',
    },
    {
      label: 'Active Appointments',
      value: activeAppointmentsCount.toString(),
      note: `${todayAppointmentsCount} scheduled today`,
      icon: CirculationIcon,
      iconClassName: 'text-[#0d9488]',
    },
    {
      label: 'Clinical Treatments',
      value: totalTreatmentsCount.toString(),
      note: `${totalTreatmentsCount} diagnosed procedures`,
      icon: Stethoscope,
      iconClassName: 'text-[#14b8a6]',
    },
    {
      label: 'Completed Visits',
      value: completedVisitsCount.toString(),
      note: 'Finished consultations',
      icon: Clock,
      iconClassName: 'text-[#F59E0B]',
    },
  ];

  return (
    <>
      <DashboardHeader />
      <div className="@container/dashboard space-y-10">
        {/* Top Metrics */}
        <section>
          <SectionTitle>Top Metrics</SectionTitle>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dynamicMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </section>

        {/* Quick Actions (clickable Next.js links) */}
        <section>
          <SectionTitle>Quick Actions</SectionTitle>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Card className="bg-secondary text-secondary-foreground cursor-pointer rounded-xl py-0 shadow-none ring-0 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <CardContent className="flex h-full items-center justify-between p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="bg-background text-[#008294] flex size-11 items-center justify-center rounded-xl shadow-xs border border-slate-100 dark:border-slate-800">
                        <action.icon className="size-5" />
                      </div>
                      <span className="text-secondary-foreground/90 text-sm sm:text-base font-semibold">
                        {action.label}
                      </span>
                    </div>
                    <ArrowDown01Icon className="text-muted-foreground size-5 -rotate-90 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Charts Row */}
        <section className="grid grid-cols-1 items-stretch gap-8 @4xl/dashboard:grid-cols-3">
          <div className="@4xl/dashboard:col-span-2">
            <CirculationChart />
          </div>
          <div className="min-h-84">
            <CollectionOverview patients={patients} />
          </div>
        </section>

        {/* Recent Patients */}
        <section>
          <RecentActivity patients={patients} />
        </section>
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-foreground">{children}</h2>;
}

function DashboardHeader() {
  const [greeting, setGreeting] = useState('Good Morning');
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const now = new Date();
    setCurrentDateStr(
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    );
  }, []);

  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-[1.3] font-bold text-foreground">
          {greeting}, Doctor
        </h1>
        <div className="flex flex-col gap-2 text-sm leading-[1.4] sm:flex-row sm:items-center">
          <p className="text-muted-foreground font-medium">
            Neom Dental Clinic
          </p>
          <div className="bg-muted-foreground/40 hidden size-1.5 rounded-full sm:inline-block" />
          <p className="text-secondary-foreground/80">{currentDateStr || 'Welcome to Dashboard'}</p>
        </div>
      </div>
      <Link href="/dashboard/patient-form">
        <Button
          className="h-10 gap-2 px-4 rounded-xl bg-[#008294] hover:bg-[#007484] text-white text-sm font-semibold shadow-xs"
        >
          <UserAdd02Icon className="size-4.5" />
          <span>New Patient</span>
        </Button>
      </Link>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  iconClassName,
  label,
  note,
  value,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}) {
  return (
    <Card className="bg-card text-card-foreground rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex items-center gap-2">
          <div className="size-6 flex items-center justify-center">
            <Icon className={cn('size-5.5', iconClassName)} />
          </div>
          <span className="text-muted-foreground text-sm font-medium">
            {label}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {value}
          </span>
          <span className="text-xs font-semibold text-[#008294]">{note}</span>
        </div>
      </CardContent>
    </Card>
  );
}

type TreatmentSegment = {
  label: string;
  count: number;
  color: string;
};

function CollectionOverview({ patients }: { patients: any[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const realTreatments = useMemo(() => extractRealTreatments(patients), [patients]);

  const treatmentColors = [
    '#008294',
    '#0d9488',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
  ];

  const rawSegments: TreatmentSegment[] = useMemo(() => {
    return Object.entries(realTreatments)
      .filter(([_, count]) => (count as number) > 0)
      .map(([label, count], index) => ({
        label,
        count: count as number,
        color: treatmentColors[index % treatmentColors.length],
      }));
  }, [realTreatments]);

  const total = rawSegments.reduce((sum: number, s: TreatmentSegment) => sum + s.count, 0);

  const segments = rawSegments.map((segment: TreatmentSegment) => ({
    ...segment,
    percentage: total > 0 ? (segment.count / total) * 100 : 0,
  }));

  const chartData = rawSegments.map((segment: TreatmentSegment) => ({
    name: segment.label,
    value: segment.count,
    fill: segment.color,
  }));

  return (
    <div className="flex h-full flex-col">
      <SectionTitle>Treatments Overview</SectionTitle>
      <Card className="border-border mt-5 flex flex-1 flex-col rounded-2xl border py-0 shadow-xs ring-0">
        <CardContent className="flex h-full flex-col items-center justify-between gap-5 p-4 sm:flex-row sm:items-center sm:gap-8 sm:px-8 @4xl/dashboard:flex-col @4xl/dashboard:gap-5 @4xl/dashboard:px-4">
          {total > 0 ? (
            <>
              <CollectionDonutChart
                data={chartData}
                total={total}
                label="Treatments"
                size={180}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveIndex}
              />
              <div className="flex w-full flex-col gap-2.5 sm:max-w-64 @4xl/dashboard:max-w-none">
                {segments.map((segment, index) => (
                  <div
                    key={segment.label}
                    className={cn(
                      'text-secondary-foreground grid grid-cols-3 items-center text-xs sm:text-sm leading-[1.4] transition-opacity duration-200',
                      activeIndex !== null && activeIndex !== index && 'opacity-40',
                    )}
                  >
                    <div className="text-secondary-foreground/90 flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="truncate font-medium">{segment.label}</span>
                    </div>
                    <span className="text-center font-semibold tabular-nums text-foreground">
                      {segment.count.toLocaleString()}
                    </span>
                    <span className="text-right font-medium tabular-nums text-muted-foreground">
                      {segment.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center my-auto">
              <div className="w-12 h-12 rounded-full bg-teal-500/10 text-[#008294] flex items-center justify-center mb-3">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">0 Treatments Logged</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                As you register dental patients and diagnose teeth, real treatment procedures will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecentActivity({ patients }: { patients: any[] }) {
  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Recent Patients</SectionTitle>
        <Link
          href="/dashboard/patients"
          className="text-xs font-semibold text-[#008294] hover:underline flex items-center gap-1"
        >
          <span>View all patients</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {recentPatients.length > 0 ? (
          recentPatients.map((patient) => (
            <div
              key={patient.id}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#008294]/40 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-10 rounded-xl bg-[#008294]/10 text-[#008294] font-bold text-sm flex items-center justify-center shrink-0">
                  {patient.name?.charAt(0) || 'P'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground leading-tight truncate">
                    {patient.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {patient.phone || 'No phone'} • {patient.sex || 'Patient'}
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/patients?id=${patient.id}`}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shrink-0"
              >
                View
              </Link>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-card rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-muted-foreground text-sm">
            No registered patients yet. Click "New Patient" above to add one.
          </div>
        )}
      </div>
    </div>
  );
}
