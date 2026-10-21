"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { displayDate, type DashboardRecord } from "@/features/dashboard/types";
import { Panel, stateLabels } from "@/features/dashboard/components";

const labels: Record<string, string> = {
  active: "Active workforce",
  present: "Present employees",
  approvedLeave: "Approved leave",
  actions: "Pending HR tasks",
  probation: "Probationary employees",
  confirmed: "Confirmed employees",
  missingHod: "Unassigned HOD",
  joiners: "New joiners",
  late: "Late arrivals",
  conflicts: "Leave / attendance conflicts",
  hod: "HOD leave reviews",
  hr: "Final HR leave reviews",
  corrections: "Attendance corrections",
  upcoming: "Upcoming confirmations",
  overdue: "Overdue probation reviews",
  chPending: "CH eligibility pending",
  chExceptions: "CH resolution cases",
};
interface Result {
  rows: DashboardRecord[];
  total: number;
  page: number;
  pages: number;
  context: { date: string; scope: string; timezone: string };
}
function Records() {
  const search = useSearchParams();
  const [data, setData] = useState<Result | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const query = search.toString();
  const metric = search.get("metric") ?? "active";
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    const params = new URLSearchParams(query);
    params.set("metric", metric);
    params.set("page", String(page));
    api
      .get<Result>(`/dashboard/records?${params}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [query, metric, page, retry]);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#11263d]">
            {labels[metric] ?? stateLabels[metric] ?? "Dashboard records"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {data
              ? `${data.context.scope} · ${displayDate(`${data.context.date}T00:00:00Z`, data.context.timezone)} · ${data.total} records`
              : "Scoped dashboard detail"}
          </p>
        </div>
        <Link href="/dashboard" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-5 text-sm text-red-800"
        >
          {error}
          <button
            onClick={() => setRetry((v) => v + 1)}
            className="ml-3 font-bold underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <Panel
          title="Matching records"
          note="Filters and access scope are rechecked by the server"
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Context</th>
                  <th>Date</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {data ? (
                  data.rows.map((row, index) => (
                    <tr key={`${row.id}-${index}`}>
                      <td>
                        <b>{row.employee}</b>
                        <div className="mt-1 text-xs text-slate-500">
                          {row.employeeId}
                        </div>
                      </td>
                      <td>{row.department}</td>
                      <td>{row.status.replaceAll("_", " ")}</td>
                      <td className="max-w-xs whitespace-normal">
                        {row.detail || "—"}
                      </td>
                      <td>{row.date || "—"}</td>
                      <td>
                        {row.href ? <Link
                          href={row.href}
                          className="font-semibold text-[#176b9c] hover:underline"
                        >
                          View
                        </Link> : <span className="text-xs text-slate-500">Profile access restricted</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      Loading records…
                    </td>
                  </tr>
                )}
                {data && !data.rows.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-slate-500"
                    >
                      No matching records in your access scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <span>Page {page}</span>
            <div className="flex gap-2">
              <button
                className="btn-secondary disabled:opacity-40"
                disabled={page <= 1 || !data}
                onClick={() => setPage((v) => v - 1)}
              >
                Previous
              </button>
              <button
                className="btn-secondary disabled:opacity-40"
                disabled={!data || page >= data.pages}
                onClick={() => setPage((v) => v + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
export default function DashboardRecordsPage() {
  return (
    <Suspense
      fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" />}
    >
      <Records />
    </Suspense>
  );
}
