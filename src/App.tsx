import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type MetricType = 'productivity' | 'health' | 'finance' | 'social' | 'learning';
type WidgetType = 'line' | 'bar' | 'pie' | 'stat' | 'progress' | 'list';
type PeriodType = 'day' | 'week' | 'month' | 'year';

interface Metric {
  id: string;
  name: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  metricType: MetricType;
  position: number;
  isVisible: boolean;
  config: Record<string, any>;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  metricType: MetricType;
  timestamp: number;
}

interface DashboardData {
  metrics: Metric[];
  widgets: Widget[];
  insights: Insight[];
}

interface ComparisonData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const isClient = typeof window !== 'undefined';

const METRIC_TYPES: { value: MetricType; label: string; color: string; icon: string }[] = [
  { value: 'productivity', label: 'Produtividade', color: '#3b82f6', icon: '⚡' },
  { value: 'health', label: 'Saúde', color: '#10b981', icon: '💪' },
  { value: 'finance', label: 'Finanças', color: '#f59e0b', icon: '💰' },
  { value: 'social', label: 'Social', color: '#ec4899', icon: '👥' },
  { value: 'learning', label: 'Aprendizado', color: '#8b5cf6', icon: '📚' },
];

const DEFAULT_WIDGETS: Widget[] = [
  {
    id: 'widget_1',
    title: 'Produtividade Semanal',
    type: 'line',
    metricType: 'productivity',
    position: 0,
    isVisible: true,
    config: { showGrid: true, showLegend: true },
  },
  {
    id: 'widget_2',
    title: 'Resumo de Saúde',
    type: 'stat',
    metricType: 'health',
    position: 1,
    isVisible: true,
    config: { showTrend: true },
  },
  {
    id: 'widget_3',
    title: 'Gastos por Categoria',
    type: 'pie',
    metricType: 'finance',
    position: 2,
    isVisible: true,
    config: { showPercentages: true },
  },
  {
    id: 'widget_4',
    title: 'Horas de Estudo',
    type: 'bar',
    metricType: 'learning',
    position: 3,
    isVisible: true,
    config: { orientation: 'vertical' },
  },
];

// Generate sample metrics for the last 30 days
const generateSampleMetrics = (): Metric[] => {
  const metrics: Metric[] = [];
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < 30; i++) {
    const timestamp = thirtyDaysAgo + i * 24 * 60 * 60 * 1000;

    // Productivity metrics
    metrics.push({
      id: `metric_prod_${i}`,
      name: 'Tarefas Concluídas',
      type: 'productivity',
      value: Math.floor(Math.random() * 15) + 5,
      unit: 'tarefas',
      timestamp,
    });

    metrics.push({
      id: `metric_focus_${i}`,
      name: 'Tempo Focado',
      type: 'productivity',
      value: Math.floor(Math.random() * 6) + 2,
      unit: 'horas',
      timestamp,
    });

    // Health metrics
    metrics.push({
      id: `metric_steps_${i}`,
      name: 'Passos',
      type: 'health',
      value: Math.floor(Math.random() * 5000) + 5000,
      unit: 'passos',
      timestamp,
    });

    metrics.push({
      id: `metric_sleep_${i}`,
      name: 'Horas de Sono',
      type: 'health',
      value: Math.floor(Math.random() * 3) + 6,
      unit: 'horas',
      timestamp,
    });

    // Finance metrics
    metrics.push({
      id: `metric_expenses_${i}`,
      name: 'Despesas',
      type: 'finance',
      value: Math.floor(Math.random() * 200) + 50,
      unit: 'R$',
      timestamp,
    });

    // Social metrics
    metrics.push({
      id: `metric_interactions_${i}`,
      name: 'Interações Sociais',
      type: 'social',
      value: Math.floor(Math.random() * 10) + 1,
      unit: 'interações',
      timestamp,
    });

    // Learning metrics
    metrics.push({
      id: `metric_study_${i}`,
      name: 'Horas de Estudo',
      type: 'learning',
      value: Math.floor(Math.random() * 4) + 1,
      unit: 'horas',
      timestamp,
    });
  }

  return metrics;
};

// ============================================================================
// STORAGE SERVICE
// ============================================================================

class StorageService {
  private static readonly STORAGE_KEYS = Object.freeze({
    DARK_MODE: 'analytics_darkMode',
    DASHBOARD_DATA: 'analytics_dashboardData',
  });

