/**
 * exportUtils.js
 * High-fidelity, enterprise multi-format exporter for CCETS
 * Supports: CSV (.csv), Excel (.xlsx/.xls), Word (.docx/.doc), PDF (.pdf)
 */

// Helper to sanitize cell values and strip HTML / JSX artifacts
const sanitizeValue = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') {
        if (val instanceof Date) return val.toLocaleDateString();
        // If React element or object, fallback to text representation
        return '';
    }
    const str = String(val).trim();
    // Strip simple HTML tags if string contains markup
    return str.replace(/<[^>]*>?/gm, '');
};

// Helper to trigger browser file download from Blob
const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 200);
};

/**
 * 1. CSV EXPORT (.csv)
 * RFC 4180 standard with UTF-8 BOM
 */
export const exportToCsv = ({
    filename = 'export.csv',
    columns = [],
    data = [],
    metadata = {}
}) => {
    const visibleCols = columns.filter(c => c.id !== 'actions' && c.id !== '__selection');
    
    // Header row
    const headers = visibleCols.map(c => `"${(c.label || c.id).replace(/"/g, '""')}"`);
    
    // Data rows
    const rows = data.map(item => {
        return visibleCols.map(col => {
            let val = item[col.id];
            if (col.exportValue && typeof col.exportValue === 'function') {
                val = col.exportValue(item);
            } else if (col.formatter && typeof val !== 'undefined') {
                const formatted = col.formatter(val, item);
                val = sanitizeValue(formatted) || sanitizeValue(val);
            } else {
                val = sanitizeValue(val);
            }
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
};

/**
 * 2. EXCEL EXPORT (.xlsx / XML Spreadsheet)
 * Formatted with table styles, headers, and metadata
 */
export const exportToExcel = ({
    filename = 'export.xlsx',
    title = 'Data Export',
    columns = [],
    data = [],
    metadata = {}
}) => {
    const visibleCols = columns.filter(c => c.id !== 'actions' && c.id !== '__selection');
    const now = new Date().toLocaleString();
    const safeTitle = sanitizeValue(title || 'CCETS Data Export');

    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>${safeTitle.slice(0, 31)}</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:Worksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
            <style>
                body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; }
                .title-row { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
                .meta-row { font-size: 9pt; color: #64748b; font-style: italic; }
                .header-th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; font-size: 11pt; border: 1px solid #0f172a; padding: 8px 12px; }
                .data-td { border: 1px solid #cbd5e1; font-size: 10pt; padding: 6px 10px; }
                .alt-row { background-color: #f8fafc; }
            </style>
        </head>
        <body>
            <table>
                <tr><td colspan="${visibleCols.length}" class="title-row">${safeTitle}</td></tr>
                <tr><td colspan="${visibleCols.length}" class="meta-row">System: Cold Chain Equipment Ticketing System (CCETS) | Generated: ${now} | Total Records: ${data.length}</td></tr>
                <tr></tr>
                <thead>
                    <tr>
                        ${visibleCols.map(c => `<th class="header-th">${sanitizeValue(c.label || c.id)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach((item, index) => {
        const isAlt = index % 2 === 1;
        html += `<tr class="${isAlt ? 'alt-row' : ''}">`;
        visibleCols.forEach(col => {
            let val = item[col.id];
            if (col.exportValue && typeof col.exportValue === 'function') {
                val = col.exportValue(item);
            } else if (col.formatter && typeof val !== 'undefined') {
                const formatted = col.formatter(val, item);
                val = sanitizeValue(formatted) || sanitizeValue(val);
            } else {
                val = sanitizeValue(val);
            }
            html += `<td class="data-td">${val}</td>`;
        });
        html += `</tr>`;
    });

    html += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const finalName = filename.endsWith('.xlsx') || filename.endsWith('.xls') ? filename : `${filename}.xlsx`;
    downloadBlob(blob, finalName);
};

/**
 * 3. WORD DOCUMENT EXPORT (.docx / .doc)
 * Word HTML standard document with official letterhead and tabular formatting
 */
export const exportToDocx = ({
    filename = 'export.docx',
    title = 'Official Report',
    columns = [],
    data = [],
    metadata = {}
}) => {
    const visibleCols = columns.filter(c => c.id !== 'actions' && c.id !== '__selection');
    const now = new Date().toLocaleString();
    const safeTitle = sanitizeValue(title || 'CCETS Data Report');

    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:w="urn:schemas-microsoft-com:office:word" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <title>${safeTitle}</title>
            <style>
                @page Section1 {
                    size: 841.9pt 595.3pt; /* A4 Landscape */
                    margin: 36.0pt 36.0pt 36.0pt 36.0pt;
                    mso-header-margin: 35.4pt;
                    mso-footer-margin: 35.4pt;
                    mso-paper-source: 0;
                }
                div.Section1 { page: Section1; }
                body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #333; }
                .doc-header { margin-bottom: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
                .doc-title { font-size: 18pt; font-weight: bold; color: #1e3a8a; margin: 0 0 4px 0; }
                .doc-subtitle { font-size: 10pt; color: #64748b; margin: 0; }
                .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .report-table th { background-color: #1e3a8a; color: #ffffff; border: 1px solid #1e3a8a; padding: 8px 10px; font-weight: bold; font-size: 9.5pt; text-align: left; }
                .report-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 9pt; }
                .report-table tr:nth-child(even) { background-color: #f8fafc; }
                .doc-footer { margin-top: 25px; font-size: 8.5pt; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 8px; }
            </style>
        </head>
        <body>
            <div class="Section1">
                <div class="doc-header">
                    <h1 class="doc-title">${safeTitle}</h1>
                    <p class="doc-subtitle">Cold Chain Equipment Ticketing System (CCETS) &bull; Official Inventory &amp; Records &bull; Generated: ${now}</p>
                </div>
                
                <table class="report-table">
                    <thead>
                        <tr>
                            ${visibleCols.map(c => `<th>${sanitizeValue(c.label || c.id)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                ${visibleCols.map(col => {
                                    let val = item[col.id];
                                    if (col.exportValue && typeof col.exportValue === 'function') {
                                        val = col.exportValue(item);
                                    } else if (col.formatter && typeof val !== 'undefined') {
                                        const formatted = col.formatter(val, item);
                                        val = sanitizeValue(formatted) || sanitizeValue(val);
                                    } else {
                                        val = sanitizeValue(val);
                                    }
                                    return `<td>${val}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="doc-footer">
                    Total Records Exported: ${data.length} &bull; Confidential &bull; For Authorized Public Health Personnel Only
                </div>
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/msword;charset=utf-8' });
    const finalName = filename.endsWith('.docx') || filename.endsWith('.doc') ? filename : `${filename}.docx`;
    downloadBlob(blob, finalName);
};

/**
 * 4. PDF EXPORT (.pdf)
 * Opens an ultra-clean, professional printable window with auto-print
 * Perfectly formatted for vector-quality Save to PDF
 */
export const exportToPdf = ({
    title = 'Records Report',
    columns = [],
    data = [],
    metadata = {}
}) => {
    const visibleCols = columns.filter(c => c.id !== 'actions' && c.id !== '__selection');
    const now = new Date().toLocaleString();
    const safeTitle = sanitizeValue(title || 'CCETS Data Report');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to generate and download the PDF report.');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${safeTitle} - CCETS PDF Report</title>
            <style>
                @page {
                    size: A4 landscape;
                    margin: 12mm 10mm 15mm 10mm;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    margin: 0;
                    padding: 10px;
                    color: #0f172a;
                    background: #fff;
                    font-size: 11px;
                }
                .pdf-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #1e3a8a;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                }
                .pdf-title-group h1 {
                    margin: 0 0 4px 0;
                    font-size: 20px;
                    color: #1e3a8a;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }
                .pdf-title-group p {
                    margin: 0;
                    font-size: 11px;
                    color: #64748b;
                }
                .pdf-meta {
                    text-align: right;
                    font-size: 10px;
                    color: #475569;
                }
                .meta-badge {
                    display: inline-block;
                    background: #e0e7ff;
                    color: #3730a3;
                    font-weight: 600;
                    padding: 2px 8px;
                    border-radius: 4px;
                    margin-bottom: 4px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th {
                    background-color: #1e3a8a;
                    color: #ffffff;
                    text-align: left;
                    font-weight: 600;
                    padding: 8px 10px;
                    font-size: 11px;
                    border: 1px solid #1e3a8a;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                td {
                    border: 1px solid #e2e8f0;
                    padding: 6px 10px;
                    font-size: 10.5px;
                    vertical-align: middle;
                }
                tr:nth-child(even) td {
                    background-color: #f8fafc;
                }
                .pdf-footer {
                    margin-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 10px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 9.5px;
                    color: #94a3b8;
                }
                @media print {
                    .no-print { display: none; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                }
                .print-actions {
                    margin-bottom: 16px;
                    padding: 10px;
                    background: #f1f5f9;
                    border-radius: 8px;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .btn-print {
                    background: #1e3a8a;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="no-print print-actions">
                <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
                <span style="font-size: 12px; color: #475569;">Tip: Select <strong>"Save as PDF"</strong> in the destination menu.</span>
            </div>

            <div class="pdf-header">
                <div class="pdf-title-group">
                    <h1>${safeTitle}</h1>
                    <p>Cold Chain Equipment Ticketing System (CCETS) &bull; Ministry of Health</p>
                </div>
                <div class="pdf-meta">
                    <div class="meta-badge">OFFICIAL INVENTORY</div>
                    <div>Generated: ${now}</div>
                    <div>Total Records: <strong>${data.length}</strong></div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        ${visibleCols.map(c => `<th>${sanitizeValue(c.label || c.id)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            ${visibleCols.map(col => {
                                let val = item[col.id];
                                if (col.exportValue && typeof col.exportValue === 'function') {
                                    val = col.exportValue(item);
                                } else if (col.formatter && typeof val !== 'undefined') {
                                    const formatted = col.formatter(val, item);
                                    val = sanitizeValue(formatted) || sanitizeValue(val);
                                } else {
                                    val = sanitizeValue(val);
                                }
                                return `<td>${val}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="pdf-footer">
                <div>CCETS Multi-Tenant Platform &bull; Security Classification: RESTRICTED</div>
                <div>Page 1 &bull; End of Report</div>
            </div>

            <script>
                // Auto trigger print after document renders
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 400);
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};
