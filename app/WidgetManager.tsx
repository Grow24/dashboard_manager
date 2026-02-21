import React, { useState } from 'react';
import { WidthProvider, Responsive } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget-related interfaces
export interface Widget {
  id: string;
  dashboard_id: string;
  title: string;
  visual_type: VisualType;
  chart_type?: ChartType;
  data_source_id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  data?: any;
  config?: Record<string, any>;
}

export type VisualType = 'kpi' | 'chart' | 'table';
export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

// Normalization interfaces
export interface NormalizedKPI {
  value: number;
  label: string;
  trend?: number;
  unit?: string;
}

export interface NormalizedChart {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface NormalizedTable {
  columns: string[];
  rows: any[][];
}

export interface NormalizedResponse {
  kpi?: NormalizedKPI;
  chart?: NormalizedChart;
  table?: NormalizedTable;
}

// Utility functions
export const normalizeApiResponse = (response: any, visualType: VisualType): NormalizedResponse => {
  switch (visualType) {
    case 'kpi':
      return {
        kpi: {
          value: response.value || 0,
          label: response.label || '',
          trend: response.trend,
          unit: response.unit
        }
      };
    case 'chart':
      return {
        chart: {
          labels: response.labels || [],
          datasets: response.datasets || []
        }
      };
    case 'table':
      return {
        table: {
          columns: response.columns || [],
          rows: response.rows || []
        }
      };
    default:
      return {};
  }
};

// Components
export const KPIView: React.FC<{ data?: NormalizedKPI }> = ({ data }) => {
  if (!data) return <div>No data</div>;
  
  return (
    <div className="kpi-container">
      <div className="kpi-value">{data.value}{data.unit && <span className="kpi-unit">{data.unit}</span>}</div>
      <div className="kpi-label">{data.label}</div>
      {data.trend !== undefined && (
        <div className={`kpi-trend ${data.trend >= 0 ? 'positive' : 'negative'}`}>
          {data.trend >= 0 ? '↑' : '↓'} {Math.abs(data.trend)}%
        </div>
      )}
    </div>
  );
};

export const WidgetComponent: React.FC<{ 
  widget: Widget; 
  onDelete: (id: string) => void;
  onEdit: (widget: Widget) => void;
}> = ({ widget, onDelete, onEdit }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch widget data when component mounts or widget changes
  React.useEffect(() => {
    const fetchData = async () => {
      if (!widget.data_source_id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // In a real app, this would fetch from your data source
        // For now, we'll simulate with mock data
        const mockData = {
          kpi: {
            value: Math.floor(Math.random() * 1000),
            label: widget.title,
            trend: Math.floor(Math.random() * 20) - 10,
            unit: '$'
          },
          chart: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [
              {
                label: widget.title,
                data: Array(5).fill(0).map(() => Math.floor(Math.random() * 100))
              }
            ]
          },
          table: {
            columns: ['Name', 'Value', 'Status'],
            rows: [
              ['Item 1', Math.floor(Math.random() * 100), 'Active'],
              ['Item 2', Math.floor(Math.random() * 100), 'Pending']
            ]
          }
        };

        const normalized = normalizeApiResponse(mockData[widget.visual_type], widget.visual_type);
        setData(normalized);
      } catch (err) {
        setError('Failed to load widget data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [widget]);

  const handleDelete = () => {
    onDelete(widget.id);
  };

  const handleEdit = () => {
    onEdit(widget);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="widget-content">
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <div className="widget-actions">
          <button onClick={handleEdit} className="edit-btn">Edit</button>
          <button onClick={handleDelete} className="delete-btn">Delete</button>
        </div>
      </div>
      
      <div className="widget-body">
        {widget.visual_type === 'kpi' && data?.kpi && <KPIView data={data.kpi} />}
        {widget.visual_type === 'chart' && data?.chart && (
          <div>Chart visualization would go here</div>
        )}
        {widget.visual_type === 'table' && data?.table && (
          <div>Table visualization would go here</div>
        )}
      </div>
    </div>
  );
};

export const WidgetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (widget: Omit<Widget, 'id'>) => void;
  widget?: Widget;
}> = ({ isOpen, onClose, onSubmit, widget }) => {
  const [title, setTitle] = useState(widget?.title || '');
  const [visualType, setVisualType] = useState<VisualType>(widget?.visual_type || 'kpi');
  const [chartType, setChartType] = useState<ChartType | ''>(widget?.chart_type || '');
  const [dataSourceId, setDataSourceId] = useState(widget?.data_source_id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) return;
    
    const widgetData: Omit<Widget, 'id'> = {
      dashboard_id: widget?.dashboard_id || '',
      title,
      visual_type: visualType,
      ...(visualType === 'chart' && chartType && { chart_type: chartType }),
      data_source_id: dataSourceId,
      x: widget?.x || 0,
      y: widget?.y || 0,
      w: widget?.w || 4,
      h: widget?.h || 3
    };
    
    onSubmit(widgetData);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setVisualType('kpi');
    setChartType('');
    setDataSourceId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{widget ? 'Edit Widget' : 'Create Widget'}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="visualType">Visual Type</label>
            <select
              id="visualType"
              value={visualType}
              onChange={(e) => setVisualType(e.target.value as VisualType)}
            >
              <option value="kpi">KPI</option>
              <option value="chart">Chart</option>
              <option value="table">Table</option>
            </select>
          </div>
          
          {visualType === 'chart' && (
            <div className="form-group">
              <label htmlFor="chartType">Chart Type</label>
              <select
                id="chartType"
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                required
              >
                <option value="">Select Chart Type</option>
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="pie">Pie</option>
                <option value="area">Area</option>
                <option value="scatter">Scatter</option>
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="dataSourceId">Data Source</label>
            <input
              id="dataSourceId"
              type="text"
              value={dataSourceId}
              onChange={(e) => setDataSourceId(e.target.value)}
            />
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              {widget ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};