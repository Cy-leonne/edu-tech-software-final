
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { buildPrintBrandingHtml, printBrandingStyles } from '../../../utils/printBranding';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const AcademicReport = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [report, setReport] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            const adminId = currentUser?._id || currentUser?.id;
                const schoolValues = [currentUser?.school?._id, currentUser?.school, currentUser?.schoolId, adminId];
                const schoolId = schoolValues.map((value) => {
                    if (value && typeof value === 'object') return value._id || value.id || null;
                    return value && value !== '[object Object]' ? String(value).trim() : null;
                }).find(Boolean);
            if (!adminId) {
                setError('Admin not signed in');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/Student/AcademicReport/${schoolId}`, {
                    headers: {
                        'x-admin-id': adminId,
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                if (!response.ok) {
                    const message = data?.message || `Failed to load academic report (${response.status})`;
                    throw new Error(message);
                }
                setReport(data.academicReport || []);
                setTotalStudents(data.totalStudents || 0);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [currentUser]);

    const printReport = () => {
        const content = document.getElementById('academic-report');
        if (!content) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Academic Report</title>
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

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">Academic Report</Typography>
                <Button variant="contained" onClick={printReport}>Print Academic Report</Button>
            </Box>
            <Paper id="academic-report" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Total Students: {totalStudents}</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Student</TableCell>
                                <TableCell>Roll No</TableCell>
                                <TableCell>Class</TableCell>
                                <TableCell>Results</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {report.map((student, index) => (
                                <TableRow key={student.id || student._id || index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.rollNum || 'N/A'}</TableCell>
                                    <TableCell>{typeof student.class === 'object' ? student.class?.sclassName || 'N/A' : student.class || 'N/A'}</TableCell>
                                    <TableCell>
                                        {student.results?.length > 0 ? (
                                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                                {student.results.map((result, rindex) => (
                                                    <li key={rindex}>{result.subject}: {result.marksObtained}</li>
                                                ))}
                                            </ul>
                                        ) : 'No results'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default AcademicReport;
