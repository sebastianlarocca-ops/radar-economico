"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export type DataPoint = { t: string; v: number };

export function Sparkline({ data, color = "#2563eb" }: { data: DataPoint[]; color?: string }) {
  if (!data || data.length === 0) return <div style={{ height: 28 }} />;
  return (
    <div style={{ height: 28, margin: "4px -6px -2px -6px" }}>
      <Line
        data={{
          labels: data.map((d) => d.t),
          datasets: [
            {
              data: data.map((d) => d.v),
              borderColor: color,
              backgroundColor: color + "22",
              fill: true,
              borderWidth: 1.4,
              pointRadius: 0,
              tension: 0.25,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          elements: { line: { cubicInterpolationMode: "monotone" } },
        }}
      />
    </div>
  );
}

function makeLabels(points: DataPoint[]): string[] {
  if (points.length === 0) return [];
  const firstYear = new Date(points[0].t).getUTCFullYear();
  const lastYear  = new Date(points[points.length - 1].t).getUTCFullYear();
  const multiYear = lastYear !== firstYear;

  return points.map((d) => {
    const dt = new Date(d.t);
    if (multiYear) {
      // "may '21" — compact month + 2-digit year
      const mon = dt.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" });
      const yr  = String(dt.getUTCFullYear()).slice(2);
      return `${mon} '${yr}`;
    }
    // Single year: keep day + month (no year noise)
    return dt.toLocaleDateString("es-AR", { day: "2-digit", month: "short", timeZone: "UTC" });
  });
}

export type LineDataset = {
  label: string;
  data: DataPoint[];
  color: string;
  yAxisID?: string;
};

export function LineChart({
  datasets,
  height = 240,
  yAxisLabel,
  yAxisLabelRight,
}: {
  datasets: LineDataset[];
  height?: number;
  yAxisLabel?: string;
  yAxisLabelRight?: string;
}) {
  const hasRight = datasets.some((d) => d.yAxisID === "y1");

  const chartDatasets = datasets.map((ds) => ({
    label: ds.label,
    data: ds.data.map((d) => d.v),
    borderColor: ds.color,
    backgroundColor: ds.color + "18",
    fill: false,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.22,
    yAxisID: ds.yAxisID ?? "y",
  }));

  // Use labels from the longest dataset (best date coverage for mixed-source charts)
  const longestDs = datasets.reduce((a, b) => a.data.length >= b.data.length ? a : b, datasets[0]);
  const labels = makeLabels(longestDs?.data ?? []);

  const scales: Record<string, object> = {
    x: {
      ticks: {
        maxTicksLimit: 8,
        font: { size: 10 },
        color: "#64748b",
        maxRotation: 0,
      },
      grid: { color: "#e2e8f0" },
    },
    y: {
      position: "left",
      ticks: { font: { size: 10 }, color: "#64748b" },
      grid: { color: "#e2e8f0" },
      title: yAxisLabel
        ? { display: true, text: yAxisLabel, font: { size: 10 }, color: "#64748b" }
        : { display: false },
    },
  };

  if (hasRight) {
    scales.y1 = {
      position: "right",
      ticks: { font: { size: 10 }, color: "#64748b" },
      grid: { drawOnChartArea: false },
      title: yAxisLabelRight
        ? { display: true, text: yAxisLabelRight, font: { size: 10 }, color: "#64748b" }
        : { display: false },
    };
  }

  return (
    <div style={{ height }}>
      <Line
        data={{ labels, datasets: chartDatasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              display: datasets.length > 1,
              position: "bottom",
              labels: { font: { size: 11 }, boxWidth: 12, padding: 12 },
            },
            tooltip: {
              mode: "index",
              intersect: false,
              titleFont: { size: 11 },
              bodyFont: { size: 11 },
            },
          },
          scales,
        }}
      />
    </div>
  );
}

export function BarChart({
  data,
  color = "#2563eb",
  height = 240,
}: {
  data: DataPoint[];
  color?: string;
  height?: number;
}) {
  const labels = makeLabels(data);

  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "",
              data: data.map((d) => d.v),
              borderColor: color,
              backgroundColor: color + "55",
              fill: true,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: "index", intersect: false, titleFont: { size: 11 }, bodyFont: { size: 11 } },
          },
          scales: {
            x: {
              ticks: { maxTicksLimit: 10, font: { size: 10 }, color: "#64748b", maxRotation: 0 },
              grid: { color: "#e2e8f0" },
            },
            y: {
              ticks: { font: { size: 10 }, color: "#64748b" },
              grid: { color: "#e2e8f0" },
            },
          },
        }}
      />
    </div>
  );
}
