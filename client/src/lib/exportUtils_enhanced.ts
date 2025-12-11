import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
}

interface ExportData {
  [key: string]: any;
}

interface EmployeeSummary {
  employeeName: string;
  totalHours: number;
  shiftCount: number;
}

/**
 * Format hours as "X timer Y minutter" for better readability
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

/**
 * Generate a simple bar chart as base64 image
 */
function generateBarChart(employeeSummaries: EmployeeSummary[]): string {
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Sort by hours descending and take top 10
  const topEmployees = [...employeeSummaries]
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 10);
  
  // Chart dimensions
  const chartX = 80;
  const chartY = 40;
  const chartWidth = 400;
  const chartHeight = 200;
  
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Timefordeling per ansatt', 150, 20);
  
  // Find max hours for scaling
  const maxHours = Math.max(...topEmployees.map(e => e.totalHours), 1);
  
  // Draw bars
  const barWidth = chartWidth / topEmployees.length - 10;
  topEmployees.forEach((emp, index) => {
    const barHeight = (emp.totalHours / maxHours) * chartHeight;
    const x = chartX + (index * (chartWidth / topEmployees.length));
    const y = chartY + chartHeight - barHeight;
    
    // Bar
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Value on top
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.fillText(emp.totalHours.toFixed(1), x + barWidth / 4, y - 5);
    
    // Employee name (rotated)
    ctx.save();
    ctx.translate(x + barWidth / 2, chartY + chartHeight + 10);
    ctx.rotate(-Math.PI / 4);
    ctx.font = '9px Arial';
    ctx.fillText(emp.employeeName.substring(0, 15), 0, 0);
    ctx.restore();
  });
  
  // Y-axis
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartX - 5, chartY);
  ctx.lineTo(chartX - 5, chartY + chartHeight);
  ctx.stroke();
  
  // Y-axis label
  ctx.fillStyle = '#666666';
  ctx.font = '10px Arial';
  ctx.save();
  ctx.translate(15, chartY + chartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Timer', 0, 0);
  ctx.restore();
  
  return canvas.toDataURL('image/png');
}

/**
 * Export attendance data to PDF with summary and chart
 */
export function exportAttendanceToPDF(
  data: ExportData[],
  employeeSummaries: EmployeeSummary[],
  columns: ExportColumn[],
  title: string,
  filename: string,
  startDate: string,
  endDate: string
) {
  const doc = new jsPDF();
  let currentY = 15;
  
  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, currentY);
  currentY += 10;
  
  // Add period
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${new Date(startDate).toLocaleDateString('no-NO')} - ${new Date(endDate).toLocaleDateString('no-NO')}`, 14, currentY);
  currentY += 6;
  
  // Add generation date
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generert: ${new Date().toLocaleDateString('no-NO')} ${new Date().toLocaleTimeString('no-NO')}`, 14, currentY);
  currentY += 12;
  
  // Reset text color
  doc.setTextColor(0);
  
  // Add summary section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Sammendrag', 14, currentY);
  currentY += 8;
  
  // Calculate totals
  const totalHours = employeeSummaries.reduce((sum, emp) => sum + emp.totalHours, 0);
  const totalShifts = employeeSummaries.reduce((sum, emp) => sum + emp.shiftCount, 0);
  const totalEmployees = employeeSummaries.length;
  const averageHours = totalEmployees > 0 ? totalHours / totalEmployees : 0;
  
  // Summary box
  doc.setFillColor(59, 130, 246);
  doc.rect(14, currentY, 182, 30, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(255);
  doc.setFont('helvetica', 'normal');
  doc.text(`Totalt antall ansatte: ${totalEmployees}`, 18, currentY + 8);
  doc.text(`Totalt antall skift: ${totalShifts}`, 18, currentY + 15);
  doc.text(`Totale timer: ${formatDuration(totalHours)}`, 18, currentY + 22);
  doc.text(`Gjennomsnittlige timer per ansatt: ${formatDuration(averageHours)}`, 100, currentY + 15);
  
  currentY += 38;
  doc.setTextColor(0);
  
  // Add chart if there's employee data
  if (employeeSummaries.length > 0 && typeof document !== 'undefined') {
    try {
      const chartImage = generateBarChart(employeeSummaries);
      if (chartImage) {
        doc.addImage(chartImage, 'PNG', 14, currentY, 180, 100);
        currentY += 110;
      }
    } catch (error) {
      console.error('Failed to generate chart:', error);
    }
  }
  
  // Add new page for detailed table
  doc.addPage();
  currentY = 15;
  
  // Table title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detaljert oversikt', 14, currentY);
  currentY += 8;
  
  // Prepare table data with formatted duration
  const tableHeaders = columns.map(col => col.header);
  const tableData = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      // Format dates
      if (value instanceof Date) {
        return value.toLocaleDateString('no-NO');
      }
      // Format duration (hours)
      if (col.key === 'duration' && value) {
        return formatDuration(value);
      }
      return value?.toString() || '';
    })
  );
  
  // Generate table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: currentY,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });
  
  // Save PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Export attendance data to Excel with summary
 */
