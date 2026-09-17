import React, { useMemo, useState } from 'react'
import {
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TablePagination,
    Box,
    Typography,
    useMediaQuery,
    useTheme,
    Paper,
    Divider,
} from '@mui/material';
import { StyledTableCell, StyledTableRow } from './styles';
import { EmptyState } from './StateViews';

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];

/**
 * Shared table with pagination (used by most admin/staff list screens).
 *
 * Improvements over the previous implementation:
 *  - page-size selection now stores the numeric value (`parseInt(value, 10)`;
 *    it previously used the invalid radix 5, so the selected size was ignored)
 *  - the page index is clamped when the data set shrinks, so the table can no
 *    longer render an empty page
 *  - explicit empty state instead of a blank table body
 *  - responsive: horizontal scroll is contained in the paper container and a
 *    card layout is used on very small screens
 *  - accessible labels for the pagination controls
 *
 * The component API is unchanged (columns / rows / buttonHaver) plus optional
 * props, so all existing call sites keep working.
 */
const TableTemplate = ({
    buttonHaver: ButtonHaver,
    columns = [],
    rows = [],
    rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
    initialRowsPerPage = 5,
    emptyTitle = 'No records found',
    emptyDescription = '',
    onRowClick = null,
    mobileCard = true,
    getRowId = (row, index) => row?.id ?? row?._id ?? index,
}) => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

    const rowData = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
    const hasActions = Boolean(ButtonHaver);
    const maxPage = Math.max(0, Math.ceil(rowData.length / rowsPerPage) - 1);
    const safePage = Math.min(page, maxPage);
    const visibleRows = rowData.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

    const renderCellValue = (column, row) => {
        const value = row[column.id];
        if (column.render) return column.render(row);
        return column.format && typeof value === 'number' ? column.format(value) : value;
    };

    if (rowData.length === 0) {
        return (
            <EmptyState
                title={emptyTitle}
                description={emptyDescription}
                minHeight={180}
            />
        );
    }

    // Card presentation for phones: keeps every column readable without
    // horizontal scrolling on 320px–480px viewports.
    if (mobileCard && isSmallScreen) {
        return (
            <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {visibleRows.map((row, index) => (
                        <Paper
                            key={getRowId(row, index)}
                            variant="outlined"
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                cursor: onRowClick ? 'pointer' : 'default',
                                minWidth: 0,
                            }}
                        >
                            {columns.map((column) => (
                                <Box
                                    key={column.id}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: 1,
                                        py: 0.4,
                                        minWidth: 0,
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                                        {column.label}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ textAlign: 'right', wordBreak: 'break-word', minWidth: 0 }}
                                    >
                                        {renderCellValue(column, row)}
                                    </Typography>
                                </Box>
                            ))}
                            {hasActions && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <ButtonHaver row={row} />
                                    </Box>
                                </>
                            )}
                        </Paper>
                    ))}
                </Box>
                <TablePagination
                    component="div"
                    count={rowData.length}
                    page={safePage}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={rowsPerPageOptions}
                    onPageChange={(event, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="Rows"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
                    getItemAriaLabel={(type) =>
                        type === 'next'
                            ? 'Go to next page'
                            : type === 'previous'
                                ? 'Go to previous page'
                                : type === 'first'
                                    ? 'Go to first page'
                                    : 'Go to last page'
                    }
                />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxWidth: '100%' }}>
                <Table stickyHeader aria-label="data table" size={isSmallScreen ? 'small' : 'medium'}>
                    <TableHead>
                        <StyledTableRow>
                            {columns.map((column) => (
                                <StyledTableCell
                                    key={column.id}
                                    align={column.align || 'left'}
                                    sx={{ minWidth: column.minWidth, position: 'sticky' }}
                                >
                                    {column.label}
                                </StyledTableCell>
                            ))}
                            {hasActions && (
                                <StyledTableCell align="center">Actions</StyledTableCell>
                            )}
                        </StyledTableRow>
                    </TableHead>
                    <TableBody>
                        {visibleRows.map((row, index) => (
                            <StyledTableRow
                                hover
                                tabIndex={-1}
                                key={getRowId(row, index)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                sx={onRowClick ? { cursor: 'pointer' } : undefined}
                            >
                                {columns.map((column) => (
                                    <StyledTableCell
                                        key={column.id}
                                        align={column.align || 'left'}
                                        sx={{ whiteSpace: column.wrap ? 'normal' : 'nowrap' }}
                                    >
                                        {renderCellValue(column, row)}
                                    </StyledTableCell>
                                ))}
                                {hasActions && (
                                    <StyledTableCell align="center">
                                        <ButtonHaver row={row} />
                                    </StyledTableCell>
                                )}
                            </StyledTableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={rowData.length}
                page={safePage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={rowsPerPageOptions}
                onPageChange={(event, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                }}
                labelRowsPerPage="Rows per page"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`
                }
                sx={{ maxWidth: '100%' }}
            />
        </Box>
    );
}

export default TableTemplate
