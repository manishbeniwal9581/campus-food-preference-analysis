import React, { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PieController,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Download } from 'lucide-react';
import { CardReportPayload } from '../utils/cardExport';
import { DownloadReportButton } from './DownloadReportButton';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PieController,
  PointElement,
  Tooltip
);

interface ChartCanvasProps {
  title: string;
  subtitle?: string;
  config: ChartConfiguration;
  heightClass?: string;
  exportFilename: string;
  headerRight?: React.ReactNode;
  reportSummary?: string[];
  reportHeaders?: string[];
  reportRows?: Array<Array<string | number>>;
}

export const ChartCanvas: React.FC<ChartCanvasProps> = ({
  title,
  subtitle,
  config,
  heightClass = 'h-72',
  exportFilename,
  headerRight,
  reportSummary,
  reportHeaders,
  reportRows,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(canvas, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [config]);

  const getChartDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    return tempCanvas.toDataURL('image/png', 1.0);
  };

  const handleDownloadPng = () => {
    const dataUrl = getChartDataUrl();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${exportFilename}.png`;
    link.href = dataUrl;
    link.click();
  };

  const buildReportPayload = (): CardReportPayload => {
    const labels = Array.isArray(config.data?.labels)
      ? config.data.labels.map((l) => String(l))
      : [];
    const datasets = Array.isArray(config.data?.datasets) ? config.data.datasets : [];

    const derivedHeaders =
      reportHeaders && reportHeaders.length > 0
        ? reportHeaders
        : ['Label', ...datasets.map((ds, idx) => ds.label || `Series ${idx + 1}`)];

    const derivedRows =
      reportRows && reportRows.length > 0
        ? reportRows
        : labels.map((label, rowIdx) => [
            label,
            ...datasets.map((ds) => {
              const val = Array.isArray(ds.data) ? ds.data[rowIdx] : '';
              return typeof val === 'number' || typeof val === 'string' ? val : '';
            }),
          ]);

    const derivedSummary =
      reportSummary && reportSummary.length > 0
        ? reportSummary
        : [`Chart data exported from "${title}" (${derivedRows.length} data points).`];

    return {
      title,
      subtitle,
      filename: exportFilename,
      summaryLines: derivedSummary,
      headers: derivedHeaders,
      rows: derivedRows,
      chartImageDataUrl: getChartDataUrl(),
    };
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col print:break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
          {headerRight}
          <button
            type="button"
            onClick={handleDownloadPng}
            title={`Download ${title} as PNG`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>
          <DownloadReportButton getPayload={buildReportPayload} />
        </div>
      </div>
      <div className={`relative w-full ${heightClass}`}>
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
};
