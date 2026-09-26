import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HardwareGate } from "@/components/HardwareGate";
import { VoiceAssistantButton } from "@/components/VoiceAssistantButton";
import { CallAgentButton } from "@/components/CallAgentButton";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Trends from "./pages/Trends";
import Reports from "./pages/Reports";
import Advisor from "./pages/Advisor";
import SystemOverview from "./pages/SystemOverview";
import AIHardwareAccelerator from "./pages/AIHardwareAccelerator";
import MandiRates from "./pages/MandiRates";
import DatabaseExplorer from "./pages/DatabaseExplorer";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import HardwareSetup from "./pages/HardwareSetup";
import BuyHardware from "./pages/BuyHardware";
import Marketplace from "./pages/Marketplace";
import FarmersMap from "./pages/FarmersMap";

import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ── Global caching defaults ──────────────────────────────────────
      staleTime:            30_000,    // data fresh for 30 s — no refetch needed
      gcTime:               5 * 60_000, // keep in memory 5 min after component unmounts
      refetchOnWindowFocus: false,     // stop hammering the API on tab switch
      retry:                1,         // 1 retry on failure
    },
  },
});

// Redirect authenticated users away from login
// If authenticated but no hardware, send them to hardware setup first
function LoginRoute() {
  const { isAuthenticated, hardwareConnected } = useAuth();
  if (!isAuthenticated) return <Login />;
  return <Navigate to={hardwareConnected ? "/dashboard" : "/hardware-setup"} replace />;
}

import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

// ─── DB Explorer Background Pre-fetching Types & Helpers ─────────────────────
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

const API_URL = import.meta.env.VITE_API_URL || '';

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Prefetch database explorer schemas and default records in the background
    const prefetchDatabaseData = async () => {
      try {
        const tablesRes = await fetch(`${API_URL}/admin/tables`);
        if (!tablesRes.ok) return;
        const tablesData = await tablesRes.json();

        const normalizedTables = normalizeTables(tablesData);
        queryClient.setQueryData(['dbTables'], normalizedTables);

        if (normalizedTables.length > 0) {
          const firstTable = normalizedTables[0];
          const primaryKey = firstTable.columns.find((c) => c.primary_key)?.name || firstTable.columns[0]?.name || 'id';

          const fetchTableData = async (orderByVal: string) => {
            const params = new URLSearchParams();
            params.set('page', '1');
            params.set('page_size', '50');
            params.set('desc', 'true');
            if (orderByVal) params.set('order_by', orderByVal);

            const res = await fetch(`${API_URL}/admin/tables/${encodeURIComponent(firstTable.name)}?${params.toString()}`);
            if (!res.ok) return null;
            const data = await res.json();
            return normalizeTableResponse(data, 1, 50);
          };

          const [dataWithEmpty, dataWithPrimary] = await Promise.all([
            fetchTableData(''),
            fetchTableData(primaryKey),
          ]);

          if (dataWithEmpty) {
            queryClient.setQueryData(
              ['dbTableData', firstTable.name, 1, 50, '', '', '', '', true],
              dataWithEmpty
            );
          }
          if (dataWithPrimary) {
            queryClient.setQueryData(
              ['dbTableData', firstTable.name, 1, 50, '', '', '', primaryKey, true],
              dataWithPrimary
            );
          }
        }
      } catch (err) {
        console.warn('Background database pre-fetch skipped/failed:', err);
      }
    };

    prefetchDatabaseData();
  }, [isAuthenticated, queryClient]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<Signup />} />

        {/* Hardware onboarding — protected but no HardwareGate */}
        <Route
          path="/hardware-setup"
          element={
            <ProtectedRoute>
              <HardwareSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buy-hardware"
          element={
            <ProtectedRoute>
              <BuyHardware />
            </ProtectedRoute>
          }
        />

        {/* Profile — protected, no HardwareGate (user needs to connect hardware here) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Data pages — require hardware connection */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <Dashboard />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trends"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <Trends />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <Reports />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/advisor"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <Advisor />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/overview"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <SystemOverview />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accelerator"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <AIHardwareAccelerator />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mandi"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <MandiRates />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/db"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <DatabaseExplorer />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <Marketplace />
              </HardwareGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <HardwareGate>
                <FarmersMap />
              </HardwareGate>
            </ProtectedRoute>
          }
        />

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {isAuthenticated && (
        <>
          <VoiceAssistantButton />
          <CallAgentButton />
        </>
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;