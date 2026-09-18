import { API_BASE_URL } from '../../../utils/apiConfig';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Grid, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Tabs, Tab } from '@mui/material';
import { buildPrintBrandingHtml, getSchoolBranding, printBrandingStyles } from '../../../utils/printBranding';


const FinancialReport = () => {
    const { currentUser } = useSelector((state) => state.user);
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentDate = new Date();
    const currentYear = String(currentDate.getFullYear());
    const currentMonth = `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentQuarter = `${currentYear}-Q${Math.floor(currentDate.getMonth() / 3) + 1}`;
    const [period, setPeriod] = useState('year');
    const [month, setMonth] = useState(currentMonth);
    const [quarter, setQuarter] = useState(currentQuarter);
    const [year, setYear] = useState(currentYear);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        if (!currentUser || !currentUser._id) {
            navigate('/Admin/login');
            return;
        }
        const fetchStats = async () => {
            try {
                const adminId = currentUser?._id || currentUser?.id;
                const schoolValues = [currentUser?.school?._id, currentUser?.school, currentUser?.schoolId, adminId];
                const resolvedSchoolId = schoolValues.map((value) => {
                    if (value && typeof value === 'object') return value._id || value.id || null;
                    return value && value !== '[object Object]' ? String(value).trim() : null;
                }).find(Boolean);
                const schoolId = currentUser?.role === 'Admin' ? adminId : resolvedSchoolId;
                let url = `${API_BASE_URL}/Student/PaymentStats/${schoolId}`;
                const params = [];
                params.push(`period=${encodeURIComponent(period)}`);
                if (month) params.push(`month=${encodeURIComponent(month)}`);
                if (quarter) params.push(`quarter=${encodeURIComponent(quarter)}`);
                if (year) params.push(`year=${encodeURIComponent(year)}`);
                if (params.length) url += '?' + params.join('&');
                const response = await fetch(url, {
                    headers: {
                        'x-admin-id': adminId,
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                if (!response.ok) {
                    const message = data?.message || `Failed to load financial report (${response.status})`;
                    throw new Error(message);
                }
                setStats(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [currentUser, navigate, period, month, quarter, year]);

    const printReport = () => {
        const content = document.getElementById('financial-report');
        if (!content) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Financial Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        ${printBrandingStyles}
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ccc; padding: 8px; }
                        th { background: #f0f0f0; }
                    </style>
                </head>
                <body>
                    ${buildPrintBrandingHtml(currentUser)}
                    ${content.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    if (loading) {
        return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Box sx={{ p: 3 }}><Typography color="error">{error}</Typography></Box>;
    }

    const buildReceiptHtml = (student, title, lines, additionalHtml = '') => {
        const { name: schoolName, logo: schoolLogo, tagline: schoolTagline, address: schoolAddress, phone: schoolPhone, email: schoolEmail, website: schoolWebsite } = getSchoolBranding(currentUser);
        return `
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #333; }
                        .receipt-header { text-align: center; margin-bottom: 24px; }
                        .receipt-header img { max-height: 100px; margin-bottom: 12px; }
                        .receipt-header h1 { margin: 0; font-size: 26px; }
                        .receipt-header p { margin: 4px 0; color: #555; }
                        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
                        .details-table td { padding: 10px; border: 1px solid #e0e0e0; }
                        .details-table .label { width: 30%; font-weight: bold; background: #f9f9f9; }
                        .section-title { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #666; margin: 16px 0 8px; }
                        .footer { margin-top: 24px; font-size: 12px; color: #666; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="receipt-header">
                        ${schoolLogo ? `<img src="${schoolLogo}" alt="${schoolName} logo" />` : ''}
                        <h1>${schoolName}</h1>
                        ${schoolTagline ? `<p>${schoolTagline}</p>` : ''}
                        ${schoolAddress ? `<p>${schoolAddress}</p>` : ''}
                        ${schoolPhone ? `<p>Phone: ${schoolPhone}</p>` : ''}
                        ${schoolEmail ? `<p>Email: ${schoolEmail}</p>` : ''}
                        ${schoolWebsite ? `<p>Website: ${schoolWebsite}</p>` : ''}
                    </div>
                    <div class="section-title">${title}</div>
                    <table class="details-table">
                        ${lines.map(line => `<tr><td class="label">${line.label}</td><td>${line.value}</td></tr>`).join('')}
                    </table>
                    ${additionalHtml}
                    <div class="footer">This document is issued by ${schoolName}. Please keep it for your records.</div>
                </body>
            </html>`;
    };

    const handlePrintReceipt = (student) => {
        const lines = [
            { label: 'Student', value: student.name || 'N/A' },
            { label: 'Roll No', value: student.rollNum || 'N/A' },
            { label: 'Total Fees', value: student.totalFees ?? 0 },
            { label: 'Amount Paid', value: student.amountPaid ?? 0 },
            { label: 'Balance', value: student.balance ?? 0 },
            { label: 'Status', value: student.paymentStatus || 'N/A' },
            { label: 'Date', value: new Date().toLocaleDateString() },
        ];
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(buildReceiptHtml(student, 'Payment Receipt', lines));
        win.document.close();
        win.print();
    };

    const handlePrintStatement = (student) => {
        const lines = [
            { label: 'Student', value: student.name || 'N/A' },
            { label: 'Roll No', value: student.rollNum || 'N/A' },
            { label: 'Total Fees', value: student.totalFees ?? 0 },
            { label: 'Amount Paid', value: student.amountPaid ?? 0 },
            { label: 'Balance', value: student.balance ?? 0 },
            { label: 'Status', value: student.paymentStatus || 'N/A' },
            { label: 'Date', value: new Date().toLocaleDateString() },
        ];
        const paymentHistoryHtml = `
            <div class="section-title">Payment History</div>
            <table class="details-table">
                <tr><td class="label">Date</td><td>Amount</td></tr>
                ${(student.paymentHistory || []).map(ph => `<tr><td>${ph.date ? new Date(ph.date).toLocaleDateString() : ''}</td><td>${ph.amount ?? ''}</td></tr>`).join('')}
            </table>
        `;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(buildReceiptHtml(student, 'Student Statement', lines, paymentHistoryHtml));
        win.document.close();
        win.print();
    };

    // Categorize students by payment status
    const categorizeStudents = (students = []) => {
        const fullyPaid = students.filter(s => s.balance === 0 && s.amountPaid > 0);
        const partialPaid = students.filter(s => s.balance > 0 && s.amountPaid > 0);
        const unpaid = students.filter(s => s.amountPaid === 0 || !s.amountPaid);
        return { fullyPaid, partialPaid, unpaid };
    };

    const { fullyPaid, partialPaid, unpaid } = categorizeStudents(stats?.studentDetails || []);

    const renderStudentTable = (students, title) => (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, color: title === 'Fully Paid' ? 'green' : title === 'Partial Payment' ? 'orange' : 'red' }}>
                {title} ({students.length})
            </Typography>
            {students.length === 0 ? (
                <Typography>No students in this category.</Typography>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                                <TableCell>#</TableCell>
                                <TableCell>Student Name</TableCell>
                                <TableCell>Roll No</TableCell>
                                <TableCell>Total Fees</TableCell>
                                <TableCell>Amount Paid</TableCell>
                                <TableCell>Paid in Period</TableCell>
                                <TableCell>Balance</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {students.map((student, index) => (
                                <TableRow key={student.id || index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.rollNum || 'N/A'}</TableCell>
                                    <TableCell>{student.totalFees ?? 0}</TableCell>
                                    <TableCell>{student.amountPaid ?? 0}</TableCell>
                                    <TableCell>{student.periodAmountPaid ?? 0}</TableCell>
                                    <TableCell>{student.balance ?? 0}</TableCell>
                                    <TableCell>{student.paymentStatus || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handlePrintReceipt(student)}>Receipt</Button>
                                        <Button size="small" variant="outlined" onClick={() => handlePrintStatement(student)}>Statement</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Typography variant="h5">Financial Report</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Select size="small" value={period} onChange={e => setPeriod(e.target.value)}>
                        <MenuItem value="month">Monthly</MenuItem>
                        <MenuItem value="quarter">Quarterly</MenuItem>
                        <MenuItem value="year">Yearly</MenuItem>
                        <MenuItem value="all">All time</MenuItem>
                    </Select>
                    {period === 'month' && <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }} />}
                    {period === 'quarter' && <Select size="small" value={quarter} displayEmpty onChange={e => setQuarter(e.target.value)}>
                        <MenuItem value="">Select quarter</MenuItem>
                        {[1, 2, 3, 4].map((item) => <MenuItem key={item} value={`${year || new Date().getFullYear()}-Q${item}`}>{year || new Date().getFullYear()} Q{item}</MenuItem>)}
                    </Select>}
                    {(period === 'year' || period === 'quarter') && <input type="number" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc', width: 90 }} />}
                    <Button variant="contained" onClick={printReport}>Print Report</Button>
                </Box>
            </Box>
            <Paper id="financial-report" sx={{ p: 2 }}>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2">Total Students</Typography>
                        <Typography variant="h6">{stats.totalStudents}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2">Fees Collected</Typography>
                        <Typography variant="h6">{stats.totalFeesCollected}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2">Outstanding Fees</Typography>
                        <Typography variant="h6">{stats.totalOutstanding}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2">Students Paid</Typography>
                        <Typography variant="h6">{stats.studentsPaid}</Typography>
                    </Grid>
                </Grid>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                        <Tab label={`✅ Fully Paid (${fullyPaid.length})`} />
                        <Tab label={`⏳ Partial Payment (${partialPaid.length})`} />
                        <Tab label={`❌ Debt / Unpaid (${unpaid.length})`} />
                    </Tabs>
                </Box>

                {activeTab === 0 && renderStudentTable(fullyPaid, 'Fully Paid')}
                {activeTab === 1 && renderStudentTable(partialPaid, 'Partial Payment')}
                {activeTab === 2 && renderStudentTable(unpaid, 'Debt / Unpaid')}
            </Paper>
        </Box>
    );
};

export default FinancialReport;
