import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'percentage';
  width?: number;
}

interface ExportData {
  [key: string]: any;
}

interface ExportSummary {
  label: string;
  value: string | number;
  type?: 'text' | 'currency' | 'number';
}

interface ExportOptions {
  title: string;
  filename: string;
  data: ExportData[];
  columns: ExportColumn[];
  summary?: ExportSummary[];
  subtitle?: string;
  showChart?: boolean;
  chartData?: { label: string; value: number }[];
}

/**
 * Enhanced Export to PDF with totals and charts
 */
export function exportToPDFEnhanced(options: ExportOptions) {
  const { title, filename, data, columns, summary, subtitle, showChart, chartData } = options;
  const doc = new jsPDF();
  let currentY = 15;

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, currentY);
  currentY += 8;

  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(subtitle, 14, currentY);
    currentY += 6;
  }

  // Add generation date
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generert: ${new Date().toLocaleDateString('no-NO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 14, currentY);
  currentY += 10;

  // Add summary section if provided
  if (summary && summary.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Sammendrag', 14, currentY);
    currentY += 7;

    // Draw summary box
    const boxWidth = 180;
    const boxHeight = summary.length * 8 + 6;
    doc.setFillColor(240, 248, 255);
    doc.rect(14, currentY - 3, boxWidth, boxHeight, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.rect(14, currentY - 3, boxWidth, boxHeight, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    summary.forEach((item, index) => {
      const yPos = currentY + (index * 8);
      doc.text(item.label + ':', 18, yPos);
      
      let valueText = '';
      if (item.type === 'currency') {
        valueText = `kr ${formatCurrency(item.value as number)}`;
      } else if (item.type === 'number') {
        valueText = formatNumber(item.value as number);
      } else {
        valueText = item.value.toString();
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text(valueText, 180, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    });

    currentY += boxHeight + 8;
  }

  // Add chart if provided
  if (showChart && chartData && chartData.length > 0) {
    try {
      const chartHeight = 40;
      const chartWidth = 180;
      const barMaxWidth = 150;
      const maxValue = Math.max(...chartData.map(d => d.value));

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Grafisk oversikt', 14, currentY);
      currentY += 8;

      chartData.slice(0, 10).forEach((item, index) => {
        const yPos = currentY + (index * 6);
        const barWidth = (item.value / maxValue) * barMaxWidth;

        // Draw bar
        doc.setFillColor(59, 130, 246);
        doc.rect(60, yPos - 3, barWidth, 4, 'F');

        // Draw label
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(item.label, 14, yPos, { maxWidth: 40 });

        // Draw value
        doc.text(formatNumber(item.value), 180, yPos, { align: 'right' });
      });

      currentY += (Math.min(chartData.length, 10) * 6) + 10;
    } catch (error) {
      console.error('Failed to add chart:', error);
    }
  }

  // Prepare table data
  const tableHeaders = columns.map(col => col.header);
  const tableData = data.map(row => 
    columns.map(col => formatCellValue(row[col.key], col.type))
  );

  // Calculate totals for numeric columns
  const totals: string[] = [];
  columns.forEach(col => {
    if (col.type === 'currency' || col.type === 'number') {
      const sum = data.reduce((acc, row) => {
        const value = parseFloat(row[col.key]) || 0;
        return acc + value;
      }, 0);
      totals.push(col.type === 'currency' ? `kr ${formatCurrency(sum)}` : formatNumber(sum));
    } else if (col.header.toLowerCase().includes('dato') || col.header === tableHeaders[0]) {
      totals.push('TOTALT:');
    } else {
      totals.push('');
    }
  });

  // Add table with totals row
  autoTable(doc, {
    head: [tableHeaders],
    body: [...tableData, totals],
    startY: currentY,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    // Style the last row (totals) as footer
    didParseCell: function(data) {
      if (data.row.index === tableData.length) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 9;
      }
    },
  });

  // Add footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Side ${i} av ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Enhanced Export to Excel with totals and formatting
 */
export function exportToExcelEnhanced(options: ExportOptions) {
  const { title, filename, data, columns, summary, subtitle } = options;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Prepare header rows
  const headerRows: any[] = [];
  
  // Title row
  headerRows.push([title]);
  headerRows.push([]);

  // Subtitle if provided
  if (subtitle) {
    headerRows.push([subtitle]);
    headerRows.push([]);
  }

  // Generation date
  headerRows.push([`Generert: ${new Date().toLocaleDateString('no-NO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`]);
  headerRows.push([]);

  // Summary section
  if (summary && summary.length > 0) {
    headerRows.push(['SAMMENDRAG']);
    summary.forEach(item => {
      let valueText = '';
      if (item.type === 'currency') {
        valueText = formatCurrency(item.value as number);
      } else if (item.type === 'number') {
        valueText = formatNumber(item.value as number);
      } else {
        valueText = item.value.toString();
      }
      headerRows.push([item.label, valueText]);
    });
    headerRows.push([]);
  }

  // Column headers
  const columnHeaders = columns.map(col => col.header);
  headerRows.push(columnHeaders);

  // Data rows
  const dataRows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      if (col.type === 'date' && value instanceof Date) {
        return value.toLocaleDateString('no-NO');
      }
      if (col.type === 'currency' || col.type === 'number') {
        return parseFloat(value) || 0;
      }
      return value?.toString() || '';
    })
  );

  // Calculate totals row
  const totalsRow = columns.map((col, index) => {
    if (col.type === 'currency' || col.type === 'number') {
      const sum = data.reduce((acc, row) => {
        const value = parseFloat(row[col.key]) || 0;
        return acc + value;
      }, 0);
      return sum;
    } else if (index === 0) {
      return 'TOTALT:';
    } else {
      return '';
    }
  });

  // Combine all rows
  const allRows = [...headerRows, ...dataRows, totalsRow];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  const colWidths = columns.map(col => {
    if (col.width) return { wch: col.width };
    const headerLength = col.header.length;
    const maxDataLength = Math.max(
      ...data.map(row => (row[col.key]?.toString() || '').length)
    );
    return { wch: Math.min(Math.max(headerLength, maxDataLength) + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  // Apply styling (Excel formatting)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Style title
  if (worksheet['A1']) {
    worksheet['A1'].s = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'left' }
    };
  }

  // Style column headers (row before data starts)
  const headerRowIndex = headerRows.length - 1;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '3B82F6' } },
        alignment: { horizontal: 'center' }
      };
    }
  }

  // Style totals row (last row)
  const totalsRowIndex = allRows.length - 1;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'F1F5F9' } }
      };
    }
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, title.substring(0, 31));

  // Save Excel file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Format cell value based on type
 */
