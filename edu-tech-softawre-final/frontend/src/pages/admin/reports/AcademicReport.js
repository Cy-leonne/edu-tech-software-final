
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Autocomplete, Box, Button, CircularProgress, Chip, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { buildPrintBrandingHtml, getSchoolBranding, printBrandingStyles } from '../../../utils/printBranding';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const reportCardRemarkSuggestions = [
    'Exceeding Expectations - Excellent performance.',
    'Exceeding Expectations - Outstanding work and consistent effort.',
    'Meeting Expectations - Good progress and satisfactory achievement.',
    'Meeting Expectations - Shows good understanding of the work covered.',
    'Approaching Expectations - Making steady progress with support.',
    'Approaching Expectations - Should participate more actively in lessons.',
    'Below Expectations - Needs more effort and regular practice.',
    'Below Expectations - Requires close guidance and additional support.',
    'Works hard and completes assigned work on time.',
    'Shows good discipline, respect, and cooperation with others.',
    'Has good potential and should continue working consistently.',
    'Attendance and punctuality should improve.',
    'Reading and writing practice at home is recommended.',
    'Mathematics practice at home is recommended.',
    'Has improved significantly during this term.',
    'Should maintain the positive attitude shown this term.',
];

const AcademicReport = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [report, setReport] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [term, setTerm] = useState('Term 1');
    const [remarks, setRemarks] = useState({});
    const [savingStudent, setSavingStudent] = useState('');
    const [saveMessage, setSaveMessage] = useState('');

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
                const response = await fetch(`${API_BASE_URL}/Student/AcademicReport/${schoolId}?term=${encodeURIComponent(term)}`, {
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
                setRemarks(Object.fromEntries((data.academicReport || []).map((student) => [student.id, {
                    classTeacherRemarks: student.classTeacherRemarks || student.suggestedClassTeacherRemarks || '',
                    principalRemarks: student.principalRemarks || student.suggestedPrincipalRemarks || '',
                    nextSchoolOpeningDate: student.nextSchoolOpeningDate ? String(student.nextSchoolOpeningDate).slice(0, 10) : '',
                }])));
                setTotalStudents(data.totalStudents || 0);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [currentUser, term]);

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

    const schoolBranding = getSchoolBranding(currentUser);
    const formatDate = (value) => {
        if (!value) return 'Not set';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
    };
    const getMetrics = (student) => {
        const results = student.results || [];
        const totalMarks = Number(student.reportSummary?.totalMarks ?? results.reduce((sum, result) => sum + Number(result.marksObtained || 0), 0));
        const average = Number(student.reportSummary?.average ?? (results.length ? totalMarks / results.length : 0));
        const byExam = ['CAT', 'END_TERM'].map((examType) => {
            const examResults = results.filter((result) => result.examType === examType);
            return {
                exam: examType === 'END_TERM' ? 'End term' : 'CAT',
                average: examResults.length ? examResults.reduce((sum, result) => sum + Number(result.marksObtained || 0), 0) / examResults.length : null,
            };
        }).filter((entry) => entry.average !== null);
        const catAverage = byExam.find((entry) => entry.exam === 'CAT')?.average;
        const endTermAverage = byExam.find((entry) => entry.exam === 'End term')?.average;
        return {
            totalMarks,
            average,
            totalPoints: Number(student.reportSummary?.totalPoints ?? results.reduce((sum, result) => sum + Number(result.points || 0), 0)),
            position: student.reportSummary?.overallRank ? `${student.reportSummary.overallRank}/${student.reportSummary.overallOutOf}` : 'N/A',
            trend: byExam,
            change: catAverage !== undefined && endTermAverage !== undefined ? endTermAverage - catAverage : null,
        };
    };

    const updateRemark = (studentId, field, value) => {
        setRemarks((previous) => ({
            ...previous,
            [studentId]: { ...(previous[studentId] || {}), [field]: value },
        }));
    };

    const saveRemarks = async (student) => {
        const adminId = currentUser?._id || currentUser?.id;
        const values = remarks[student.id] || {};
        setSavingStudent(student.id);
        setSaveMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/Student/${student.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
                body: JSON.stringify(values),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.message || 'Unable to save report details');
            setSaveMessage(`Report details saved for ${student.name}`);
        } catch (saveError) {
            setSaveMessage(saveError.message);
        } finally {
            setSavingStudent('');
        }
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
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Select size="small" value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Select term">
                        <MenuItem value="Term 1">Term 1</MenuItem>
                        <MenuItem value="Term 2">Term 2</MenuItem>
                        <MenuItem value="Term 3">Term 3</MenuItem>
                    </Select>
                    <Button variant="contained" onClick={printReport}>Print Academic Report</Button>
                </Box>
            </Box>
            <Paper id="academic-report" sx={{ p: { xs: 1, md: 3 } }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    {schoolBranding.logo && <Box component="img" src={schoolBranding.logo} alt={`${schoolBranding.name} logo`} sx={{ maxWidth: 140, maxHeight: 90, objectFit: 'contain', mb: 1 }} />}
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{schoolBranding.name}</Typography>
                    <Typography variant="h4">Academic Report Cards</Typography>
                    {schoolBranding.tagline && <Typography color="text.secondary">{schoolBranding.tagline}</Typography>}
                </Box>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Term: {term} | Total Students: {totalStudents}</Typography>
                {saveMessage && <Alert severity={saveMessage.includes('saved') ? 'success' : 'error'} sx={{ mb: 2 }}>{saveMessage}</Alert>}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Student Details</TableCell>
                                <TableCell>Total Marks</TableCell>
                                <TableCell>Average</TableCell>
                                <TableCell>Total Points</TableCell>
                                <TableCell>Overall Position</TableCell>
                                <TableCell>Subject Results and Trend</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {report.map((student, index) => (
                                <TableRow key={student.id || student._id || index} sx={{ verticalAlign: 'top' }}>
                                    {(() => {
                                        const metrics = getMetrics(student);
                                        return <>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 700 }}>{student.name}</Typography>
                                        <Typography variant="body2">Admission: {student.admissionNo || 'N/A'}</Typography>
                                        <Typography variant="body2">Roll: {student.rollNum || 'N/A'}</Typography>
                                        <Typography variant="body2">Class: {typeof student.class === 'object' ? student.class?.sclassName || 'N/A' : student.class || 'N/A'}</Typography>
                                        <Typography variant="body2">Stream: {student.stream || 'Not set'}</Typography>
                                        <Typography variant="body2">Term: {student.session || 'Not set'}</Typography>
                                        <Typography variant="body2">Class teacher: {student.classTeacher || 'Not assigned'}</Typography>
                                    </TableCell>
                                    <TableCell>{metrics.totalMarks}/{student.reportSummary?.totalMarksPossible || (student.results?.length || 0) * 100}</TableCell>
                                    <TableCell>{metrics.average.toFixed(1)}%</TableCell>
                                    <TableCell>{metrics.totalPoints}</TableCell>
                                    <TableCell>{metrics.position}</TableCell>
                                    <TableCell>
                                        {student.results?.length > 0 ? student.results.map((result, rindex) => {
                                            const rank = student.reportSummary?.subjectRanks?.[result.subjectId];
                                            return <Box key={rindex} sx={{ mb: 0.75 }}>
                                                <Typography variant="body2"><strong>{result.subject}</strong> ({result.subjectTeacher || 'Not assigned'}): {result.marksObtained} marks | {result.grade || 'N/A'} | {result.points || 0} pts | Position {rank ? `${rank.rank}/${rank.outOf}` : 'N/A'}</Typography>
                                                {result.remark && <Chip label={result.remark} size="small" sx={{ mt: 0.25 }} />}
                                            </Box>;
                                        }) : <Typography color="text.secondary">No results</Typography>}
                                        <Box sx={{ width: 220, height: 120, mt: 1 }}>
                                            {metrics.trend.length > 0 && <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={metrics.trend}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="exam" />
                                                    <YAxis domain={[0, 100]} width={30} />
                                                    <Tooltip />
                                                    <Line type="monotone" dataKey="average" stroke="#1976d2" strokeWidth={2} dot={{ r: 3 }} />
                                                </LineChart>
                                            </ResponsiveContainer>}
                                        </Box>
                                        <Typography variant="body2" color={metrics.change === null ? 'text.secondary' : metrics.change >= 0 ? 'success.main' : 'error.main'}>
                                            Performance change: {metrics.change === null ? 'Not enough data' : `${metrics.change >= 0 ? '+' : ''}${metrics.change.toFixed(1)} points`}
                                        </Typography>
                                        <Autocomplete
                                            freeSolo
                                            options={reportCardRemarkSuggestions}
                                            value={remarks[student.id]?.classTeacherRemarks || ''}
                                            onInputChange={(event, value) => updateRemark(student.id, 'classTeacherRemarks', value)}
                                            renderInput={(params) => <TextField {...params} fullWidth multiline minRows={2} size="small" label="Class teacher remarks" placeholder="Search or type a remark" />}
                                            sx={{ mt: 1 }}
                                        />
                                        <Autocomplete
                                            freeSolo
                                            options={reportCardRemarkSuggestions}
                                            value={remarks[student.id]?.principalRemarks || ''}
                                            onInputChange={(event, value) => updateRemark(student.id, 'principalRemarks', value)}
                                            renderInput={(params) => <TextField {...params} fullWidth multiline minRows={2} size="small" label="Principal remarks" placeholder="Search or type a remark" />}
                                            sx={{ mt: 1 }}
                                        />
                                        <TextField fullWidth type="date" size="small" label="Next school opening" value={remarks[student.id]?.nextSchoolOpeningDate || ''} onChange={(event) => updateRemark(student.id, 'nextSchoolOpeningDate', event.target.value)} InputLabelProps={{ shrink: true }} sx={{ mt: 1 }} />
                                        <Button size="small" variant="outlined" onClick={() => saveRemarks(student)} disabled={savingStudent === student.id} sx={{ mt: 1 }}>
                                            {savingStudent === student.id ? 'Saving...' : 'Save report details'}
                                        </Button>
                                    </TableCell>
                                        </>;
                                    })()}
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
