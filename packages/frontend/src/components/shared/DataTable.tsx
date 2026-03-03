// ═══════════════════════════════════════════════
// DataTable — Generic, sortable, paginated MUI table
// ═══════════════════════════════════════════════

import { useState, useMemo, type ReactNode, type ChangeEvent, type MouseEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  TextField,
  InputAdornment,
  Box,
  LinearProgress,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// ── Types ──
export interface Column<T> {
  /** Unique key matching a field on T, or a custom id */
  id: string;
  /** Header label */
  label: string;
  /** Custom cell renderer */
  render?: (row: T) => ReactNode;
  /** Disable sorting for this column */
  sortable?: boolean;
  /** Width */
  width?: number | string;
  /** Alignment */
  align?: 'left' | 'center' | 'right';
  /** Value accessor for sorting (defaults to row[id]) */
  getValue?: (row: T) => string | number | boolean | null | undefined;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Unique key per row */
  getRowId: (row: T) => string;
  /** Show loading bar */
  loading?: boolean;
  /** Enable client-side search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Fields to search across (defaults to all string columns) */
  searchFields?: string[];
  /** Default rows per page */
  defaultPageSize?: number;
  /** Rows per page options */
  pageSizeOptions?: number[];
  /** Toolbar actions (right side) */
  toolbar?: ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Dense mode */
  dense?: boolean;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Max height (enables scroll) */
  maxHeight?: number | string;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowId,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Ara...',
  searchFields,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  toolbar,
  onRowClick,
  emptyMessage = 'Kayıt bulunamadı',
  dense = false,
  stickyHeader = true,
  maxHeight,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // ── Search ──
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    const fields = searchFields ?? columns.map((c) => c.id);
    return rows.filter((row) =>
      fields.some((f) => {
        const val = row[f];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [rows, search, searchFields, columns]);

  // ── Sort ──
  const sorted = useMemo(() => {
    if (!sortBy) return filtered;
    const col = columns.find((c) => c.id === sortBy);
    const getValue = col?.getValue ?? ((r: T) => r[sortBy]);
    return [...filtered].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'string'
        ? va.localeCompare(String(vb), 'tr')
        : Number(va) - Number(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir, columns]);

  // ── Paginate ──
  const paginated = useMemo(
    () => sorted.slice(page * pageSize, page * pageSize + pageSize),
    [sorted, page, pageSize],
  );

  const handleSort = (colId: string) => {
    if (sortBy === colId) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(colId);
      setSortDir('asc');
    }
  };

  return (
    <Paper variant="outlined" sx={{ width: '100%' }}>
      {/* Toolbar */}
      {(searchable || toolbar) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, pb: 1 }}>
          {searchable && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: 240 }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          {toolbar}
        </Box>
      )}

      {loading && <LinearProgress />}

      <TableContainer sx={{ maxHeight }}>
        <Table size={dense ? 'small' : 'medium'} stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align ?? 'left'}
                  sx={{ fontWeight: 600, width: col.width }}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortDir : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align ?? 'left'}>
                      {col.render ? col.render(row) : String(row[col.id] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={(_e: MouseEvent<HTMLButtonElement> | null, newPage: number) => setPage(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e: ChangeEvent<HTMLInputElement>) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={pageSizeOptions}
        labelRowsPerPage="Sayfa başına:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      />
    </Paper>
  );
}