function formatCellValue(value: any, type?: string): string {
  if (value === null || value === undefined) return '';

  switch (type) {
    case 'date':
      return value instanceof Date 
        ? value.toLocaleDateString('no-NO') 
        : new Date(value).toLocaleDateString('no-NO');
    
    case 'currency':
      return `kr ${formatCurrency(parseFloat(value) || 0)}`;
    
    case 'number':
      return formatNumber(parseFloat(value) || 0);
    
    case 'percentage':
      return `${(parseFloat(value) || 0).toFixed(1)}%`;
    
    default:
      return value.toString();
  }
}

/**
 * Format currency with thousand separators
 */
function formatCurrency(value: number): string {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Format number with thousand separators
 */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Format hours for display
 */
export function formatHours(hours: number | string): string {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  return Math.abs(numHours).toFixed(2);
}

/**
 * Format hours as "X timer Y minutter"
 */
export function formatDuration(hours: number | string): string {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  const absHours = Math.abs(numHours);
  
  const wholeHours = Math.floor(absHours);
  const minutes = Math.round((absHours - wholeHours) * 60);
  
  if (wholeHours === 0 && minutes === 0) {
    return "0 minutter";
  }
  
  if (wholeHours === 0) {
    return `${minutes} minutt${minutes !== 1 ? 'er' : ''}`;
  }
  
  if (minutes === 0) {
    return `${wholeHours} time${wholeHours !== 1 ? 'r' : ''}`;
  }
  
  return `${wholeHours} time${wholeHours !== 1 ? 'r' : ''} ${minutes} minutt${minutes !== 1 ? 'er' : ''}`;
}
