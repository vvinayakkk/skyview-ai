import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { FarmBackground, GlassSection } from '@/components/FarmTheme';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  RefreshCw,
  Download,
  Search,
  Filter,
  Database,
  Table2,
  Code2,
  FileJson,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Layers3,
  KeyRound,
  ShieldAlert,
  ListFilter,
  SortAsc,
  SortDesc,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

type ColumnMeta = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  primary_key: boolean;
};

type TableMeta = {
  name: string;
  row_count: number;
  columns: ColumnMeta[];
  primary_key?: string[];
  sample_columns?: string[];
};

type TableResponse = {
  table: string;
  columns: ColumnMeta[];
  records: Record<string, unknown>[];
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
  filters: {
    search?: string | null;
    filter_column?: string | null;
    filter_value?: string | null;
    order_by?: string | null;
    desc?: boolean;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeColumn = (column: unknown): ColumnMeta => {
  if (typeof column === 'string') {
    return { name: column, type: 'unknown', nullable: true, default: null, primary_key: column === 'id' };
  }
  const col = isRecord(column) ? column : {};
  const name = String(col.name ?? '');
  return {
    name,
    type: String(col.type ?? 'unknown'),
    nullable: Boolean(col.nullable ?? true),
    default: col.default === null || col.default === undefined ? null : String(col.default),
    primary_key: Boolean(col.primary_key ?? name === 'id'),
  };
};

const normalizeTables = (payload: unknown): TableMeta[] => {
  const body = isRecord(payload) ? payload : {};
  const rowCounts = isRecord(body.row_counts) ? body.row_counts : {};
  const rawTables = Array.isArray(body.tables) ? body.tables : [];
  return rawTables.map((table): TableMeta | null => {
    if (typeof table === 'string') {
      return { name: table, row_count: Number(rowCounts[table] ?? 0), columns: [], primary_key: [], sample_columns: [] };
    }
    if (!isRecord(table)) return null;
    const name = String(table.name ?? '');
    if (!name) return null;
    const columns = Array.isArray(table.columns)
      ? table.columns.map(normalizeColumn).filter((c) => c.name) : [];
    return {
      name,
      row_count: Number(table.row_count ?? rowCounts[name] ?? 0),
      columns,
      primary_key: Array.isArray(table.primary_key) ? table.primary_key.map(String) : [],
      sample_columns: Array.isArray(table.sample_columns) ? table.sample_columns.map(String) : [],
    };
  }).filter((table): table is TableMeta => Boolean(table));
};

const normalizeTableResponse = (payload: unknown, fallbackPage: number, fallbackPageSize: number): TableResponse => {
  const body = isRecord(payload) ? payload : {};
  const columns = Array.isArray(body.columns) ? body.columns.map(normalizeColumn).filter((c) => c.name) : [];
  const records = Array.isArray(body.records) ? body.records.filter(isRecord) : [];
  const pagination = isRecord(body.pagination) ? body.pagination : {};
  return {
    table: String(body.table ?? ''),
    columns,
    records,
    pagination: {
      page: Number(pagination.page ?? fallbackPage),
      page_size: Number(pagination.page_size ?? fallbackPageSize),
      total_rows: Number(pagination.total_rows ?? records.length),
      total_pages: Number(pagination.total_pages ?? 1),
    },
    filters: isRecord(body.filters) ? body.filters : {},
  };
};

const prettyValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number')
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(4);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

// Simplified type badges — no rainbow colors, just subtle monochrome categories
const getTypeBadge = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('int') || t.includes('serial') || t.includes('numeric') || t.includes('float') || t.includes('real') || t.includes('double'))
    return 'NUM';
  if (t.includes('char') || t.includes('text') || t.includes('varchar'))
    return 'TXT';
  if (t.includes('bool'))
    return 'BOOL';
  if (t.includes('date') || t.includes('time') || t.includes('timestamp'))
    return 'DATE';
  if (t.includes('json'))
    return 'JSON';
  return 'ANY';
};

