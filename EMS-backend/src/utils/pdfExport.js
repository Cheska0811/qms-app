export async function exportDashboardToPDF({ title, subtitle, stats, containerId }) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;

  // Header bar
  pdf.setFillColor(56, 77, 230);
  pdf.rect(0, 0, pageWidth, 24, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, margin, 15);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(subtitle, margin, 21);

  // Generated date (right side)
  const dateStr = new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' });
  pdf.text(`Generated: ${dateStr}`, pageWidth - margin, 21, { align: 'right' });

  // Stat cards section
  let y = 32;
  pdf.setTextColor(80, 80, 100);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('KEY METRICS', margin, y);
  y += 5;

  const colCount = Math.min(stats.length, 4);
  const colWidth = (pageWidth - margin * 2) / colCount;

  stats.forEach((stat, i) => {
    const x = margin + i * colWidth;
    // Card background
    pdf.setFillColor(245, 246, 250);
    pdf.roundedRect(x, y, colWidth - 3, 22, 2, 2, 'F');
    pdf.setDrawColor(220, 222, 235);
    pdf.roundedRect(x, y, colWidth - 3, 22, 2, 2, 'S');

    // Label
    pdf.setTextColor(130, 135, 160);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(stat.label.toUpperCase(), x + 4, y + 7);

    // Value
    pdf.setTextColor(30, 35, 60);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stat.value, x + 4, y + 16);

    // Subtitle
    if (stat.sub) {
      pdf.setTextColor(130, 135, 160);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(stat.sub, x + 4, y + 20.5);
    }
  });

  y += 28;

  // Charts section
  const container = document.getElementById(containerId);
  if (container) {
    pdf.setTextColor(80, 80, 100);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CHARTS & ANALYSIS', margin, y);
    y += 4;

    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // If charts overflow page, add new page(s)
    const availableHeight = pageHeight - y - 14;
    if (imgHeight <= availableHeight) {
      pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
    } else {
      // Scale to fit, or split across pages
      const scale = availableHeight / imgHeight;
      if (scale > 0.5) {
        pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight * scale);
      } else {
        pdf.addImage(imgData, 'PNG', margin, y, imgWidth, availableHeight);
        pdf.addPage();
        const remaining = imgHeight - availableHeight / scale;
        pdf.addImage(imgData, 'PNG', margin, 14, imgWidth, Math.min(remaining * scale, pageHeight - 28));
      }
    }
  }

  // Footer
  const totalPages = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(220, 222, 235);
    pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    pdf.setTextColor(160, 160, 180);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('DeptFlow — Confidential', margin, pageHeight - 5);
    pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
