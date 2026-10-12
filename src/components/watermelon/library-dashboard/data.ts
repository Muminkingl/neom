import type { ComponentType, SVGProps } from 'react';

import {
  AiIdeaIcon,
  Alert02Icon,
  ArrowDown02Icon,
  BookMinusIcon,
  BookOpen02Icon,
  BookPlusIcon,
  CatalogIcon,
  CheckoutIcon,
  CirculationIcon,
  DashboardIcon,
  IntelligenceIcon,
  MembersIcon,
  OpacIcon,
  ReportsIcon,
  ReturnIcon,
} from './components/library/icons';

export type NavigationIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavigationItem = {
  label: string;
  href: string;
  icon: NavigationIcon;
  section: string;
  subItems?: {
    label: string;
    href: string;
    icon: NavigationIcon;
  }[];
};

export const primaryNavigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: DashboardIcon,
    section: 'dashboard',
  },
  {
    label: 'Patients',
    href: '/dashboard/patients',
    icon: MembersIcon,
    section: 'patients',
  },
  {
    label: 'Register Patient',
    href: '/dashboard/patient-form',
    icon: BookPlusIcon,
    section: 'patient-form',
  },
  {
    label: 'Schedule',
    href: '/dashboard/schedule',
    icon: CirculationIcon,
    section: 'schedule',
  },
  {
    label: 'Clinic Store',
    href: '/dashboard/store',
    icon: CatalogIcon,
    section: 'store',
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: ReportsIcon,
    section: 'reports',
  },
];

export const organizations = [
  'Neom Dental Clinic',
  'Qallat Polyclinic',
] as const;

export const topNavNotifications = [
  {
    id: 1,
    text: 'New book added: "The Art of Computer Programming"',
    time: '2 min ago',
    unread: true,
  },
  {
    id: 2,
    text: 'Sarah P. checked out "The Cartographer\'s Secret"',
    time: '12 min ago',
    unread: true,
  },
  {
    id: 3,
    text: 'System generated 47 purchase recommendations',
    time: '1 hr ago',
    unread: false,
  },
  {
    id: 4,
    text: 'Yuki K. returned "Silk Road Chronicles"',
    time: '2 hr ago',
    unread: false,
  },
] as const;

export const metrics = [
  {
    label: 'Total Patients',
    value: '12,847',
    note: '+34 vs last month',
    icon: MembersIcon,
    iconClassName: 'text-[#008294]',
  },
  {
    label: 'Active Appointments',
    value: '140',
    note: '+12 today',
    icon: CirculationIcon,
    iconClassName: 'text-[#0d9488]',
  },
  {
    label: 'Treatments Active',
    value: '16',
    note: '9.3% of cases',
    icon: BookOpen02Icon,
    iconClassName: 'text-[#14b8a6]',
  },
  {
    label: 'Pending Follow-ups',
    value: '47',
    note: '8 from last week',
    icon: Alert02Icon,
    iconClassName: 'text-[#F59E0B]',
    noteIcon: ArrowDown02Icon,
  },
];

type CirculationTimeframe = 'weekly' | 'monthly' | 'yearly';

