'use strict';

/* ============================================================
   SAMADHAN TRADING — BREAKOUT KINGS EXPORTS
   Generates and downloads CSV, Excel, and Print/PDF reports.
   ============================================================ */

window.BreakoutKingsExports = (() => {

  const exportCSV = (results) => {
    if (!results || results.length === 0) {
      if (window.AppState && typeof window.AppState.toast === 'function') {
        window.AppState.toast('No scan results to export', 'warning');
      }
      return;
    }

    const headers = ['Symbol', 'Price (₹)', '50D High (₹)', '52W High (₹)', 'Volume Ratio', 'RSI (14)', 'ADX (14)', 'RS vs Nifty (%)', 'Scoring', 'Category', 'Last Scanned'];
    const rows = results.map(r => [
      r.symbol,
      r.price.toFixed(2),
      r.high50d.toFixed(2),
      r.high52w.toFixed(2),
      r.volRatio.toFixed(2),
      r.rsi != null ? r.rsi.toFixed(1) : '—',
      r.adx != null ? r.adx.toFixed(1) : '—',
      r.rsScore.toFixed(2),
      `${r.score}/100`,
      r.category,
      new Date(r.timestamp).toLocaleTimeString()
    ].map(v => `"${v}"`).join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `breakout_kings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast('Exported scan to CSV', 'success');
    }
  };

  const exportExcel = (results) => {
    if (!results || results.length === 0) {
      return;
    }

    // Generate Excel XML format
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="King">
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Strong">
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Breakout Kings">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Symbol</Data></Cell>
    <Cell><Data ss:Type="String">Price (Rs.)</Data></Cell>
    <Cell><Data ss:Type="String">50D High (Rs.)</Data></Cell>
    <Cell><Data ss:Type="String">52W High (Rs.)</Data></Cell>
    <Cell><Data ss:Type="String">Volume Ratio</Data></Cell>
    <Cell><Data ss:Type="String">RSI (14)</Data></Cell>
    <Cell><Data ss:Type="String">ADX (14)</Data></Cell>
    <Cell><Data ss:Type="String">RS vs Nifty (%)</Data></Cell>
    <Cell><Data ss:Type="String">Score</Data></Cell>
    <Cell><Data ss:Type="String">Category</Data></Cell>
   </Row>`;

    results.forEach(r => {
      const style = r.category === 'Breakout King' ? ' ss:StyleID="King"' : (r.category === 'Strong Breakout' ? ' ss:StyleID="Strong"' : '');
      xml += `\n   <Row${style}>
    <Cell><Data ss:Type="String">${r.symbol}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.price.toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.high50d.toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.high52w.toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.volRatio.toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.rsi != null ? r.rsi.toFixed(1) : 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.adx != null ? r.adx.toFixed(1) : 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.rsScore.toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="Number">${r.score}</Data></Cell>
    <Cell><Data ss:Type="String">${r.category}</Data></Cell>
   </Row>`;
    });

    xml += `\n  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `breakout_kings_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast('Exported scan to Excel', 'success');
    }
  };

  const exportPDF = (results, stats) => {
    if (!results || results.length === 0) return;

    // Create printable document in iframe to isolate styles
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    const timeStr = new Date().toLocaleString();

    const tableRows = results.map(r => `
      <tr class="${r.category === 'Breakout King' ? 'king' : (r.category === 'Strong Breakout' ? 'strong' : '')}">
        <td><strong>${r.symbol}</strong></td>
        <td style="text-align:right;">₹${r.price.toFixed(2)}</td>
        <td style="text-align:right;">₹${r.high50d.toFixed(2)}</td>
        <td style="text-align:right;">₹${r.high52w.toFixed(2)}</td>
        <td style="text-align:right;">${r.volRatio.toFixed(2)}x</td>
        <td style="text-align:right;">${r.rsi != null ? r.rsi.toFixed(1) : '—'}</td>
        <td style="text-align:right;">${r.adx != null ? r.adx.toFixed(1) : '—'}</td>
        <td style="text-align:right;">${r.rsScore.toFixed(2)}%</td>
        <td style="text-align:right; font-weight:bold;">${r.score}/100</td>
        <td style="text-align:center;">${r.category}</td>
      </tr>
    `).join('');

    doc.open();
    doc.write(`
      <html>
      <head>
        <title>Breakout Kings Scanner Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333333; line-height: 1.4; }
          h1 { margin: 0 0 5px 0; font-size: 22pt; color: #0f172a; }
          p.subtitle { margin: 0 0 20px 0; color: #475569; font-size: 10pt; }
          .stats-grid { display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
          .stat-box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 15px; flex-grow: 1; text-align: center; background: #f8fafc; }
          .stat-lbl { font-size: 7pt; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .stat-val { font-size: 14pt; font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5pt; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 10px; }
          th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 7.5pt; color: #334155; }
          tr.king { background: #fef3c7; }
          tr.strong { background: #ecfdf5; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: right; font-size: 7pt; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>Breakout Kings Scanner Report</h1>
        <p class="subtitle">Trading Platform — Generated on ${timeStr}</p>
        
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-lbl">Total Scanned</div>
            <div class="stat-val">${stats.total}</div>
          </div>
          <div class="stat-box" style="border-left: 3px solid #f59e0b;">
            <div class="stat-lbl" style="color:#b45309;">Breakout Kings</div>
            <div class="stat-val" style="color:#b45309;">${stats.kings}</div>
          </div>
          <div class="stat-box" style="border-left: 3px solid #10b981;">
            <div class="stat-lbl" style="color:#047857;">Strong Breakouts</div>
            <div class="stat-val" style="color:#047857;">${stats.strong}</div>
          </div>
          <div class="stat-box" style="border-left: 3px solid #8b5cf6;">
            <div class="stat-lbl" style="color:#6d28d9;">Watchlist</div>
            <div class="stat-val" style="color:#6d28d9;">${stats.watchlist}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th style="text-align:right;">Price</th>
              <th style="text-align:right;">50D High</th>
              <th style="text-align:right;">52W High</th>
              <th style="text-align:right;">Vol Ratio</th>
              <th style="text-align:right;">RSI</th>
              <th style="text-align:right;">ADX</th>
              <th style="text-align:right;">RS vs Nifty</th>
              <th style="text-align:right;">Score</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          Trading Systems © 2026. All Rights Reserved. Confidential Quant Report.
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Trigger iframe printing
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  return {
    exportCSV,
    exportExcel,
    exportPDF
  };

})();