export function exportAttendanceToExcel(
  data: ExportData[],
  employeeSummaries: EmployeeSummary[],
  columns: ExportColumn[],
  title: string,
  filename: string,
  startDate: string,
  endDate: string
) {
  const workbook = XLSX.utils.book_new();
  
  // === Summary Sheet ===
  const summaryData = [];
  
  // Header
  summaryData.push([title]);
  summaryData.push([`Periode: ${new Date(startDate).toLocaleDateString('no-NO')} - ${new Date(endDate).toLocaleDateString('no-NO')}`]);
  summaryData.push([`Generert: ${new Date().toLocaleDateString('no-NO')} ${new Date().toLocaleTimeString('no-NO')}`]);
  summaryData.push([]);
  
  // Totals
  const totalHours = employeeSummaries.reduce((sum, emp) => sum + emp.totalHours, 0);
  const totalShifts = employeeSummaries.reduce((sum, emp) => sum + emp.shiftCount, 0);
  const totalEmployees = employeeSummaries.length;
  const averageHours = totalEmployees > 0 ? totalHours / totalEmployees : 0;
  
  summaryData.push(['SAMMENDRAG']);
  summaryData.push(['Totalt antall ansatte:', totalEmployees]);
  summaryData.push(['Totalt antall skift:', totalShifts]);
  summaryData.push(['Totale timer:', formatDuration(totalHours)]);
  summaryData.push(['Gjennomsnittlige timer per ansatt:', formatDuration(averageHours)]);
  summaryData.push([]);
  
  // Employee summaries
  summaryData.push(['TIMER PER ANSATT']);
  summaryData.push(['Ansatt', 'Timer', 'Antall skift']);
  
  employeeSummaries
    .sort((a, b) => b.totalHours - a.totalHours)
    .forEach(emp => {
      summaryData.push([
        emp.employeeName,
        formatDuration(emp.totalHours),
        emp.shiftCount
      ]);
    });
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sammendrag');
  
  // === Details Sheet ===
  const worksheetData = data.map(row => {
    const formattedRow: any = {};
    columns.forEach(col => {
      const value = row[col.key];
      // Format dates
      if (value instanceof Date) {
        formattedRow[col.header] = value.toLocaleDateString('no-NO');
      }
      // Format duration
      else if (col.key === 'duration' && value) {
        formattedRow[col.header] = formatDuration(value);
      }
      else {
        formattedRow[col.header] = value?.toString() || '';
      }
    });
    return formattedRow;
  });
  
  const detailsSheet = XLSX.utils.json_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Detaljer');
  
  // Auto-size columns for both sheets
  [summarySheet, detailsSheet].forEach(sheet => {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const colWidths: number[] = [];
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      }
      colWidths[C] = Math.min(maxWidth + 2, 50);
    }
    
    sheet['!cols'] = colWidths.map(w => ({ wch: w }));
  });
  
  // Save Excel file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