  static saveToStorage(key: string, value: any): void {
    if (!isClient) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to storage:`, error);
    }
  }

  static loadFromStorage<T>(key: string, defaultValue: T): T {
    if (!isClient) return defaultValue;
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from storage:`, error);
      return defaultValue;
    }
  }

  static clearStorage(): void {
    if (!isClient) return;
    try {
      sessionStorage.removeItem(this.STORAGE_KEYS.DARK_MODE);
      sessionStorage.removeItem(this.STORAGE_KEYS.DASHBOARD_DATA);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  static getKeys() {
    return this.STORAGE_KEYS;
  }
}

// ============================================================================
// MODEL LAYER
// ============================================================================

/**
 * Analytics Model - Handles data structure and business logic
 */
class AnalyticsModel {
  private metrics: Metric[];
  private widgets: Widget[];
  private insights: Insight[];

  constructor(initialData?: DashboardData) {
    this.metrics = initialData?.metrics || generateSampleMetrics();
    this.widgets = initialData?.widgets || [...DEFAULT_WIDGETS];
    this.insights = initialData?.insights || this.generateInsights();
  }

  // ==================== METRIC OPERATIONS ====================

  getAllMetrics(): Metric[] {
    return [...this.metrics];
  }

  getMetricsByType(type: MetricType): Metric[] {
    return this.metrics.filter(m => m.type === type);
  }

  getMetricsByPeriod(startDate: number, endDate: number): Metric[] {
    return this.metrics.filter(m => m.timestamp >= startDate && m.timestamp <= endDate);
  }

  addMetric(metric: Omit<Metric, 'id' | 'timestamp'>): Metric {
    const newMetric: Metric = {
      ...metric,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    this.metrics.push(newMetric);
    this.insights = this.generateInsights();
    return newMetric;
  }

  deleteMetric(id: string): boolean {
    const initialLength = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.id !== id);
    return this.metrics.length < initialLength;
  }

  /**
   * Aggregate metrics by period
   */
  aggregateMetrics(type: MetricType, period: PeriodType, metricName?: string): Record<string, number> {
    const filtered = metricName
      ? this.metrics.filter(m => m.type === type && m.name === metricName)
      : this.metrics.filter(m => m.type === type);

    const aggregated: Record<string, number> = {};

    filtered.forEach(metric => {
      const date = new Date(metric.timestamp);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
      }

      aggregated[key] = (aggregated[key] || 0) + metric.value;
    });

    return aggregated;
  }

  /**
   * Compare two periods
   */
  comparePeriods(type: MetricType, currentStart: number, currentEnd: number, previousStart: number, previousEnd: number): ComparisonData {
    const currentMetrics = this.getMetricsByPeriod(currentStart, currentEnd).filter(m => m.type === type);
    const previousMetrics = this.getMetricsByPeriod(previousStart, previousEnd).filter(m => m.type === type);

    const current = currentMetrics.reduce((sum, m) => sum + m.value, 0);
    const previous = previousMetrics.reduce((sum, m) => sum + m.value, 0);
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

    return { current, previous, change, changePercent };
  }

  /**
   * Get statistics for a metric type
   */
  getStatistics(type: MetricType, days: number = 7): {
    total: number;
    average: number;
    max: number;
    min: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = this.metrics.filter(m => m.type === type && m.timestamp >= cutoff);

    if (filtered.length === 0) {
      return { total: 0, average: 0, max: 0, min: 0, trend: 'stable' };
    }

    const values = filtered.map(m => m.value);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // Calculate trend
    const half = Math.floor(filtered.length / 2);
    const firstHalf = filtered.slice(0, half).reduce((sum, m) => sum + m.value, 0) / half;
    const secondHalf = filtered.slice(half).reduce((sum, m) => sum + m.value, 0) / (filtered.length - half);
    const trend = secondHalf > firstHalf * 1.05 ? 'up' : secondHalf < firstHalf * 0.95 ? 'down' : 'stable';

    return { total, average, max, min, trend };
  }

  // ==================== WIDGET OPERATIONS ====================

  getAllWidgets(): Widget[] {
    return [...this.widgets].sort((a, b) => a.position - b.position);
  }

  getVisibleWidgets(): Widget[] {
    return this.getAllWidgets().filter(w => w.isVisible);
  }

  addWidget(widget: Omit<Widget, 'id' | 'position'>): Widget {
    const newWidget: Widget = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: this.widgets.length,
    };
    this.widgets.push(newWidget);
    return newWidget;
  }

  updateWidget(id: string, updates: Partial<Widget>): Widget | null {
    const index = this.widgets.findIndex(w => w.id === id);
    if (index === -1) return null;

    this.widgets[index] = { ...this.widgets[index], ...updates };
    return this.widgets[index];
  }

  deleteWidget(id: string): boolean {
    const initialLength = this.widgets.length;
    this.widgets = this.widgets.filter(w => w.id !== id);
    return this.widgets.length < initialLength;
  }

  toggleWidgetVisibility(id: string): boolean {
    const widget = this.widgets.find(w => w.id === id);
    if (!widget) return false;
    widget.isVisible = !widget.isVisible;
    return widget.isVisible;
  }

  // ==================== INSIGHTS ====================

  getInsights(): Insight[] {
    return [...this.insights].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate automatic insights based on metrics
   */
  generateInsights(): Insight[] {
    const insights: Insight[] = [];
    const now = Date.now();

    METRIC_TYPES.forEach(({ value: metricType }) => {
      const stats = this.getStatistics(metricType, 7);

      if (stats.trend === 'up') {
        insights.push({
          id: `insight_${metricType}_up_${now}`,
          title: `${METRIC_TYPES.find(t => t.value === metricType)?.label} em Alta`,
          description: `Suas métricas de ${METRIC_TYPES.find(t => t.value === metricType)?.label.toLowerCase()} aumentaram nos últimos 7 dias!`,
          type: 'positive',
          metricType,
          timestamp: now,
        });
      } else if (stats.trend === 'down') {
        insights.push({
          id: `insight_${metricType}_down_${now}`,
          title: `${METRIC_TYPES.find(t => t.value === metricType)?.label} em Baixa`,
          description: `Suas métricas de ${METRIC_TYPES.find(t => t.value === metricType)?.label.toLowerCase()} diminuíram nos últimos 7 dias.`,
          type: 'negative',
          metricType,
          timestamp: now,
        });
      }

      // Check for consistency
      if (stats.average > 0) {
        const recentMetrics = this.getMetricsByPeriod(now - 7 * 24 * 60 * 60 * 1000, now).filter(m => m.type === metricType);
        const consistency = recentMetrics.length;

        if (consistency >= 6) {
          insights.push({
            id: `insight_${metricType}_consistent_${now}`,
            title: 'Excelente Consistência!',
            description: `Você manteve ${consistency} dias consecutivos de ${METRIC_TYPES.find(t => t.value === metricType)?.label.toLowerCase()}!`,
            type: 'positive',
            metricType,
            timestamp: now,
          });
        }
      }
    });

    return insights.slice(0, 10); // Keep only top 10 insights
  }

  // ==================== EXPORT ====================

  /**
   * Generate report data for export
   */
  generateReport(startDate: number, endDate: number): string {
    const metrics = this.getMetricsByPeriod(startDate, endDate);

    let report = '=== RELATÓRIO DE ANALYTICS PESSOAL ===\n\n';
    report += `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}\n\n`;

    METRIC_TYPES.forEach(({ value: type, label }) => {
      const typeMetrics = metrics.filter(m => m.type === type);
      if (typeMetrics.length === 0) return;

      const total = typeMetrics.reduce((sum, m) => sum + m.value, 0);
      const average = total / typeMetrics.length;

      report += `\n${label}:\n`;
      report += `  Total de registros: ${typeMetrics.length}\n`;
      report += `  Valor total: ${total.toFixed(2)}\n`;
      report += `  Média: ${average.toFixed(2)}\n`;
    });

    report += '\n\n=== INSIGHTS ===\n';
    this.insights.forEach(insight => {
      report += `\n- ${insight.title}: ${insight.description}\n`;
    });

    return report;
  }

  // ==================== SYNC ====================

  syncToStorage(): void {
    StorageService.saveToStorage(StorageService.getKeys().DASHBOARD_DATA, {
      metrics: this.metrics,
      widgets: this.widgets,
      insights: this.insights,
    });
  }

  static loadFromStorage(): AnalyticsModel {
    const data = StorageService.loadFromStorage<DashboardData | null>(
      StorageService.getKeys().DASHBOARD_DATA,
      null
    );
    return new AnalyticsModel(data || undefined);
  }
}