export default function DatabaseExplorer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedTable, setSelectedTable] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [rowSearch, setRowSearch] = useState('');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [orderBy, setOrderBy] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<'table' | 'json' | 'query'>('table');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const { data: tables = [], isLoading: loadingTables, error: tablesError, refetch: refetchTables } = useQuery({
    queryKey: ['dbTables'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/tables`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return normalizeTables(data);
    },
    staleTime: 30000,
  });

  const {
    data: tableData = { columns: [], records: [], pagination: { page: 1, page_size: 50, total_rows: 0, total_pages: 1 } },
    isLoading: loadingRecords,
    isFetching: isFetchingTableData,
    error: recordsError,
    refetch: refetchTableData,
    dataUpdatedAt: recordsUpdatedAt,
  } = useQuery({
    queryKey: ['dbTableData', selectedTable, page, pageSize, rowSearch, filterColumn, filterValue, orderBy, sortDesc],
    queryFn: async () => {
      if (!selectedTable) return { columns: [], records: [], pagination: { page: 1, page_size: 50, total_rows: 0, total_pages: 1 } };
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      params.set('desc', String(sortDesc));
      if (orderBy) params.set('order_by', orderBy);
      if (rowSearch.trim()) params.set('search', rowSearch.trim());
      if (filterColumn && filterValue.trim()) {
        params.set('filter_column', filterColumn);
        params.set('filter_value', filterValue.trim());
      }
      const res = await fetch(`${API_URL}/admin/tables/${encodeURIComponent(selectedTable)}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return normalizeTableResponse(data, page, pageSize);
    },
    enabled: !!selectedTable,
    placeholderData: keepPreviousData,
    staleTime: 15000,
  });

  const columns = tableData.columns;
  const records = tableData.records;
  const pagination = tableData.pagination;
  const lastRefresh = recordsUpdatedAt ? new Date(recordsUpdatedAt).toLocaleTimeString() : '';
  const error = (tablesError || recordsError) ? (((tablesError as Error)?.message || '') + ' ' + ((recordsError as Error)?.message || '')).trim() : '';

  const selectedTableMeta = useMemo(() => tables.find((t) => t.name === selectedTable), [tables, selectedTable]);

  const visibleTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(q));
  }, [tables, tableSearch]);

  const queryPreview = useMemo(() => {
    if (!selectedTable) return 'SELECT * FROM table;';
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    params.set('desc', String(sortDesc));
    if (orderBy) params.set('order_by', orderBy);
    if (rowSearch.trim()) params.set('search', rowSearch.trim());
    if (filterColumn && filterValue.trim()) {
      params.set('filter_column', filterColumn);
      params.set('filter_value', filterValue.trim());
    }
    return `GET /admin/tables/${selectedTable}?${params.toString()}`;
  }, [filterColumn, filterValue, orderBy, page, pageSize, rowSearch, selectedTable, sortDesc]);

  useEffect(() => {
    if (!selectedTable && visibleTables.length > 0) setSelectedTable(visibleTables[0].name);
  }, [selectedTable, visibleTables]);

  useEffect(() => {
    if (!selectedTable) return;
    setPage(1);
    setRowSearch('');
    setFilterColumn('');
    setFilterValue('');
  }, [selectedTable]);

  useEffect(() => {
    if (!orderBy && columns && columns.length > 0) {
      const primary = columns.find((c) => c.primary_key)?.name || columns[0].name;
      setOrderBy(primary);
    }
  }, [columns, orderBy]);

  const refreshAll = async () => {
    refetchTables();
    refetchTableData();
  };

  const exportCurrentTable = () => {
    if (!selectedTable) return;
    const payload = { table: selectedTable, columns, records, pagination, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTable}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ─── Design tokens — clean, monochromatic, dense ─── */
  const bg          = isDark ? '#0d0d0d' : '#f4f4f5';
  const panel       = isDark ? '#141414' : '#ffffff';
  const panelHover  = isDark ? '#1a1a1a' : '#fafafa';
  const border      = isDark ? '#232323' : '#e4e4e7';
  const borderFocus = isDark ? '#3a3a3a' : '#d1d5db';
  const text        = isDark ? '#e8e8e8' : '#111111';
  const textSub     = isDark ? '#666666' : '#888888';
  const textDim     = isDark ? '#3d3d3d' : '#c4c4c4';
  const accent      = isDark ? '#e8e8e8' : '#111111';   // reversed for active states
  const accentBg    = isDark ? '#1f1f1f' : '#f0f0f0';
  const accentSel   = isDark ? '#222222' : '#e8e8e8';
  const selBorder   = isDark ? '#383838' : '#c8c8c8';
  const mono        = '"Berkeley Mono", "Fira Code", "JetBrains Mono", "Cascadia Code", monospace';
  const sans        = '"Geist", "DM Sans", ui-sans-serif, system-ui, sans-serif';

  const rowHoverBg  = isDark ? '#191919' : '#f9f9f9';

  // compact input
  const input: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: isDark ? '#111111' : '#f9f9f9',
    border: `1px solid ${border}`,
    borderRadius: 6,
    padding: '5px 9px',
    color: text,
    fontFamily: sans,
    fontSize: 12,
    transition: 'border-color 0.15s',
  };

  const inputEl: React.CSSProperties = {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: text,
    fontFamily: sans,
    fontSize: 12,
    width: '100%',
  };

  const selectEl: React.CSSProperties = {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: text,
    fontFamily: sans,
    fontSize: 12,
    width: '100%',
    cursor: 'pointer',
    appearance: 'none' as const,
  };

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: sans,
    cursor: 'pointer',
    transition: 'all 0.12s',
    letterSpacing: '0.01em',
  };

  const btnDefault: React.CSSProperties = {
    ...btnBase,
    background: 'transparent',
    border: `1px solid ${border}`,
    color: textSub,
  };

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    background: accent,
    border: `1px solid ${accent}`,
    color: isDark ? '#000000' : '#ffffff',
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    ...btnBase,
    background: active ? accentSel : 'transparent',
    border: `1px solid ${active ? selBorder : 'transparent'}`,
    color: active ? text : textSub,
    padding: '4px 10px',
  });

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans }}>
      <FarmBackground />
      <div style={{ position: 'relative', zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={0} sensorNodeOnline={true} />
      </div>

      <main style={{ position: 'relative', zIndex: 40, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', padding: '12px 16px 12px', gap: 10, boxSizing: 'border-box' }}>

        {/* ── Top bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={14} style={{ color: textSub }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
              Database Explorer
            </span>
            {lastRefresh && (
              <span style={{ fontSize: 11, color: textDim, fontFamily: mono }}>· {lastRefresh}</span>
            )}
            {isFetchingTableData && !loadingRecords && (
              <span style={{
                fontSize: 11,
                color: '#10B981',
                fontFamily: mono,
                marginLeft: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite'
                }} />
                Updating…
              </span>
            )}
          </div>

          {/* Compact stat pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { label: 'tables', value: tables.length },
              { label: 'rows', value: (pagination.total_rows ?? 0).toLocaleString() },
              { label: 'cols', value: columns.length },
            ].map((s) => (
              <div key={s.label} style={{
                background: panel,
                border: `1px solid ${border}`,
                borderRadius: 6,
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: text, fontFamily: mono }}>{s.value}</span>
                <span style={{ fontSize: 10, color: textSub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3-col body ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '210px minmax(0,1fr) 240px', gap: 10, flex: 1, minHeight: 0 }}>

          {/* ── LEFT: Table list ── */}
          <div style={{
            background: panel,
            border: `1px solid ${border}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Search */}
            <div style={{ padding: '10px 10px 8px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
              <div style={{ ...input, padding: '5px 8px' }}>
                <Search size={11} style={{ color: textDim, flexShrink: 0 }} />
                <input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter tables…"
                  style={inputEl}
                />
              </div>
            </div>

            {/* Table rows */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
              {loadingTables ? (
                <div style={{ padding: '16px 8px', textAlign: 'center', color: textDim, fontSize: 12 }}>Loading…</div>
              ) : visibleTables.length === 0 ? (
                <div style={{ padding: '16px 8px', textAlign: 'center', color: textDim, fontSize: 12 }}>No tables</div>
              ) : visibleTables.map((tbl) => {
                const active = tbl.name === selectedTable;
                return (
                  <button
                    key={tbl.name}
                    onClick={() => setSelectedTable(tbl.name)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: active ? accentSel : 'transparent',
                      border: `1px solid ${active ? selBorder : 'transparent'}`,
                      borderRadius: 5,
                      padding: '6px 8px',
                      cursor: 'pointer',
                      marginBottom: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <Layers3 size={11} style={{ color: active ? text : textDim, flexShrink: 0 }} />
                      <span style={{
                        fontSize: 12,
                        fontWeight: active ? 600 : 400,
                        color: active ? text : textSub,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: mono,
                      }}>{tbl.name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: textDim, fontFamily: mono, flexShrink: 0 }}>
                      {(tbl.row_count ?? 0).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CENTER: Data panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>

            {/* Toolbar */}
            <div style={{
              background: panel,
              border: `1px solid ${border}`,
              borderRadius: 8,
              padding: '8px 10px',
              flexShrink: 0,
            }}>
              {/* Row 1: table name + view tabs + actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: text, fontFamily: mono }}>
                    {selectedTable || '—'}
                  </span>
                  {selectedTable && (
                    <span style={{ fontSize: 10, color: textDim, fontFamily: mono }}>
                      {(pagination.total_rows ?? 0).toLocaleString()} rows
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* View tabs */}
                  <div style={{ display: 'flex', gap: 2, marginRight: 6 }}>
                    {([
                      { key: 'table', icon: <Table2 size={11} />, label: 'Table' },
                      { key: 'json',  icon: <FileJson size={11} />, label: 'JSON' },
                      { key: 'query', icon: <Code2 size={11} />, label: 'Query' },
                    ] as const).map((tab) => (
                      <button key={tab.key} onClick={() => setViewMode(tab.key)} style={tabBtn(viewMode === tab.key)}>
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={refreshAll} style={btnDefault}>
                    <RefreshCw size={11} style={{ animation: isFetchingTableData ? 'spin 1s linear infinite' : 'none' }} />
                    Refresh
                  </button>
                  <button onClick={exportCurrentTable} style={btnDefault}><Download size={11} /> Export</button>
                </div>
              </div>

              {/* Row 2: filters */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ ...input, flex: '1 1 160px', minWidth: 120 }}>
                  <Search size={11} style={{ color: textDim, flexShrink: 0 }} />
                  <input value={rowSearch} onChange={(e) => { setRowSearch(e.target.value); setPage(1); }} placeholder="Search rows…" style={inputEl} />
                </div>

                <div style={{ ...input, flex: '0 1 130px' }}>
                  <Filter size={11} style={{ color: textDim, flexShrink: 0 }} />
                  <select value={filterColumn} onChange={(e) => { setFilterColumn(e.target.value); setPage(1); }} style={selectEl}>
                    <option value="">All columns</option>
                    {columns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div style={{ ...input, flex: '0 1 110px' }}>
                  <ListFilter size={11} style={{ color: textDim, flexShrink: 0 }} />
                  <input value={filterValue} onChange={(e) => { setFilterValue(e.target.value); setPage(1); }} placeholder="Value…" style={inputEl} />
                </div>

                <div style={{ ...input, flex: '0 1 130px' }}>
                  <ArrowUpDown size={11} style={{ color: textDim, flexShrink: 0 }} />
                  <select value={orderBy} onChange={(e) => { setOrderBy(e.target.value); setPage(1); }} style={selectEl}>
                    <option value="">Sort by…</option>
                    {columns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <button onClick={() => setSortDesc((p) => !p)} style={btnDefault}>
                  {sortDesc ? <SortDesc size={11} /> : <SortAsc size={11} />}
                  {sortDesc ? 'DESC' : 'ASC'}
                </button>

                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{
                    ...input,
                    padding: '5px 9px',
                    cursor: 'pointer',
                    appearance: 'none' as const,
                    flex: '0 0 auto',
                  }}
                >
                  {[25, 50, 100, 250].map((n) => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px',
                borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                color: '#f87171', fontSize: 12, flexShrink: 0,
              }}>
                <ShieldAlert size={13} /> {error}
              </div>
            )}

            {/* ── TABLE VIEW ── */}
            {viewMode === 'table' && (
              <div style={{
                background: panel,
                border: `1px solid ${border}`,
                borderRadius: 8,
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}>
                <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr style={{ background: isDark ? '#111111' : '#f4f4f5' }}>
                        {columns.map((col) => (
                          <th
                            key={col.name}
                            style={{
                              padding: '7px 12px',
                              textAlign: 'left',
                              borderBottom: `1px solid ${border}`,
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                              fontSize: 11,
                              color: textSub,
                              fontFamily: mono,
                              letterSpacing: '0.02em',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {col.primary_key ? (
                                <KeyRound size={10} style={{ color: text, flexShrink: 0 }} />
                              ) : (
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: borderFocus, display: 'inline-block', flexShrink: 0 }} />
                              )}
                              <span style={{ color: col.primary_key ? text : textSub }}>{col.name}</span>
                              <span style={{
                                fontSize: 9, fontWeight: 700,
                                padding: '1px 5px', borderRadius: 3,
                                background: isDark ? '#1e1e1e' : '#ececec',
                                color: textDim,
                                letterSpacing: '0.06em',
                              }}>
                                {getTypeBadge(col.type)}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRecords ? (
                        <tr>
                          <td colSpan={Math.max(columns.length, 1)} style={{ padding: '40px 20px', textAlign: 'center', color: textDim, fontSize: 12 }}>
                            Loading records…
                          </td>
                        </tr>
                      ) : records.length === 0 ? (
                        <tr>
                          <td colSpan={Math.max(columns.length, 1)} style={{ padding: '40px 20px', textAlign: 'center', color: textDim, fontSize: 12 }}>
                            No records found.
                          </td>
                        </tr>
                      ) : records.map((record, ri) => (
                        <tr
                          key={ri}
                          onMouseEnter={() => setHoveredRow(ri)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{ background: hoveredRow === ri ? rowHoverBg : 'transparent', transition: 'background 0.08s' }}
                        >
                          {columns.map((col) => {
                            const val = record[col.name];
                            const isEmpty = val === null || val === undefined || val === '';
                            return (
                              <td
                                key={col.name}
                                style={{
                                  padding: '6px 12px',
                                  borderBottom: `1px solid ${isDark ? '#1a1a1a' : '#f0f0f0'}`,
                                  color: isEmpty ? textDim : (col.primary_key ? text : textSub),
                                  fontFamily: mono,
                                  fontSize: 11,
                                  verticalAlign: 'top',
                                  maxWidth: 240,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                                title={prettyValue(val)}
                              >
                                {prettyValue(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── JSON VIEW ── */}
            {viewMode === 'json' && (
              <div style={{
                background: isDark ? '#0a0a0a' : '#f8f8f8',
                border: `1px solid ${border}`,
                borderRadius: 8,
                flex: 1,
                overflow: 'hidden',
              }}>
                <pre style={{
                  height: '100%',
                  overflowY: 'auto',
                  padding: '14px 16px',
                  fontSize: 11,
                  lineHeight: 1.65,
                  color: textSub,
                  margin: 0,
                  fontFamily: mono,
                  boxSizing: 'border-box',
                }}>
                  {JSON.stringify({ table: selectedTable, columns, records, pagination }, null, 2)}
                </pre>
              </div>
            )}

            {/* ── QUERY VIEW ── */}
            {viewMode === 'query' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 8, flex: 1, minHeight: 0 }}>
                <div style={{
                  background: isDark ? '#0a0a0a' : '#f8f8f8',
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  padding: '14px 16px',
                  overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textDim, marginBottom: 10 }}>
                    Request
                  </div>
                  <pre style={{ fontSize: 11, lineHeight: 1.65, color: text, margin: 0, fontFamily: mono, overflowX: 'auto' }}>
                    {queryPreview}
                  </pre>
                  <p style={{ fontSize: 11, color: textDim, marginTop: 12, lineHeight: 1.6 }}>
                    Mirrors the exact request sent to the backend. All filtering, sorting and pagination happens server-side.
                  </p>
                </div>

                <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 14px', overflow: 'auto' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textDim, marginBottom: 10 }}>
                    Active Filters
                  </div>
                  {[
                    { label: 'Search', value: rowSearch || '—' },
                    { label: 'Column', value: filterColumn || '—' },
                    { label: 'Value',  value: filterValue || '—' },
                    { label: 'Sort',   value: orderBy ? `${orderBy} ${sortDesc ? '↓' : '↑'}` : '—' },
                    { label: 'Page',   value: `${page} / ${pagination.total_pages}` },
                  ].map((f) => (
                    <div key={f.label} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textDim, marginBottom: 2 }}>
                        {f.label}
                      </div>
                      <div style={{ fontSize: 11, color: text, fontFamily: mono }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            <div style={{
              background: panel,
              border: `1px solid ${border}`,
              borderRadius: 7,
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, color: textDim, fontFamily: mono }}>
                Page {pagination.page} of {pagination.total_pages} · {(pagination.total_rows ?? 0).toLocaleString()} rows
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  disabled={pagination.page <= 1 || isFetchingTableData}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    ...btnDefault,
                    opacity: pagination.page <= 1 || isFetchingTableData ? 0.3 : 1,
                    cursor: pagination.page <= 1 || isFetchingTableData ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={11} /> Prev
                </button>
                <button
                  disabled={pagination.page >= pagination.total_pages || isFetchingTableData}
                  onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                  style={{
                    ...btnDefault,
                    opacity: pagination.page >= pagination.total_pages || isFetchingTableData ? 0.3 : 1,
                    cursor: pagination.page >= pagination.total_pages || isFetchingTableData ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next <ChevronRight size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Schema panel ── */}
          <div style={{
            background: panel,
            border: `1px solid ${border}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textDim, marginBottom: 2 }}>
                Schema
              </div>
              {selectedTable && (
                <div style={{ fontSize: 12, fontWeight: 700, color: text, fontFamily: mono }}>{selectedTable}</div>
              )}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {!selectedTableMeta ? (
                <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: textDim }}>
                  Select a table.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    padding: '8px 10px',
                    background: accentBg,
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    marginBottom: 6,
                  }}>
                    {[
                      { label: 'Rows', value: (selectedTableMeta.row_count ?? 0).toLocaleString() },
                      { label: 'Cols', value: selectedTableMeta.columns?.length ?? 0 },
                    ].map((s) => (
                      <div key={s.label}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: textDim }}>{s.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: text, fontFamily: mono }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Column list */}
                  {(selectedTableMeta.columns || []).map((col) => (
                    <div
                      key={col.name}
                      style={{
                        background: col.primary_key ? accentBg : 'transparent',
                        border: `1px solid ${col.primary_key ? borderFocus : border}`,
                        borderRadius: 5,
                        padding: '7px 9px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        {col.primary_key ? (
                          <KeyRound size={10} style={{ color: text, flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: borderFocus, display: 'inline-block', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 11, fontWeight: 600, color: col.primary_key ? text : textSub, fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {col.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                          background: isDark ? '#1e1e1e' : '#ececec',
                          color: textDim, fontFamily: mono, letterSpacing: '0.04em',
                        }}>
                          {col.type}
                        </span>
                        <span style={{
                          fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                          background: col.nullable ? (isDark ? '#141c1f' : '#eff6ff') : (isDark ? '#1a1510' : '#fffbeb'),
                          color: col.nullable ? (isDark ? '#60a5fa' : '#3b82f6') : (isDark ? '#fbbf24' : '#d97706'),
                        }}>
                          {col.nullable ? 'null' : 'req'}
                        </span>
                        {col.primary_key && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                            background: isDark ? '#1a1a1a' : '#f0f0f0',
                            color: textSub,
                          }}>PK</span>
                        )}
                      </div>
                      {col.default && (
                        <div style={{ marginTop: 4, fontSize: 10, color: textDim, fontFamily: mono }}>
                          → {col.default}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}