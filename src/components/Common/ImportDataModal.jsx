import React, { useState, useRef } from 'react';
import './ImportDataModal.css';

/**
 * Universal Enterprise Import Modal for CCETS
 * Handles CSV & tabular uploads for Facilities, Equipment, and Users
 */
const ImportDataModal = ({
    isOpen,
    onClose,
    entityType = 'facilities', // 'facilities', 'equipment', 'users'
    entityTitle = 'Facilities',
    tenantCode,
    onSuccess
}) => {
    const [file, setFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [previewRows, setPreviewRows] = useState([]);
    const [previewHeaders, setPreviewHeaders] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importResult, setImportResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // Helper: Simple CSV parser for preview
    const parseCsvPreview = (text) => {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0) return { headers: [], rows: [], count: 0 };
        
        const parseLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseLine(lines[0]);
        const rows = lines.slice(1, 6).map(parseLine);
        return { headers, rows, count: lines.length - 1 };
    };

    const handleFileSelect = (selectedFile) => {
        setErrorMessage('');
        setImportResult(null);

        if (!selectedFile) return;

        // Check file extension
        const validExtensions = ['.csv', '.txt', '.xlsx', '.xls'];
        const name = selectedFile.name.toLowerCase();
        const isValid = validExtensions.some(ext => name.endsWith(ext));

        if (!isValid) {
            setErrorMessage('Unsupported file format. Please upload a .CSV or .XLSX spreadsheet.');
            return;
        }

        setFile(selectedFile);

        // Read file content for preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            setFileContent(text);
            const { headers, rows, count } = parseCsvPreview(text);
            setPreviewHeaders(headers);
            setPreviewRows(rows);
            setTotalRows(count);
        };
        reader.onerror = () => {
            setErrorMessage('Failed to read the selected file.');
        };
        reader.readAsText(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    // Download official CCETS CSV Template
    const handleDownloadTemplate = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/${tenantCode}/reference-import/template/${entityType}`, {
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });
            if (!response.ok) throw new Error('Failed to download template');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CCETS_${entityType}_template.csv`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 200);
        } catch (err) {
            setErrorMessage('Unable to download template: ' + err.message);
        }
    };

    // Execute upload to backend reference-import endpoint
    const handleUpload = async () => {
        if (!file || !fileContent) {
            setErrorMessage('Please choose a valid file to import.');
            return;
        }

        setIsUploading(true);
        setUploadProgress(40);
        setErrorMessage('');

        try {
            const token = localStorage.getItem('token');
            setUploadProgress(70);

            const response = await fetch(`/api/${tenantCode}/reference-import/${entityType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({ csv: fileContent })
            });

            const data = await response.json();
            setUploadProgress(100);

            if (!response.ok && !data.summary) {
                throw new Error(data.message || 'Upload failed');
            }

            setImportResult(data);
            if (onSuccess && (data.summary?.imported > 0 || data.summary?.skipped > 0)) {
                onSuccess();
            }
        } catch (err) {
            console.error('Import upload error:', err);
            setErrorMessage(err.message || 'Error occurred while importing data.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setFileContent('');
        setPreviewHeaders([]);
        setPreviewRows([]);
        setTotalRows(0);
        setImportResult(null);
        setErrorMessage('');
    };

    return (
        <div className="import-modal-overlay" onClick={onClose}>
            <div className="import-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="import-modal-header">
                    <div>
                        <h3>📥 Import {entityTitle}</h3>
                        <p>Upload CSV or spreadsheet data to safely register and update {entityTitle.toLowerCase()} in bulk</p>
                    </div>
                    <button className="import-modal-close" onClick={onClose}>&times;</button>
                </div>

                {/* Body */}
                <div className="import-modal-body">
                    {errorMessage && (
                        <div className="import-alert-error">
                            <span>⚠️ {errorMessage}</span>
                        </div>
                    )}

                    {!importResult ? (
                        <>
                            {/* Action Bar / Template Download */}
                            <div className="import-template-banner">
                                <div className="template-info">
                                    <strong>Need the official standard template?</strong>
                                    <span>Download the pre-formatted CSV template with required columns and example data.</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-download-template"
                                    onClick={handleDownloadTemplate}
                                >
                                    📄 Download Template
                                </button>
                            </div>

                            {/* Drop Zone */}
                            {!file ? (
                                <div
                                    className={`import-dropzone ${isDragging ? 'dragging' : ''}`}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="dropzone-icon">📁</div>
                                    <h4>Drag &amp; drop your data file here</h4>
                                    <p>or click to browse your computer (CSV, XLSX supported)</p>
                                    <div className="dropzone-badge">Max 5,000 records per upload batch</div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept=".csv,.txt,.xlsx,.xls"
                                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                    />
                                </div>
                            ) : (
                                <div className="import-file-selected">
                                    <div className="file-info-row">
                                        <div className="file-details">
                                            <span className="file-icon">📊</span>
                                            <div>
                                                <strong>{file.name}</strong>
                                                <span className="file-size">
                                                    {(file.size / 1024).toFixed(1)} KB &bull; {totalRows} records detected
                                                </span>
                                            </div>
                                        </div>
                                        <button className="btn-remove-file" onClick={handleReset}>
                                            Remove
                                        </button>
                                    </div>

                                    {/* Preview Table */}
                                    {previewRows.length > 0 && (
                                        <div className="import-preview-section">
                                            <div className="preview-header">
                                                <h5>Data Preview (First {previewRows.length} rows):</h5>
                                                <span>Upsert mode active: Duplicate identifiers will be preserved safely</span>
                                            </div>
                                            <div className="preview-table-container">
                                                <table className="preview-table">
                                                    <thead>
                                                        <tr>
                                                            {previewHeaders.map((h, i) => (
                                                                <th key={i}>{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {previewRows.map((row, rIdx) => (
                                                            <tr key={rIdx}>
                                                                {previewHeaders.map((_, cIdx) => (
                                                                    <td key={cIdx}>{row[cIdx] || '-'}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Results Screen */
                        <div className="import-results-container">
                            <div className="results-header">
                                <div className="results-badge success">✓ Import Complete</div>
                                <h4>Processing Summary</h4>
                            </div>

                            <div className="summary-cards-grid">
                                <div className="summary-card imported">
                                    <span className="summary-num">{importResult.summary?.imported || 0}</span>
                                    <span className="summary-label">Successfully Imported</span>
                                </div>
                                <div className="summary-card skipped">
                                    <span className="summary-num">{importResult.summary?.skipped || 0}</span>
                                    <span className="summary-label">Skipped (Existing)</span>
                                </div>
                                <div className="summary-card failed">
                                    <span className="summary-num">{importResult.summary?.failed || 0}</span>
                                    <span className="summary-label">Failed / Invalid</span>
                                </div>
                            </div>

                            {importResult.results && importResult.results.some(r => r.status === 'failed') && (
                                <div className="failed-rows-report">
                                    <h5>Review Errors:</h5>
                                    <div className="failed-rows-list">
                                        {importResult.results
                                            .filter(r => r.status === 'failed')
                                            .slice(0, 15)
                                            .map((r, i) => (
                                                <div key={i} className="failed-item">
                                                    <span className="row-tag">Row {r.row}:</span>
                                                    <span className="error-text">{r.message}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="import-modal-footer">
                    {!importResult ? (
                        <>
                            <button className="btn-modal-cancel" onClick={onClose} disabled={isUploading}>
                                Cancel
                            </button>
                            <button
                                className="btn-modal-primary"
                                onClick={handleUpload}
                                disabled={!file || isUploading}
                            >
                                {isUploading ? `Uploading (${uploadProgress}%)...` : `Start Import (${totalRows} Rows)`}
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn-modal-cancel" onClick={handleReset}>
                                Import Another File
                            </button>
                            <button className="btn-modal-primary" onClick={onClose}>
                                Done &amp; View Table
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportDataModal;
