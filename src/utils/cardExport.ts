import { jsPDF } from 'jspdf';
import { triggerFileDownload } from './csv';

export interface CardReportPayload {
  title: string;
  subtitle?: string;
  filename: string;
  summaryLines: string[];
  headers: string[];
  rows: Array<Array<string | number>>;
  chartImageDataUrl?: string | null;
}

function escapeCsvCell(val: string | number): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCardAsCsv(payload: CardReportPayload): void {
  const lines: string[] = [];
  lines.push([escapeCsvCell('Report'), escapeCsvCell(payload.title)].join(','));
  lines.push(
    [escapeCsvCell('Generated'), escapeCsvCell(new Date().toLocaleString())].join(',')
  );
  if (payload.subtitle) {
    lines.push([escapeCsvCell('Description'), escapeCsvCell(payload.subtitle)].join(','));
  }
  lines.push('');

  if (payload.summaryLines.length > 0) {
    lines.push('Summary');
    for (const line of payload.summaryLines) {
      lines.push(escapeCsvCell(line));
    }
    lines.push('');
  }

  if (payload.headers.length > 0) {
    lines.push(payload.headers.map(escapeCsvCell).join(','));
    for (const row of payload.rows) {
      lines.push(row.map(escapeCsvCell).join(','));
    }
  }

  triggerFileDownload(
    `${payload.filename}_${new Date().toISOString().slice(0, 10)}.csv`,
    lines.join('\n'),
    'text/csv;charset=utf-8;'
  );
}

export function exportCardAsPdf(payload: CardReportPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Dark Navy Header Band
  doc.setFillColor(11, 20, 38);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(249, 115, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CAMPUSBITE AI · CANTEEN INTELLIGENCE REPORT', margin, 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(payload.title, margin, 19);

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, 24.5);

  y = 36;

  if (payload.subtitle) {
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9.5);
    const subLines = doc.splitTextToSize(payload.subtitle, contentWidth);
    doc.text(subLines, margin, y);
    y += subLines.length * 4.5 + 3;
  }

  // Summary section
  if (payload.summaryLines.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const wrappedLines = payload.summaryLines.flatMap((line) =>
      doc.splitTextToSize(`• ${line}`, contentWidth - 8)
    );
    const boxHeight = wrappedLines.length * 4.8 + 8;
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    let innerY = y + 6;
    for (const wLine of wrappedLines) {
      doc.text(wLine, margin + 4, innerY);
      innerY += 4.8;
    }
    y += boxHeight + 7;
  }

  // Optional embedded chart image
  if (payload.chartImageDataUrl) {
    const imgWidth = contentWidth;
    const imgHeight = 82;
    if (y + imgHeight > pageHeight - 20) {
      doc.addPage();
      y = 16;
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, imgWidth, imgHeight);
    doc.addImage(payload.chartImageDataUrl, 'PNG', margin + 2, y + 2, imgWidth - 4, imgHeight - 4);
    y += imgHeight + 8;
  }

  // Data table
  if (payload.headers.length > 0 && payload.rows.length > 0) {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 16;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Underlying Data Breakdown', margin, y);
    y += 5;

    const colCount = payload.headers.length;
    const colWidth = contentWidth / colCount;

    // Header row
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    payload.headers.forEach((h, i) => {
      const cellText = doc.splitTextToSize(String(h), colWidth - 3)[0] || '';
      doc.text(cellText, margin + i * colWidth + 2, y + 5);
    });
    y += 7.5;

    // Body rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    payload.rows.forEach((row, rowIdx) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        y = 16;
      }
      if (rowIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 7, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 7, margin + contentWidth, y + 7);
      doc.setTextColor(30, 41, 59);

      row.forEach((cell, colIdx) => {
        const text = doc.splitTextToSize(String(cell ?? ''), colWidth - 3)[0] || '';
        doc.text(text, margin + colIdx * colWidth + 2, y + 4.8);
      });
      y += 7;
    });
  }

  doc.save(`${payload.filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
