"use client";

import { ChevronLeft, ChevronRight, Clock3, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  TimelinePage,
  TimelinePoint,
} from "@/lib/gradebook/timeline-types";
import { useReport } from "@/lib/report/store";

function percentage(value: number | null | undefined) {
  return value == null ? "—" : `${(value * 100).toFixed(2)}%`;
}
function gpa(value: number | null) {
  return value == null ? "—" : value.toFixed(3);
}
function mergePoints(left: TimelinePoint[], right: TimelinePoint[]) {
  return [
    ...new Map([...left, ...right].map((point) => [point.id, point])).values(),
  ].sort((a, b) => a.sequence - b.sequence);
}

export function HistoryTimeline({ initial }: { initial: TimelinePage }) {
  const [points, setPoints] = useState(initial.points);
  const [selectedId, setSelectedId] = useState(initial.selectedId);
  const [before, setBefore] = useState(initial.before);
  const [hasNewer, setHasNewer] = useState(initial.hasNewer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [localTime, setLocalTime] = useState(false);
  const weighted = useReport((state) => state.weighted);
  const setWeighted = useReport((state) => state.setWeighted);
  const request = useRef<AbortController | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const retryRef = useRef({ query: "", select: false, navigate: false });
  const hasNewerRef = useRef(hasNewer);
  hasNewerRef.current = hasNewer;
  const selectionRef = useRef(selectedId);
  selectionRef.current = selectedId;

  useEffect(() => {
    setLocalTime(true);
    return () => request.current?.abort();
  }, []);
  useEffect(() => {
    request.current?.abort();
    setPoints(initial.points);
    setSelectedId(initial.selectedId);
    setBefore(initial.before);
    setHasNewer(initial.hasNewer);
    setError("");
    setLoading(false);
    if (initial.selectedId) {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("revision")) {
        url.searchParams.delete("before");
        url.searchParams.set("revision", initial.selectedId);
        window.history.replaceState(null, "", url);
      }
    }
  }, [initial]);

  const fetchPage = useCallback(
    async (query: string, select: boolean, navigate = false) => {
      retryRef.current = { query, select, navigate };
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/grades/history/timeline${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error("Could not load this part of your history.");
        const page: TimelinePage = await response.json();
        if (controller.signal.aborted) return;
        setPoints((current) =>
          select ? page.points : mergePoints(current, page.points),
        );
        setBefore((current) =>
          select
            ? page.before
            : current === null || page.before === null
              ? null
              : Math.min(current, page.before),
        );
        if (select) setHasNewer(page.hasNewer);
        if (select) {
          setSelectedId(page.selectedId);
          if (navigate && page.selectedId) {
            const url = new URL(window.location.href);
            url.search = `?revision=${page.selectedId}`;
            window.history.pushState(null, "", url);
          }
        }
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load history. Try again.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const onPop = () => {
      const params = new URL(window.location.href).searchParams;
      const revision = params.get("revision");
      const cached = revision
        ? pointsRef.current.find((point) => point.id === revision)
        : params.has("before")
          ? pointsRef.current.find(
              (point) => point.sequence === Number(params.get("before")) - 1,
            )
          : !hasNewerRef.current
            ? pointsRef.current.at(-1)
            : undefined;
      if (cached) {
        request.current?.abort();
        setLoading(false);
        setError("");
        setSelectedId(cached.id);
      } else {
        const query = revision
          ? `?revision=${encodeURIComponent(revision)}`
          : params.has("before")
            ? `?before=${encodeURIComponent(params.get("before") ?? "")}`
            : "";
        void fetchPage(query, true);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [fetchPage]);

  function commit(id: string) {
    request.current?.abort();
    setLoading(false);
    setError("");
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (url.searchParams.get("revision") === id) return;
    url.searchParams.delete("before");
    url.searchParams.set("revision", id);
    window.history.pushState(null, "", url);
  }
  function observed(value: string, short = false) {
    if (!localTime) return value.slice(0, 10);
    return new Intl.DateTimeFormat(
      "en-US",
      short
        ? { month: "short", day: "numeric" }
        : { dateStyle: "medium", timeStyle: "short" },
    ).format(new Date(value));
  }
  const { chartData, segmentKeys } = useMemo(() => {
    let segmentKey = "";
    let lastTerm = "";
    const keys: string[] = [];
    const data = points.map((point) => {
      const term = `${point.schoolYear}/${point.term}`;
      if (term !== lastTerm) {
        segmentKey = `gpa_${point.id}`;
        keys.push(segmentKey);
        lastTerm = term;
      }
      return {
        sequence: point.sequence,
        [segmentKey]: weighted ? point.grades.gpa : point.grades.unweightedGpa,
      };
    });
    return { chartData: data, segmentKeys: keys };
  }, [points, weighted]);
  const selected = points.find((point) => point.id === selectedId);
  const index = points.findIndex((point) => point.id === selectedId);
  if (!selected)
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {initial.unavailable
              ? "This saved update is unavailable"
              : "Your history starts here"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {initial.unavailable
              ? "Open your latest history to keep exploring."
              : "Open your gradebook to save your first report. Changes will appear here as your grades update."}
          </p>
          <Button asChild>
            <a href={initial.unavailable ? "/history" : "/"}>
              {initial.unavailable ? "View latest history" : "Open gradebook"}
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  const value = weighted ? selected.grades.gpa : selected.grades.unweightedGpa;
  const previousValue = selected.previousGrades
    ? weighted
      ? selected.previousGrades.gpa
      : selected.previousGrades.unweightedGpa
    : null;
  const groups = new Map<string, TimelinePoint["changes"]>();
  for (const change of selected.changes)
    groups.set(change.className, [
      ...(groups.get(change.className) ?? []),
      change,
    ]);
  const classes = [
    ...selected.grades.classes,
    ...(selected.previousGrades?.classes.filter(
      (cls) =>
        !selected.grades.classes.some((current) => current.id === cls.id),
    ) ?? []),
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" aria-hidden="true" />
              GPA over time
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              See how your grades changed with each saved update.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={weighted}
              onChange={(event) => setWeighted(event.target.checked)}
              className="size-4 accent-primary"
            />
            AP/Honors Boost
          </label>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">
              {gpa(value)}
            </span>
            <span className="text-sm text-muted-foreground">
              {weighted ? "Weighted GPA" : "Unweighted GPA"}
            </span>
            {previousValue !== null &&
            value !== null &&
            value !== previousValue ? (
              <span className="text-sm tabular-nums">
                {value > previousValue ? "+" : ""}
                {(value - previousValue).toFixed(3)} since previous update
              </span>
            ) : null}
          </div>
          <div
            className="h-56 w-full min-w-0 sm:h-64"
            role="img"
            aria-label={`GPA history across ${points.length} saved updates. Selected GPA ${gpa(value)}. Use the time slider below to explore.`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 20, left: -16, bottom: 0 }}
                accessibilityLayer
                onClick={(state) => {
                  const chartIndex = Number(state.activeTooltipIndex);
                  if (state.activeTooltipIndex != null && points[chartIndex])
                    commit(points[chartIndex].id);
                }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="sequence"
                  tickFormatter={(sequence) => {
                    const point = points.find(
                      (item) => item.sequence === sequence,
                    );
                    return point ? observed(point.observedAt, true) : "";
                  }}
                  minTickGap={36}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  domain={[0, weighted ? 5.5 : 4.5]}
                  ticks={weighted ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip
                  labelFormatter={(sequence) => {
                    const point = points.find(
                      (item) => item.sequence === sequence,
                    );
                    return point ? observed(point.observedAt) : "";
                  }}
                  formatter={(number) => [
                    typeof number === "number" ? number.toFixed(3) : "—",
                    "GPA",
                  ]}
                  contentStyle={{
                    background: "var(--card)",
                    color: "var(--foreground)",
                    borderColor: "var(--border)",
                    borderRadius: 12,
                  }}
                />
                {segmentKeys.map((segmentKey) => (
                  <Line
                    key={segmentKey}
                    dataKey={segmentKey}
                    name="GPA"
                    type="stepAfter"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
                <ReferenceLine
                  x={selected.sequence}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="history-time" className="text-sm font-medium">
                Explore your history
              </label>
              <span className="text-xs text-muted-foreground">
                Showing {observed(points[0].observedAt, true)} –{" "}
                {observed(points[points.length - 1].observedAt, true)}
              </span>
            </div>
            <input
              id="history-time"
              type="range"
              min={0}
              max={Math.max(0, points.length - 1)}
              step={1}
              value={index}
              disabled={points.length < 2}
              aria-valuetext={`${observed(selected.observedAt)}, GPA ${gpa(value)}`}
              className="block h-7 w-full cursor-pointer accent-primary disabled:cursor-default"
              onChange={(event) => {
                const id = points[Number(event.target.value)].id;
                selectionRef.current = id;
                setSelectedId(id);
              }}
              onPointerUp={() => {
                if (selectionRef.current) commit(selectionRef.current);
              }}
              onKeyUp={() => {
                if (selectionRef.current) commit(selectionRef.current);
              }}
              onBlur={() => {
                if (selectionRef.current) commit(selectionRef.current);
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={index <= 0}
                onClick={() => commit(points[index - 1].id)}
                aria-label="Previous saved update"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <time
                dateTime={selected.observedAt}
                className="text-center text-sm font-medium"
                aria-live="polite"
              >
                {observed(selected.observedAt)}
              </time>
              <Button
                variant="outline"
                size="sm"
                disabled={index >= points.length - 1}
                onClick={() => commit(points[index + 1].id)}
                aria-label="Next saved update"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {before !== null ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => void fetchPage(`?before=${before}`, false)}
                >
                  {loading ? "Loading history…" : "Load older history"}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  You’ve reached your first saved update.
                </span>
              )}
              {hasNewer || index < points.length - 1 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    hasNewer
                      ? void fetchPage("", true, true)
                      : commit(points[points.length - 1].id)
                  }
                >
                  Back to latest
                </Button>
              ) : null}
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    void fetchPage(
                      retryRef.current.query,
                      retryRef.current.select,
                      retryRef.current.navigate,
                    )
                  }
                >
                  Try again
                </button>
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <section aria-labelledby="grades-at-time" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="grades-at-time" className="font-semibold">
            Your grades at this time
          </h2>
          <span className="text-sm text-muted-foreground">
            Term {selected.term} · {selected.schoolYear}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const current = selected.grades.classes.find(
              (item) => item.id === cls.id,
            );
            const old = selected.previousGrades?.classes.find(
              (item) => item.id === cls.id,
            );
            const changed =
              old && current && old.percentage !== current.percentage;
            return (
              <div key={cls.id} className="rounded-xl border bg-card p-4">
                <h3 className="break-words text-sm font-medium">{cls.name}</h3>
                <p className="mt-2 flex flex-wrap items-baseline gap-2 tabular-nums">
                  {changed ? (
                    <span className="text-sm text-muted-foreground">
                      {percentage(old.percentage)} →
                    </span>
                  ) : null}
                  <span className="text-xl font-semibold">
                    {current ? percentage(current.percentage) : "Removed"}
                  </span>
                  {current?.letter ? (
                    <span className="text-sm text-muted-foreground">
                      {current.letter}
                    </span>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="size-5" aria-hidden="true" />
            {selected.sequence === 0
              ? "Your first saved gradebook"
              : "What changed"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {selected.sequence === 0
              ? "This is where your history begins. Choose a later update to see what changed."
              : "Since the previous saved update."}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {selected.sequence !== 0 && !selected.changes.length ? (
            <p className="text-sm text-muted-foreground">
              No assignment or class changes in this update.
            </p>
          ) : null}
          {[...groups].map(([name, changes]) => (
            <section key={name}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {name}
              </h3>
              <ul className="divide-y">
                {changes.map((change) => (
                  <li key={change.id} className="py-4 first:pt-1">
                    <p className="break-words text-sm leading-relaxed">
                      {change.summary}
                    </p>
                    {change.details.length ? (
                      <details className="mt-2">
                        <summary className="w-fit cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          View details
                          <span className="sr-only"> for {change.item}</span>
                        </summary>
                        <dl className="mt-3 space-y-2 border-l-2 pl-3">
                          {change.details.map((detail) => (
                            <div
                              key={detail.label}
                              className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr]"
                            >
                              <dt className="text-muted-foreground">
                                {detail.label}
                              </dt>
                              <dd className="min-w-0 whitespace-pre-wrap break-words">
                                {detail.before}{" "}
                                <span aria-hidden="true">→</span>
                                <span className="sr-only">changed to</span>{" "}
                                {detail.after}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </CardContent>
      </Card>
      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        Times show when facts saved an update. Grades are calculated using the
        current grading rules in facts.
      </p>
    </div>
  );
}