type CirculationDataPoint = {
  timestamp: number;
  checkouts: number;
  returns: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function createDailyCirculationSeries(
  start: number,
  checkouts: number[],
  returns: number[],
): CirculationDataPoint[] {
  return checkouts.map((value, index) => ({
    timestamp: start + index * DAY_IN_MS,
    checkouts: value,
    returns: returns[index],
  }));
}

function createMonthlyCirculationSeries(
  year: number,
  checkouts: number[],
  returns: number[],
): CirculationDataPoint[] {
  return checkouts.map((value, month) => ({
    timestamp: Date.UTC(year, month, 1),
    checkouts: value,
    returns: returns[month],
  }));
}

export const circulationData: Record<
  CirculationTimeframe,
  CirculationDataPoint[]
> = {
  weekly: createDailyCirculationSeries(
    Date.UTC(2026, 1, 15),
    [82, 88, 85, 91, 94, 90, 96],
    [68, 70, 73, 69, 77, 75, 80],
  ),
  monthly: createDailyCirculationSeries(
    Date.UTC(2026, 1, 1),
    [
      580, 592, 600, 594, 610, 625, 638, 646, 652, 660, 641, 632, 628, 620, 618,
      630, 635, 632, 620, 610, 625, 640, 668, 690, 688, 695, 704, 698,
    ],
    [
      430, 438, 445, 448, 452, 460, 472, 480, 486, 490, 482, 475, 468, 472, 478,
      481, 486, 480, 474, 470, 478, 490, 502, 515, 520, 524, 530, 528,
    ],
  ),
  yearly: createMonthlyCirculationSeries(
    2026,
    [4800, 4920, 5100, 5050, 5280, 5400, 5520, 5680, 5900, 6120, 6240, 6380],
    [3600, 3680, 3760, 3820, 3900, 4020, 4100, 4210, 4380, 4500, 4620, 4700],
  ),
};

export const collectionOverview = {
  label: 'Treatments',
  segments: [
    { label: 'Implants & Surgery', count: 5245, color: '#008294' },
    { label: 'Orthodontics', count: 4745, color: '#0d9488' },
    { label: 'Cleaning & Hygiene', count: 2497, color: '#2dd4bf' },
  ],
} as const;

export const recentActivity = [
  {
    id: 'book-added',
    icon: BookPlusIcon,
    parts: [
      { text: 'New book added: ', muted: true },
      { text: '"The Art of Computer Programming"' },
    ],
    time: '2 min ago',
    dateTime: '2026-02-19T08:58:00',
  },
  {
    id: 'checkout',
    icon: CheckoutIcon,
    parts: [
      { text: 'Sarah P. ' },
      { text: 'checked out ', muted: true },
      { text: '"The Cartographer\u2019s Secret"' },
    ],
    time: '2 min ago',
    dateTime: '2026-02-19T08:58:00',
  },
  {
    id: 'titles-flagged',
    icon: AiIdeaIcon,
    parts: [
      { text: 'Intelligence ' },
      { text: 'flagged ', muted: true },
      { text: '3,280 dormant titles ' },
      { text: 'for collection review', muted: true },
    ],
    time: '1 hr ago',
    dateTime: '2026-02-19T08:00:00',
  },
  {
    id: 'return',
    icon: ReturnIcon,
    parts: [
      { text: 'Yuki K. ' },
      { text: 'returned ', muted: true },
      { text: '\u201cSilk Road Chronicles\u201d' },
    ],
    time: '2 hr ago',
    dateTime: '2026-02-19T07:00:00',
  },
  {
    id: 'recommendations',
    icon: AiIdeaIcon,
    parts: [
      { text: 'Intelligence ' },
      { text: 'generated ', muted: true },
      { text: '47 purchase recommendations' },
    ],
    time: '3 hr ago',
    dateTime: '2026-02-19T06:00:00',
  },
] as const;

export const intelligenceCards = [
  {
    tone: 'insight',
    title: 'High Demand Alert',
    bodyParts: [
      { text: '"Project Hail Mary"', emphasis: true },
      {
        text: ' has a 6-member waitlist. 2 additional copies would clear the backlog within 3 weeks.',
      },
    ],
  },
  {
    tone: 'warning',
    title: 'Collection Gap',
    bodyParts: [
      {
        text: "Member searches for 'climate fiction' are up 340% this month, only 2 titles in collection. Consider acquiring more.",
      },
    ],
  },
  {
    tone: 'success',
    title: 'Auto-Sort',
    bodyParts: [
      {
        text: '47 returned items have been categorised and shelf locations assigned. 3 items flagged for condition review.',
      },
    ],
  },
] as const;
