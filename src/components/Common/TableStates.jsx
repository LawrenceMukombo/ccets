import React from 'react';

export const TableLoadingState = ({ columnsCount = 5, rowsCount = 5 }) => {
    return (
        <div className="table-loading-container">
            <table className="enterprise-skeleton-table">
                <thead>
                    <tr>
                        {Array.from({ length: columnsCount }).map((_, i) => (
                            <th key={i}><div className="skeleton-bar header-skeleton"></div></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rowsCount }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: columnsCount }).map((_, colIndex) => (
                                <td key={colIndex}>
                                    <div className={`skeleton-bar cell-skeleton ${colIndex === 0 ? 'cell-primary' : ''}`}></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const TableEmptyState = ({ title = 'No data available', message = 'There are no records to display.', actionLabel, onAction }) => {
    return (
        <div className="table-state-panel empty-state-panel">
            <div className="state-icon">📂</div>
            <h3>{title}</h3>
            <p>{message}</p>
            {actionLabel && onAction && (
                <button className="state-action-btn" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export const TableNoResultsState = ({ title = 'No matches found', message = 'Try adjusting your search terms or active filters.', onClear }) => {
    return (
        <div className="table-state-panel no-results-panel">
            <div className="state-icon">🔍</div>
            <h3>{title}</h3>
            <p>{message}</p>
            {onClear && (
                <button className="state-action-btn secondary" onClick={onClear}>
                    Clear Active Filters
                </button>
            )}
        </div>
    );
};

export const TableErrorState = ({ title = 'Failed to load data', message = 'An error occurred while retrieving table records.', onRetry }) => {
    return (
        <div className="table-state-panel error-state-panel">
            <div className="state-icon">⚠️</div>
            <h3>{title}</h3>
            <p>{message}</p>
            {onRetry && (
                <button className="state-action-btn danger" onClick={onRetry}>
                    🔄 Retry Loading
                </button>
            )}
        </div>
    );
};
