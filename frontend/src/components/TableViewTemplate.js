
import React, { useMemo, useState } from 'react'
import {
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TablePagination,
    Box,
    Paper,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { StyledTableCell, StyledTableRow } from './styles';
import { EmptyState } from './StateViews';

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];

/**
 * Read-only table variant with the same pagination/responsive behaviour as
 * TableTemplate (no action column). API is unchanged plus optional props.
 */
const TableViewTemplate = ({
    columns = [],
    rows = [],
    rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
    initialRowsPerPage = 5,
    emptyTitle = 'No records found',
    emptyDescription = '',
    mobileCard = true,
    getRowId = (row, index) => row?.id ?? row?._id ?? index,
}) => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

    const rowData = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
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

    if (mobileCard && isSmallScreen) {
        return (
            <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {visibleRows.map((row, index) => (
                        <Paper key={getRowId(row, index)} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
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
                                    <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
                                        {renderCellValue(column, row)}
                                    </Typography>
                                </Box>
                            ))}
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
                            {columns.map((column, index) => (
                                <StyledTableCell
                                    key={column.id || index}
                                    align={column.align || 'left'}
                                    sx={{ minWidth: column.minWidth }}
                                >
                                    {column.label}
                                </StyledTableCell>
                            ))}
                        </StyledTableRow>
                    </TableHead>
                    <TableBody>
                        {visibleRows.map((row, rowIndex) => (
                            <StyledTableRow hover tabIndex={-1} key={getRowId(row, rowIndex)}>
                                {columns.map((column, index) => (
                                    <StyledTableCell
                                        key={column.id || index}
                                        align={column.align || 'left'}
                                        sx={{ whiteSpace: column.wrap ? 'normal' : 'nowrap' }}
                                    >
                                        {renderCellValue(column, row)}
                                    </StyledTableCell>
                                ))}
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
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
                sx={{ maxWidth: '100%' }}
            />
        </Box>
    );
}

export default TableViewTemplate