// ============================================================================
// CONTROLLER LAYER
// ============================================================================

class AnalyticsController {
  private model: AnalyticsModel;
  private listeners: Set<() => void>;

  constructor(model: AnalyticsModel) {
    this.model = model;
    this.listeners = new Set();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
    this.model.syncToStorage();
  }

  // Metric methods
  getAllMetrics = () => this.model.getAllMetrics();
  getMetricsByType = (type: MetricType) => this.model.getMetricsByType(type);
  getMetricsByPeriod = (start: number, end: number) => this.model.getMetricsByPeriod(start, end);
  aggregateMetrics = (type: MetricType, period: PeriodType, metricName?: string) =>
    this.model.aggregateMetrics(type, period, metricName);
  comparePeriods = (type: MetricType, cs: number, ce: number, ps: number, pe: number) =>
    this.model.comparePeriods(type, cs, ce, ps, pe);
  getStatistics = (type: MetricType, days?: number) => this.model.getStatistics(type, days);

  addMetric(metric: Omit<Metric, 'id' | 'timestamp'>): void {
    this.model.addMetric(metric);
    this.notify();
  }

  deleteMetric(id: string): void {
    this.model.deleteMetric(id);
    this.notify();
  }

  // Widget methods
  getAllWidgets = () => this.model.getAllWidgets();
  getVisibleWidgets = () => this.model.getVisibleWidgets();

