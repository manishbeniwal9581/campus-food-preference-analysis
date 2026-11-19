import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  CardReportPayload,
  exportCardAsCsv,
  exportCardAsPdf,
} from '../utils/cardExport';

interface DownloadReportButtonProps {
  getPayload: () => CardReportPayload;
  compact?: boolean;
  darkSurface?: boolean;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  getPayload,
  compact = false,
  darkSurface = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleExport = (format: 'csv' | 'pdf') => {
    const payload = getPayload();
    if (format === 'csv') {
      exportCardAsCsv(payload);
    } else {
      exportCardAsPdf(payload);
    }
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
        } ${
          darkSurface
            ? 'text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700'
            : 'text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Download Report</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('pdf')}
            className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>Download as PDF</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('csv')}
            className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Download as CSV</span>
          </button>
        </div>
      )}
    </div>
  );
};
