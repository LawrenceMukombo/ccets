import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TableLoadingState, TableEmptyState, TableNoResultsState, TableErrorState } from './TableStates';
import { exportToCsv, exportToExcel, exportToDocx, exportToPdf } from '../../utils/exportUtils';
import './EnterpriseDataTable.css';

/**
 * EnterpriseDataTable
 * Reusable enterprise-grade table standard for CCETS
 */
const EnterpriseDataTable = ({
    columns = [],
    data = [],
    loading = false,
    error = null,
    
    // Pagination (Server-side or Client-side)
    serverSide = false,
    pagination = null, // { page, pageSize, totalRecords, totalPages, onPageChange, onPageSizeChange }
    
    // Filtering & Sorting
    filters = null, // { values, options, onChange, onClear }
    sort = null, // { sortBy, sortDirection, onSort }
    searchPlaceholder = 'Search records...',
    searchValue = '',
    onSearchChange = null,
    
    // Selection & Bulk Actions
    selectable = false,
    selectedIds = new Set(),
    onSelectChange = null, // (newSelectedIds) => {}
    bulkActions = [], // [{ label, icon, action, destructive }]
    
    // Row Interaction & Actions
    onRowClick = null,
    rowActions = [], // [{ label, icon, action, disabled, destructive }]
    rowActionKey = 'id', // field to pass to row action
    
    // Localisation / Local settings
    tableName = 'table',
    densityDefault = 'standard', // 'comfortable', 'standard', 'compact'
    
    // Extra elements
    toolbarActions = null, // Custom elements in toolbar
    emptyMessage = 'No records found.',
    emptyTitle = 'No data',
    onEmptyAction = null,
    emptyActionLabel = null,

    // Enterprise Actions: Add, Import, Export
    onAdd = null,
    addLabel = '+ Add New',
    onImport = null,
    importLabel = '📥 Import',
    onExport = null,
    exportTitle = null
}) => {
    // Local Table State
    const [density, setDensity] = useState(() => {
        return localStorage.getItem(`ccets_table_density_${tableName}`) || densityDefault;
    });
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        columns.forEach(col => {
            initial[col.id] = col.defaultVisible !== false;
        });
        return initial;
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [showDensityMenu, setShowDensityMenu] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [localSearch, setLocalSearch] = useState(searchValue);
    
    // References
    const columnMenuRef = useRef(null);
    const densityMenuRef = useRef(null);
    const exportMenuRef = useRef(null);

    // Persist density choice
    const handleDensityChange = (newDensity) => {
        setDensity(newDensity);
        localStorage.setItem(`ccets_table_density_${tableName}`, newDensity);
        setShowDensityMenu(false);
    };

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
                setShowColumnMenu(false);
            }
            if (densityMenuRef.current && !densityMenuRef.current.contains(event.target)) {
                setShowDensityMenu(false);
            }
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // Sync search input with parent value if controlled
    useEffect(() => {
        setLocalSearch(searchValue);
    }, [searchValue]);

    // Debounced search logic (300ms)
    useEffect(() => {
        if (!onSearchChange) return;
        const timer = setTimeout(() => {
            if (localSearch !== searchValue) {
                onSearchChange(localSearch);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearch, onSearchChange, searchValue]);

    // Bulk selection handlers
    const handleSelectAll = (e) => {
        if (!onSelectChange) return;
        if (e.target.checked) {
            const allIds = new Set(data.map(item => item[rowActionKey]));
            onSelectChange(allIds);
        } else {
            onSelectChange(new Set());
        }
    };

    const handleSelectOne = (e, id) => {
        e.stopPropagation();
        if (!onSelectChange) return;
        const next = new Set(selectedIds);
        if (e.target.checked) {
            next.add(id);
        } else {
            next.delete(id);
        }
        onSelectChange(next);
    };

    // Column sorting handler
    const handleSort = (colId) => {
        const col = columns.find(c => c.id === colId);
        if (!col || !col.sortable || !sort) return;
        
        let direction = 'asc';
        if (sort.sortBy === colId) {
            direction = sort.sortDirection === 'asc' ? 'desc' : 'asc';
        }
        sort.onSort(colId, direction);
    };

    const [activeRowDropdown, setActiveRowDropdown] = useState(null);

    const toggleRowDropdown = (e, rowId) => {
        e.stopPropagation();
        setActiveRowDropdown(prev => prev === rowId ? null : rowId);
    };

    useEffect(() => {
        const closeRowDropdown = (event) => {
            if (!event.target.closest('.row-action-dropdown-container') && !event.target.closest('.mobile-row-actions')) {
                setActiveRowDropdown(null);
            }
        };
        document.addEventListener('mousedown', closeRowDropdown);
        return () => document.removeEventListener('mousedown', closeRowDropdown);
    }, []);

    // Filter Column Definition List
    const displayColumns = useMemo(() => {
        return columns.filter(col => visibleColumns[col.id]);
    }, [columns, visibleColumns]);

    // Handle Export execution
    const handleExportFormat = (format) => {
        setShowExportMenu(false);
        if (onExport) {
            onExport(format);
            return;
        }

        const exportData = selectedIds.size > 0 
            ? data.filter(item => selectedIds.has(item[rowActionKey]))
            : data;

        const title = exportTitle || `${tableName.replace(/_/g, ' ').toUpperCase()} Report`;
        const baseFilename = `${tableName}_export_${new Date().toISOString().slice(0, 10)}`;

        if (format === 'csv') {
            exportToCsv({ filename: `${baseFilename}.csv`, columns: displayColumns, data: exportData });
        } else if (format === 'xlsx') {
            exportToExcel({ filename: `${baseFilename}.xlsx`, title, columns: displayColumns, data: exportData });
        } else if (format === 'docx') {
            exportToDocx({ filename: `${baseFilename}.docx`, title, columns: displayColumns, data: exportData });
        } else if (format === 'pdf') {
            exportToPdf({ title, columns: displayColumns, data: exportData });
        }
    };


    // Pagination helper properties
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 25;
    const totalRecords = pagination?.totalRecords || data.length;
    const totalPages = pagination?.totalPages || Math.ceil(totalRecords / pageSize);
    const startRecord = totalRecords > 0 ? (page - 1) * pageSize + 1 : 0;
    const endRecord = Math.min(page * pageSize, totalRecords);

    // Active Filter Chip Construction
    const filterChips = useMemo(() => {
        if (!filters || !filters.values) return [];
        return Object.entries(filters.values)
            .filter(([key, val]) => val && val !== 'all' && val !== '')
            .map(([key, val]) => {
                // Find column label if matching
                const col = columns.find(c => c.id === key);
                const label = col ? col.label : key.charAt(0).toUpperCase() + key.slice(1);
                return { key, label, value: val };
            });
    }, [filters, columns]);

    if (error) {
        return <TableErrorState title="Failed to load database records" message={error} onRetry={filters?.onClear} />;
    }

    return (
        <div className={`enterprise-table-card density-${density}`}>
            {/* 1. TOP TOOLBAR */}
            <div className="table-toolbar">
                <div className="toolbar-left">
                    <div className="table-search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                        />
                        {localSearch && (
                            <button className="clear-search-btn" onClick={() => setLocalSearch('')}>×</button>
                        )}
                    </div>
                    {toolbarActions}
                </div>

                <div className="toolbar-right">
                    {/* Columns Selector Dropdown */}
                    <div className="menu-container" ref={columnMenuRef}>
                        <button 
                            className={`toolbar-btn ${showColumnMenu ? 'active' : ''}`}
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                        >
                            📊 Columns
                        </button>
                        {showColumnMenu && (
                            <div className="toolbar-dropdown column-dropdown">
                                <h4>Show/Hide Columns</h4>
                                <div className="dropdown-divider"></div>
                                {columns.map(col => {
                                    if (col.hideable === false) return null;
                                    return (
                                        <label key={col.id} className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns[col.id]}
                                                onChange={(e) => setVisibleColumns(prev => ({
                                                    ...prev,
                                                    [col.id]: e.target.checked
                                                }))}
                                            />
                                            {col.label}
                                        </label>
                                    );
                                })}
                                <div className="dropdown-divider"></div>
                                <button 
                                    className="dropdown-action-btn"
                                    onClick={() => {
                                        const reset = {};
                                        columns.forEach(c => { reset[c.id] = c.defaultVisible !== false; });
                                        setVisibleColumns(reset);
                                        setShowColumnMenu(false);
                                    }}
                                >
                                    Reset to Defaults
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Density Selector */}
                    <div className="menu-container" ref={densityMenuRef}>
                        <button 
                            className={`toolbar-btn ${showDensityMenu ? 'active' : ''}`}
                            onClick={() => setShowDensityMenu(!showDensityMenu)}
                        >
                            📏 Density
                        </button>
                        {showDensityMenu && (
                            <div className="toolbar-dropdown density-dropdown">
                                <button 
                                    className={density === 'comfortable' ? 'active' : ''}
                                    onClick={() => handleDensityChange('comfortable')}
                                >
                                    Comfortable (Spacious)
                                </button>
                                <button 
                                    className={density === 'standard' ? 'active' : ''}
                                    onClick={() => handleDensityChange('standard')}
                                >
                                    Standard
                                </button>
                                <button 
                                    className={density === 'compact' ? 'active' : ''}
                                    onClick={() => handleDensityChange('compact')}
                                >
                                    Compact
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Export Menu Dropdown */}
                    <div className="menu-container" ref={exportMenuRef}>
                        <button 
                            className={`toolbar-btn ${showExportMenu ? 'active' : ''}`}
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            title="Export data in multiple formats"
                        >
                            📥 Export ▾
                        </button>
                        {showExportMenu && (
                            <div className="toolbar-dropdown export-dropdown" style={{ minWidth: '190px' }}>
                                <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Export Format {selectedIds.size > 0 ? `(${selectedIds.size} selected)` : `(${data.length})`}
                                </div>
                                <div className="dropdown-divider"></div>
                                <button onClick={() => handleExportFormat('csv')}>
                                    📄 CSV Spreadsheet (.csv)
                                </button>
                                <button onClick={() => handleExportFormat('xlsx')}>
                                    📊 Microsoft Excel (.xlsx)
                                </button>
                                <button onClick={() => handleExportFormat('docx')}>
                                    📝 Microsoft Word (.docx)
                                </button>
                                <button onClick={() => handleExportFormat('pdf')}>
                                    📑 PDF Document (.pdf)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Optional Import Trigger */}
                    {onImport && (
                        <button 
                            className="toolbar-btn"
                            onClick={onImport}
                            style={{ background: '#f8fafc', color: '#1e293b', fontWeight: '600' }}
                            title="Import data from CSV or spreadsheet"
                        >
                            {importLabel}
                        </button>
                    )}

                    {/* Optional Add Trigger */}
                    {onAdd && (
                        <button 
                            className="toolbar-btn"
                            onClick={onAdd}
                            style={{ background: '#1e3a8a', color: '#ffffff', fontWeight: '600', borderColor: '#1e3a8a' }}
                            title="Add new record"
                        >
                            {addLabel}
                        </button>
                    )}
                </div>
            </div>

            {/* 2. ACTIVE FILTER CHIPS */}
            {filterChips.length > 0 && (
                <div className="table-filter-chips">
                    <span className="chips-label">Active Filters:</span>
                    {filterChips.map(chip => (
                        <span key={chip.key} className="filter-chip">
                            <strong>{chip.label}:</strong> {chip.value}
                            <button 
                                className="remove-chip"
                                onClick={() => filters.onChange(chip.key, 'all')}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <button className="clear-all-chips" onClick={filters.onClear}>
                        Clear All
                    </button>
                </div>
            )}

            {/* 3. BULK ACTIONS ACTION BAR */}
            {selectable && selectedIds.size > 0 && (
                <div className="bulk-action-bar">
                    <span className="selection-count">
                        🔔 <strong>{selectedIds.size}</strong> row{selectedIds.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="bulk-actions-buttons">
                        {bulkActions.map((action, i) => (
                            <button
                                key={i}
                                className={`bulk-action-btn ${action.destructive ? 'destructive' : ''}`}
                                onClick={() => action.action(selectedIds)}
                            >
                                {action.icon} {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. TABLE CONTENT GRID */}
            <div className="enterprise-table-wrapper">
                {loading ? (
                    <TableLoadingState columnsCount={displayColumns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)} />
                ) : data.length === 0 ? (
                    localSearch || filterChips.length > 0 ? (
                        <TableNoResultsState onClear={filters?.onClear} />
                    ) : (
                        <TableEmptyState title={emptyTitle} message={emptyMessage} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
                    )
                ) : (
                    <>
                        {/* Standard Desktop Table */}
                        <table className="enterprise-data-table">
                            <thead>
                                <tr>
                                    {selectable && (
                                        <th style={{ width: '40px' }} className="checkbox-column">
                                            <input
                                                type="checkbox"
                                                checked={data.length > 0 && selectedIds.size === data.length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                    )}
                                    {displayColumns.map(col => (
                                        <th
                                            key={col.id}
                                            onClick={() => handleSort(col.id)}
                                            className={`${col.sortable ? 'sortable' : ''} ${sort?.sortBy === col.id ? 'active-sort' : ''}`}
                                        >
                                            <div className="header-cell-content">
                                                {col.label}
                                                {col.sortable && sort?.sortBy === col.id && (
                                                    <span className="sort-direction-indicator">
                                                        {sort.sortDirection === 'asc' ? ' ↑' : ' ↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    {rowActions.length > 0 && <th style={{ width: '60px' }} className="actions-column">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, rowIndex) => {
                                    const rowId = item[rowActionKey];
                                    const isSelected = selectedIds.has(rowId);
                                    
                                    return (
                                        <tr
                                            key={rowId || rowIndex}
                                            onClick={() => onRowClick && onRowClick(item)}
                                            className={`${isSelected ? 'selected-row' : ''} ${onRowClick ? 'clickable-row' : ''}`}
                                        >
                                            {selectable && (
                                                <td className="checkbox-column" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => handleSelectOne(e, rowId)}
                                                    />
                                                </td>
                                            )}
                                            {displayColumns.map(col => {
                                                const rawVal = item[col.id];
                                                const formatted = col.formatter ? col.formatter(rawVal, item) : (rawVal !== null && rawVal !== undefined ? String(rawVal) : '-');
                                                
                                                return (
                                                    <td key={col.id} data-column-label={col.label}>
                                                        {formatted}
                                                    </td>
                                                );
                                            })}
                                            {rowActions.length > 0 && (
                                                <td className="actions-column" onClick={(e) => e.stopPropagation()}>
                                                    <div className="row-action-dropdown-container">
                                                        <button 
                                                            className="row-action-trigger"
                                                            onClick={(e) => toggleRowDropdown(e, rowId)}
                                                        >
                                                            ⋮
                                                        </button>
                                                        {activeRowDropdown === rowId && (
                                                            <div className="row-action-menu">
                                                                {rowActions.map((act, index) => {
                                                                    const isDisabled = typeof act.disabled === 'function' ? act.disabled(item) : act.disabled;
                                                                    return (
                                                                        <button
                                                                            key={index}
                                                                            className={`row-action-item ${act.destructive ? 'destructive' : ''}`}
                                                                            disabled={isDisabled}
                                                                            onClick={() => {
                                                                                act.action(item);
                                                                                setActiveRowDropdown(null);
                                                                            }}
                                                                        >
                                                                            {act.icon && <span className="action-icon">{act.icon}</span>}
                                                                            {act.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Mobile Responsive Expandable/Card Fallback */}
                        <div className="enterprise-mobile-card-list">
                            {data.map((item, rowIndex) => {
                                const rowId = item[rowActionKey];
                                const isSelected = selectedIds.has(rowId);
                                
                                return (
                                    <div 
                                        key={rowId || rowIndex} 
                                        className={`mobile-row-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => onRowClick && onRowClick(item)}
                                    >
                                        <div className="mobile-card-header">
                                            {selectable && (
                                                <div className="mobile-checkbox" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => handleSelectOne(e, rowId)}
                                                    />
                                                </div>
                                            )}
                                            
                                            {/* Render first primary column as title */}
                                            <div className="mobile-primary-title">
                                                <strong>{String(item[columns[0]?.id] || '-')}</strong>
                                            </div>

                                            {rowActions.length > 0 && (
                                                <div className="mobile-row-actions" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        className="row-action-trigger"
                                                        onClick={(e) => toggleRowDropdown(e, rowId)}
                                                    >
                                                        ⋮
                                                    </button>
                                                    {activeRowDropdown === rowId && (
                                                        <div className="row-action-menu mobile">
                                                            {rowActions.map((act, index) => (
                                                                <button
                                                                    key={index}
                                                                    className={`row-action-item ${act.destructive ? 'destructive' : ''}`}
                                                                    disabled={typeof act.disabled === 'function' ? act.disabled(item) : act.disabled}
                                                                    onClick={() => {
                                                                        act.action(item);
                                                                        setActiveRowDropdown(null);
                                                                    }}
                                                                >
                                                                    {act.icon} {act.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mobile-card-body">
                                            {columns.slice(1).map(col => {
                                                if (!visibleColumns[col.id]) return null;
                                                const rawVal = item[col.id];
                                                const formatted = col.formatter ? col.formatter(rawVal, item) : (rawVal !== null && rawVal !== undefined ? String(rawVal) : '-');
                                                
                                                return (
                                                    <div key={col.id} className="mobile-field-row">
                                                        <span className="mobile-field-label">{col.label}:</span>
                                                        <span className="mobile-field-value">{formatted}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* 5. PAGINATION FOOTER */}
            {!loading && data.length > 0 && pagination && (
                <div className="table-pagination-footer">
                    <div className="pagination-left">
                        <span className="pagination-text">
                            Showing <strong>{startRecord}</strong>–<strong>{endRecord}</strong> of <strong>{totalRecords}</strong> records
                        </span>
                        <div className="page-size-selector-container">
                            <span className="page-size-label">Rows per page:</span>
                            <select
                                className="page-size-select"
                                value={pageSize}
                                onChange={(e) => pagination.onPageSizeChange(parseInt(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    <div className="pagination-right">
                        <button
                            className="pagination-btn first-page"
                            disabled={page === 1}
                            onClick={() => pagination.onPageChange(1)}
                            title="First Page"
                        >
                            «
                        </button>
                        <button
                            className="pagination-btn prev-page"
                            disabled={page === 1}
                            onClick={() => pagination.onPageChange(page - 1)}
                            title="Previous Page"
                        >
                            ‹
                        </button>
                        
                        <div className="page-numbers">
                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                // Dynamic sliding page number window
                                let targetPage = page;
                                if (page <= 3) {
                                    targetPage = i + 1;
                                } else if (page >= totalPages - 2) {
                                    targetPage = totalPages - 4 + i;
                                } else {
                                    targetPage = page - 2 + i;
                                }
                                
                                if (targetPage < 1 || targetPage > totalPages) return null;
                                
                                return (
                                    <button
                                        key={targetPage}
                                        className={`page-num-btn ${page === targetPage ? 'active' : ''}`}
                                        onClick={() => pagination.onPageChange(targetPage)}
                                    >
                                        {targetPage}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            className="pagination-btn next-page"
                            disabled={page === totalPages}
                            onClick={() => pagination.onPageChange(page + 1)}
                            title="Next Page"
                        >
                            ›
                        </button>
                        <button
                            className="pagination-btn last-page"
                            disabled={page === totalPages}
                            onClick={() => pagination.onPageChange(totalPages)}
                            title="Last Page"
                        >
                            »
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnterpriseDataTable;
