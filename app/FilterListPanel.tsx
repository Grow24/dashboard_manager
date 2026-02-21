import React from 'react';
import { Filter, FilterStatus } from '../../types/filter.types';
import './FilterListPanel.css';

interface FilterListPanelProps {
  filters: Filter[];
  isLoading: boolean;
  searchQuery: string;
  filterStatus: FilterStatus | 'all';
  sortBy: 'name' | 'created_at' | 'updated_at';
  currentPage: number;
  totalPages: number;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: FilterStatus | 'all') => void;
  onSortChange: (sort: 'name' | 'created_at' | 'updated_at') => void;
  onPageChange: (page: number) => void;
  onNewFilter: () => void;
  onSelectFilter: (filterId: string) => void;
  onRefresh: () => void;
}

const FilterListPanel: React.FC<FilterListPanelProps> = ({
  filters,
  isLoading,
  searchQuery,
  filterStatus,
  sortBy,
  currentPage,
  totalPages,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onPageChange,
  onNewFilter,
  onSelectFilter,
  onRefresh,
}) => {
  return (
    <div className="filter-list-panel">
      <div className="filter-list-header">
        <h2>Filter Manager</h2>
        <button className="btn-primary" onClick={onNewFilter}>
          + New Filter
        </button>
      </div>

      <div className="filter-list-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search filters..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <select
          className="status-select"
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value as FilterStatus | 'all')}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="deprecated">Deprecated</option>
        </select>

        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
        >
          <option value="updated_at">Last Updated</option>
          <option value="created_at">Date Created</option>
          <option value="name">Name</option>
        </select>

        <button className="btn-secondary" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <>
          <div className="filter-list">
            {filters.length === 0 ? (
              <div className="empty-state">No filters found</div>
            ) : (
              filters.map((filter) => (
                <div
                  key={filter.id}
                  className="filter-list-item"
                  onClick={() => filter.id && onSelectFilter(filter.id)}
                >
                  <div className="filter-item-header">
                    <h3>{filter.name}</h3>
                    <span className={`status-badge status-${filter.status}`}>
                      {filter.status}
                    </span>
                  </div>
                  <p className="filter-item-description">{filter.description}</p>
                  <div className="filter-item-meta">
                    <span>Type: {filter.type}</span>
                    <span>Version: {filter.version}</span>
                    <span>Instances: {filter.instances?.length || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FilterListPanel;