  addWidget(widget: Omit<Widget, 'id' | 'position'>): void {
    this.model.addWidget(widget);
    this.notify();
  }

  updateWidget(id: string, updates: Partial<Widget>): void {
    this.model.updateWidget(id, updates);
    this.notify();
  }

  deleteWidget(id: string): void {
    this.model.deleteWidget(id);
    this.notify();
  }

  toggleWidgetVisibility(id: string): void {
    this.model.toggleWidgetVisibility(id);
    this.notify();
  }

  // Insights
  getInsights = () => this.model.getInsights();

  // Export
  generateReport = (startDate: number, endDate: number) =>
    this.model.generateReport(startDate, endDate);
}

// ============================================================================
// CONTEXT
// ============================================================================

interface DashboardContextType {
  controller: AnalyticsController;
  forceUpdate: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within DashboardProvider');
  return context;
};

// ============================================================================
// VIEW COMPONENTS
// ============================================================================

/**
 * Header Component
 */
const Header: React.FC<{
  darkMode: boolean;
  toggleTheme: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
}> = ({ darkMode, toggleTheme, onNavigate, currentView }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-brand">
          <svg className="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h1>My Analytics Dashboard</h1>
        </div>

        <nav className="header-nav">
          <button
            onClick={() => onNavigate('dashboard')}
            className={currentView === 'dashboard' ? 'active' : ''}
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('metrics')}
            className={currentView === 'metrics' ? 'active' : ''}
          >
            Métricas
          </button>
          <button
            onClick={() => onNavigate('insights')}
            className={currentView === 'insights' ? 'active' : ''}
          >
            Insights
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className={currentView === 'reports' ? 'active' : ''}
          >
            Relatórios
          </button>
        </nav>

        <button onClick={toggleTheme} className="theme-toggle">
          {darkMode ? (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};

/**
 * Stat Widget Component
 */
const StatWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
  const { controller } = useDashboard();
  const stats = controller.getStatistics(widget.metricType, 7);
  const metricConfig = METRIC_TYPES.find(t => t.value === widget.metricType);

  const getTrendIcon = () => {
    if (stats.trend === 'up') return '📈';
    if (stats.trend === 'down') return '📉';
    return '➡️';
  };

  return (
    <div className="widget stat-widget" style={{ borderTopColor: metricConfig?.color }}>
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-icon">{metricConfig?.icon}</span>
      </div>
      <div className="stat-content">
        <div className="stat-value">{stats.average.toFixed(1)}</div>
        <div className="stat-label">Média (7 dias)</div>
        {widget.config.showTrend && (
          <div className="stat-trend">
            <span>{getTrendIcon()}</span>
            <span>{stats.trend === 'up' ? 'Em alta' : stats.trend === 'down' ? 'Em baixa' : 'Estável'}</span>
          </div>
        )}
        <div className="stat-details">
          <div className="stat-detail">
            <span>Total:</span>
            <strong>{stats.total.toFixed(0)}</strong>
          </div>
          <div className="stat-detail">
            <span>Máx:</span>
            <strong>{stats.max.toFixed(0)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Line Chart Widget Component
 */
const LineChartWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
  const { controller } = useDashboard();
  const aggregated = controller.aggregateMetrics(widget.metricType, 'day');
  const metricConfig = METRIC_TYPES.find(t => t.value === widget.metricType);

  const data = Object.entries(aggregated).slice(-7).map(([date, value]) => ({
    date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    value,
  }));

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="widget chart-widget" style={{ borderTopColor: metricConfig?.color }}>
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-icon">{metricConfig?.icon}</span>
      </div>
      <div className="chart-content">
        <div className="line-chart">
          {data.map((point, index) => {
            const height = (point.value / maxValue) * 100;
            return (
              <div key={index} className="chart-bar-container">
                <div
                  className="chart-line-point"
                  style={{
                    bottom: `${height}%`,
                    backgroundColor: metricConfig?.color,
                  }}
                  title={`${point.value.toFixed(1)}`}
                />
                <div className="chart-label">{point.date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Bar Chart Widget Component
 */
const BarChartWidget: React.FC<{ widget: Widget }> = ({ widget }) => {
  const { controller } = useDashboard();
  const aggregated = controller.aggregateMetrics(widget.metricType, 'day');
  const metricConfig = METRIC_TYPES.find(t => t.value === widget.metricType);

  const data = Object.entries(aggregated).slice(-7).map(([date, value]) => ({
    date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    value,
  }));

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="widget chart-widget" style={{ borderTopColor: metricConfig?.color }}>
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-icon">{metricConfig?.icon}</span>
      </div>
      <div className="chart-content">
        <div className="bar-chart">
          {data.map((point, index) => {
            const height = (point.value / maxValue) * 100;
            return (
              <div key={index} className="bar-item">
                <div className="bar-container">
                  <div
                    className="bar-fill"
                    style={{
                      height: `${height}%`,
                      backgroundColor: metricConfig?.color,
                    }}
                    title={`${point.value.toFixed(1)}`}
                  />
                </div>
                <div className="bar-label">{point.date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Widget Renderer
 */
const WidgetRenderer: React.FC<{ widget: Widget }> = ({ widget }) => {
  switch (widget.type) {
    case 'stat':
      return <StatWidget widget={widget} />;
    case 'line':
      return <LineChartWidget widget={widget} />;
    case 'bar':
      return <BarChartWidget widget={widget} />;
    default:
      return <StatWidget widget={widget} />;
  }
};

/**
 * Dashboard View
 */
const DashboardView: React.FC = () => {
  const { controller } = useDashboard();
  const widgets = controller.getVisibleWidgets();

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p className="dashboard-subtitle">Visão geral das suas métricas</p>
      </div>

      <div className="widgets-grid">
        {widgets.map(widget => (
          <WidgetRenderer key={widget.id} widget={widget} />
        ))}
      </div>

      {widgets.length === 0 && (
        <div className="empty-state">
          <p>Nenhum widget visível. Configure seus widgets nas configurações.</p>
        </div>
      )}
    </div>
  );
};

/**
 * Metrics View
 */
const MetricsView: React.FC = () => {
  const { controller, forceUpdate } = useDashboard();
  const [selectedType, setSelectedType] = useState<MetricType>('productivity');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    value: '',
    unit: '',
  });

  const metrics = controller.getMetricsByType(selectedType);
  const filteredMetrics = searchTerm
    ? metrics.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : metrics;

  const stats = controller.getStatistics(selectedType, 30);
  const metricConfig = METRIC_TYPES.find(t => t.value === selectedType);

  const handleAddMetric = () => {
    if (!formData.name || !formData.value) return;

    controller.addMetric({
      name: formData.name,
      type: selectedType,
      value: parseFloat(formData.value),
      unit: formData.unit || 'unidade',
    });

    setFormData({ name: '', value: '', unit: '' });
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir esta métrica?')) {
      controller.deleteMetric(id);
    }
  };

  return (
    <div className="metrics-view">
      <div className="metrics-header">
        <h2>Métricas</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Métrica
        </button>
      </div>

      {showAddForm && (
        <div className="add-metric-form">
          <h3>Adicionar Nova Métrica</h3>
          <div className="form-row">
            <input
              type="text"
              placeholder="Nome da métrica"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="number"
              placeholder="Valor"
              value={formData.value}
              onChange={e => setFormData({ ...formData, value: e.target.value })}
            />
            <input
              type="text"
              placeholder="Unidade"
              value={formData.unit}
              onChange={e => setFormData({ ...formData, unit: e.target.value })}
            />
            <button onClick={handleAddMetric} className="btn-primary">Adicionar</button>
          </div>
        </div>
      )}

      <div className="metrics-filters">
        <div className="search-box">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar métricas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="type-filters">
          {METRIC_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`type-filter ${selectedType === type.value ? 'active' : ''}`}
              style={{
                borderColor: type.color,
                backgroundColor: selectedType === type.value ? type.color : 'transparent',
                color: selectedType === type.value ? '#fff' : 'currentColor',
              }}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-stats">
        <div className="stat-card" style={{ borderLeftColor: metricConfig?.color }}>
          <span className="stat-label">Total (30 dias)</span>
          <span className="stat-value">{stats.total.toFixed(0)}</span>
        </div>
        <div className="stat-card" style={{ borderLeftColor: metricConfig?.color }}>
          <span className="stat-label">Média</span>
          <span className="stat-value">{stats.average.toFixed(1)}</span>
        </div>
        <div className="stat-card" style={{ borderLeftColor: metricConfig?.color }}>
          <span className="stat-label">Máximo</span>
          <span className="stat-value">{stats.max.toFixed(0)}</span>
        </div>
        <div className="stat-card" style={{ borderLeftColor: metricConfig?.color }}>
          <span className="stat-label">Tendência</span>
          <span className="stat-value">{stats.trend === 'up' ? '📈' : stats.trend === 'down' ? '📉' : '➡️'}</span>
        </div>
      </div>

      <div className="metrics-list">
        {filteredMetrics.slice(0, 20).reverse().map(metric => (
          <div key={metric.id} className="metric-item" style={{ borderLeftColor: metricConfig?.color }}>
            <div className="metric-info">
              <h4>{metric.name}</h4>
              <span className="metric-date">
                {new Date(metric.timestamp).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="metric-value">
              {metric.value} {metric.unit}
            </div>
            <button onClick={() => handleDelete(metric.id)} className="btn-delete">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Insights View
 */
const InsightsView: React.FC = () => {
  const { controller } = useDashboard();
  const insights = controller.getInsights();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return '✅';
      case 'negative':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getInsightClass = (type: string) => {
    switch (type) {
      case 'positive':
        return 'insight-positive';
      case 'negative':
        return 'insight-negative';
      default:
        return 'insight-neutral';
    }
  };

  return (
    <div className="insights-view">
      <div className="insights-header">
        <h2>Insights Automáticos</h2>
        <p className="insights-subtitle">Análises geradas automaticamente baseadas em seus dados</p>
      </div>

      <div className="insights-list">
        {insights.map(insight => {
          const metricConfig = METRIC_TYPES.find(t => t.value === insight.metricType);
          return (
            <div key={insight.id} className={`insight-card ${getInsightClass(insight.type)}`}>
              <div className="insight-icon">{getInsightIcon(insight.type)}</div>
              <div className="insight-content">
                <h3>{insight.title}</h3>
                <p>{insight.description}</p>
                <div className="insight-footer">
                  <span className="insight-category" style={{ color: metricConfig?.color }}>
                    {metricConfig?.icon} {metricConfig?.label}
                  </span>
                  <span className="insight-date">
                    {new Date(insight.timestamp).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {insights.length === 0 && (
        <div className="empty-state">
          <p>Ainda não há insights disponíveis. Continue adicionando métricas!</p>
        </div>
      )}
    </div>
  );
};

/**
 * Reports View
 */
const ReportsView: React.FC = () => {
  const { controller } = useDashboard();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [compareType, setCompareType] = useState<MetricType>('productivity');

  const handleExport = () => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const report = controller.generateReport(start, end);

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-analytics-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate comparison
  const currentStart = new Date(startDate).getTime();
  const currentEnd = new Date(endDate).getTime();
  const duration = currentEnd - currentStart;
  const previousStart = currentStart - duration;
  const previousEnd = currentStart;

  const comparison = controller.comparePeriods(
    compareType,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd
  );

  return (
    <div className="reports-view">
      <div className="reports-header">
        <h2>Relatórios</h2>
        <button onClick={handleExport} className="btn-primary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar Relatório
        </button>
      </div>

      <div className="report-config">
        <h3>Configuração do Relatório</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="comparison-section">
        <h3>Comparação de Períodos</h3>
        <div className="comparison-type-select">
          {METRIC_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setCompareType(type.value)}
              className={compareType === type.value ? 'active' : ''}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>

        <div className="comparison-cards">
          <div className="comparison-card">
            <h4>Período Atual</h4>
            <div className="comparison-value">{comparison.current.toFixed(0)}</div>
            <div className="comparison-dates">
              {new Date(currentStart).toLocaleDateString('pt-BR')} - {new Date(currentEnd).toLocaleDateString('pt-BR')}
            </div>
          </div>

          <div className="comparison-card">
            <h4>Período Anterior</h4>
            <div className="comparison-value">{comparison.previous.toFixed(0)}</div>
            <div className="comparison-dates">
              {new Date(previousStart).toLocaleDateString('pt-BR')} - {new Date(previousEnd).toLocaleDateString('pt-BR')}
            </div>
          </div>

          <div className={`comparison-card ${comparison.change >= 0 ? 'positive' : 'negative'}`}>
            <h4>Mudança</h4>
            <div className="comparison-value">
              {comparison.change >= 0 ? '+' : ''}{comparison.change.toFixed(0)}
            </div>
            <div className="comparison-percent">
              {comparison.changePercent >= 0 ? '+' : ''}{comparison.changePercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    return StorageService.loadFromStorage(StorageService.getKeys().DARK_MODE, false);
  });

  const [controller] = useState(() => {
    const model = AnalyticsModel.loadFromStorage();
    return new AnalyticsController(model);
  });

  const [, setUpdateCount] = useState(0);
  const forceUpdate = () => setUpdateCount(prev => prev + 1);

  const [currentView, setCurrentView] = useState<string>('dashboard');

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      forceUpdate();
    });
    return unsubscribe;
  }, [controller]);

  useEffect(() => {
    if (isClient) {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      StorageService.saveToStorage(StorageService.getKeys().DARK_MODE, darkMode);
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <DashboardContext.Provider value={{ controller, forceUpdate }}>
      <div className="app">
        <Header
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          onNavigate={setCurrentView}
          currentView={currentView}
        />

        <main className="main-content">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'metrics' && <MetricsView />}
          {currentView === 'insights' && <InsightsView />}
          {currentView === 'reports' && <ReportsView />}
        </main>
      </div>
    </DashboardContext.Provider>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const APP_STYLES = `
:root {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
  --info: #06b6d4;
  
  --bg: #f8fafc;
  --surface: #ffffff;
  --card-bg: #ffffff;
  --text: #0f172a;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --shadow: rgba(0, 0, 0, 0.1);
  --shadow-lg: rgba(0, 0, 0, 0.15);
  
  --header-bg: #ffffff;
  --header-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  --bg: #0f172a;
  --surface: #1e293b;
  --card-bg: #1e293b;
  --text: #f1f5f9;
  --text-secondary: #94a3b8;
  --border: #334155;
  --shadow: rgba(0, 0, 0, 0.3);
  --shadow-lg: rgba(0, 0, 0, 0.5);
  
  --header-bg: #1e293b;
  --header-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg);
  color: var(--text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: var(--header-bg);
  box-shadow: var(--header-shadow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  width: 32px;
  height: 32px;
  color: var(--primary);
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.header-nav {
  display: flex;
  gap: 0.5rem;
}

.header-nav button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-nav button:hover {
  background: var(--surface);
}

.header-nav button.active {
  background: var(--primary);
  color: white;
}

.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px var(--shadow);
}

.theme-toggle:hover {
  transform: scale(1.05);
  background: var(--primary);
  color: white;
}

.theme-toggle svg {
  width: 20px;
  height: 20px;
}

/* Main Content */
.main-content {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
}

/* Dashboard View */
.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.dashboard-subtitle {
  color: var(--text-secondary);
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.widget {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--shadow);
  border-top: 4px solid;
  transition: all 0.2s ease;
}

.widget:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-lg);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.widget-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.widget-icon {
  font-size: 1.5rem;
}

/* Stat Widget */
.stat-content {
  text-align: center;
}

.stat-value {
  font-size: 3rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.stat-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: var(--surface);
  border-radius: 8px;
}

.stat-details {
  display: flex;
  justify-content: space-around;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.stat-detail {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.stat-detail span {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.stat-detail strong {
  font-size: 1.125rem;
  color: var(--text);
}

/* Chart Widgets */
.chart-content {
  height: 250px;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 1rem 0;
}

.line-chart,
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  position: relative;
}

.chart-bar-container,
.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  height: 100%;
}

.chart-line-point {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 2px 4px var(--shadow);
}

.bar-container {
  flex: 1;
  width: 80%;
  display: flex;
  align-items: flex-end;
}

.bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
}

.chart-label,
.bar-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

/* Metrics View */
.metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.metrics-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
}

.add-metric-form {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.add-metric-form h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-row input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.9375rem;
}

.form-row input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.metrics-filters {
  margin-bottom: 1.5rem;
}

.search-box {
  position: relative;
  margin-bottom: 1rem;
}

.search-box svg {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.9375rem;
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.type-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.type-filter {
  padding: 0.5rem 1rem;
  border: 2px solid;
  border-radius: 8px;
  background: transparent;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-filter:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px var(--shadow);
}

.metrics-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-left: 4px solid;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-card .stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.stat-card .stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metric-item {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-left: 4px solid;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
}

.metric-item:hover {
  box-shadow: 0 2px 8px var(--shadow);
}

.metric-info {
  flex: 1;
}

.metric-info h4 {
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.metric-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.metric-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--primary);
}

.btn-delete {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-delete:hover {
  background: var(--danger);
  color: white;
}

.btn-delete svg {
  width: 16px;
  height: 16px;
}

/* Insights View */
.insights-header {
  margin-bottom: 2rem;
}

.insights-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.insights-subtitle {
  color: var(--text-secondary);
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.insight-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  transition: all 0.2s ease;
}

.insight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-lg);
}

.insight-positive {
  border-left: 4px solid var(--success);
}

.insight-negative {
  border-left: 4px solid var(--danger);
}

.insight-neutral {
  border-left: 4px solid var(--info);
}

.insight-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.insight-content {
  flex: 1;
}

.insight-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.insight-content p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.insight-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.insight-category {
  font-size: 0.875rem;
  font-weight: 500;
}

.insight-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Reports View */
.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.reports-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
}

.report-config {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.report-config h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.9375rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.comparison-section {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.comparison-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.comparison-type-select {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.comparison-type-select button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.comparison-type-select button:hover {
  background: var(--border);
}

.comparison-type-select button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.comparison-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.comparison-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
}

.comparison-card h4 {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.comparison-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.comparison-dates {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.comparison-percent {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.comparison-card.positive {
  border-left: 4px solid var(--success);
}

.comparison-card.positive .comparison-value,
.comparison-card.positive .comparison-percent {
  color: var(--success);
}

.comparison-card.negative {
  border-left: 4px solid var(--danger);
}

.comparison-card.negative .comparison-value,
.comparison-card.negative .comparison-percent {
  color: var(--danger);
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary svg {
  width: 18px;
  height: 18px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 1024px) {
  .widgets-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 1rem;
    flex-wrap: wrap;
  }

  .header-nav {
    order: 3;
    width: 100%;
    justify-content: center;
  }

  .main-content {
    padding: 1rem;
  }

  .form-row {
    flex-direction: column;
  }

  .comparison-cards {
    grid-template-columns: 1fr;
  }
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.widget,
.metric-item,
.insight-card {
  animation: fadeIn 0.3s ease-out;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: var(--bg);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
`;

// ============================================================================
// SSR SETUP & EXPORT
// ============================================================================

if (isClient) {
  const styleId = 'app-styles';
  let styleElement = document.getElementById(styleId);

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = APP_STYLES;
    document.head.appendChild(styleElement);
  }
}

export default App;
