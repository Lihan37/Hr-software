export interface DashboardRecord {
  id: string;
  employee: string;
  employeeId: string;
  department: string;
  detail: string;
  date?: string;
  status: string;
  href: string;
}
export interface Distribution {
  name: string;
  count: number;
}
export interface DashboardOverview {
  meta: {
    date: string;
    timezone: string;
    generatedAt: string;
    scope: string;
    mode: "SELF" | "HR" | "TEAM";
    headcountBasis: string;
    attendanceNote: string;
  };
  filters: {
    departments: { value: string; label: string }[];
    branches: string[];
    businessUnits: string[];
  };
  kpis: {
    total: number;
    active: number;
    present: number;
    absent: number;
    approvedLeave: number;
    pendingActions: number;
    probation: number;
    confirmed: number;
    late: number;
    missingPunch: number;
    pendingAttendance: number;
    recordedAbsences: number;
    weeklyHoliday: number;
    workedWeeklyHoliday: number;
    joiners: number;
  };
  attendance: {
    states: Record<string, number>;
    conflicts: number;
    trend: {
      date: string;
      present: number;
      missing: number;
      recordedAbsent: number;
    }[];
    lastProcessedAt: string | null;
    absenceFinalizationAvailable: boolean;
  };
  attention: {
    metric: string;
    label: string;
    context: string;
    href: string;
    count: number;
  }[];
  approvals: {
    hod: number;
    hr: number;
    corrections: number;
    items: DashboardRecord[];
  };
  leave: {
    upcoming: number;
    requestsThisMonth: number;
    usage: { code: string; used: number | null; requests: number }[];
  };
  workforce: {
    departments: {
      id: string;
      name: string;
      active: number;
      present: number;
      approvedLeave: number;
      weeklyHoliday: number;
      unknown: number;
    }[];
    employment: Distribution[];
    branches: Distribution[];
    businessUnits: Distribution[];
    employeeTypes: Distribution[];
    joiners: { month: string; count: number }[];
  };
  lifecycle: {
    upcoming: number;
    overdue: number;
    recentlyConfirmed: number;
    reviews: DashboardRecord[];
  };
  ch: {
    earned: number | null;
    reversed: number | null;
    pending: number | null;
    exceptions: number | null;
    policyEnabled: boolean | null;
  };
  activities: {
    id: string;
    label: string;
    employee: string;
    timestamp: string;
    href: string;
  }[];
  health: {
    punches: Record<string, number> | null;
    devices:
      | {
          id: string;
          name: string;
          configuredStatus: string;
          model: string | null;
          lastSyncAt: string | null;
        }[]
      | null;
    deviceScope: string;
    roster: string;
    payroll: string;
  };
  warnings: string[];
}
export function displayDate(value: string, timezone = "Asia/Dhaka") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
export function localDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}-${parts.find((p) => p.type === "day")!.value}`;
}
