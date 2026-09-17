import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { getSubjectList } from '../../redux/sclassRelated/sclassHandle';
import { BottomNavigation, BottomNavigationAction, Container, Paper, Table, TableBody, TableHead, Typography, Box, Chip, Button } from '@mui/material';
import { getUserDetails } from '../../redux/userRelated/userHandle';
import CustomBarChart from '../../components/CustomBarChart'
import { calculateGrade, getGradeColor, formatGrade } from '../../utils/gradingSystem';
import { calculateOverallAttendancePercentage } from '../../components/attendanceCalculator';
import { buildPrintBrandingHtml, getSchoolBranding, printBrandingStyles } from '../../utils/printBranding';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import InsertChartIcon from '@mui/icons-material/InsertChart';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import TableChartIcon from '@mui/icons-material/TableChart';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { StyledTableCell, StyledTableRow } from '../../components/styles';

const StudentSubjects = () => {

    const dispatch = useDispatch();
    const { subjectsList, sclassDetails } = useSelector((state) => state.sclass);
    const { userDetails, currentUser, loading, response, error } = useSelector((state) => state.user);

    useEffect(() => {
        dispatch(getUserDetails(currentUser._id, "Student"));
    }, [dispatch, currentUser._id])

    if (response) { console.log(response) }
    else if (error) { console.log(error) }

    const [subjectMarks, setSubjectMarks] = useState([]);
    const [selectedSection, setSelectedSection] = useState('table');

    useEffect(() => {
        if (userDetails) {
            setSubjectMarks(userDetails.examResult || []);
        }
    }, [userDetails]);

    useEffect(() => {
        if ((!subjectMarks || subjectMarks.length === 0) && currentUser?.sclassName?._id) {
            dispatch(getSubjectList(currentUser.sclassName._id, 'ClassSubjects'));
        }
    }, [subjectMarks, dispatch, currentUser?.sclassName?._id]);

    const catResults = useMemo(
        () => subjectMarks.filter((result) => result.examType === 'CAT'),
        [subjectMarks]
    );

    const endTermResults = useMemo(
        () => subjectMarks.filter((result) => result.examType === 'END_TERM'),
        [subjectMarks]
    );

    const reportSummary = userDetails?.reportSummary || {};
    const schoolBranding = getSchoolBranding(currentUser, userDetails?.school);
    const allResults = Array.isArray(subjectMarks) ? subjectMarks : [];
    const totalMarksScored = Number(reportSummary.totalMarks ?? allResults.reduce((sum, result) => sum + Number(result.marksObtained || 0), 0));
    const totalMarksPossible = allResults.length * 100;
    const averageMarks = allResults.length ? totalMarksScored / allResults.length : 0;
    const stream = userDetails?.stream || userDetails?.streamName || currentUser?.stream || userDetails?.sclassName?.stream || 'Not set';
    const session = userDetails?.term || userDetails?.session || userDetails?.academicYear?.yearName || currentUser?.term || currentUser?.session || 'Not set';
    const nextOpeningDate = userDetails?.nextSchoolOpeningDate || userDetails?.nextOpeningDate || userDetails?.academicYear?.nextOpeningDate || currentUser?.nextSchoolOpeningDate;
    const formatDate = (value) => {
        if (!value) return 'Not set';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
    };
    const getSubjectLabel = (result) => typeof result?.subName === 'string'
        ? result.subName
        : result?.subName?.subName || 'Unknown Subject';
    const trendData = useMemo(() => ['CAT', 'END_TERM'].map((examType) => {
        const results = subjectMarks.filter((result) => result.examType === examType);
        const marks = results.map((result) => Number(result.marksObtained || 0));
        return {
            exam: examType === 'END_TERM' ? 'End term' : 'CAT',
            average: marks.length ? Math.round((marks.reduce((sum, mark) => sum + mark, 0) / marks.length) * 10) / 10 : null,
        };
    }).filter((entry) => entry.average !== null), [subjectMarks]);

    const catAverage = trendData.find((entry) => entry.exam === 'CAT')?.average;
    const endTermAverage = trendData.find((entry) => entry.exam === 'End term')?.average;
    const performanceChange = catAverage !== undefined && endTermAverage !== undefined
        ? endTermAverage - catAverage
        : null;

    const feePercentage = useMemo(() => {
        const totalFees = Number(userDetails?.totalFees ?? currentUser?.totalFees ?? 0);
        const amountPaid = Number(userDetails?.amountPaid ?? currentUser?.amountPaid ?? 0);
        if (totalFees <= 0) return 0;
        return (amountPaid / totalFees) * 100;
    }, [userDetails, currentUser]);

    const attendancePercentage = useMemo(() => {
        return calculateOverallAttendancePercentage(userDetails?.attendance || []);
    }, [userDetails]);

    const hasPassedEligibility = useMemo(() => {
        const hasCatResults = Array.isArray(catResults) && catResults.length > 0;
        return feePercentage >= 75 && attendancePercentage >= 75 && hasCatResults;
    }, [feePercentage, attendancePercentage, catResults]);

    const handlePrintReportCard = () => {
        const content = document.getElementById('report-card-print');
        if (!content) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Student Academic Report Card</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        ${printBrandingStyles}
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ccc; padding: 8px; }
                        th { background: #f0f0f0; }
                    </style>
                </head>
                <body>
                    ${buildPrintBrandingHtml(currentUser, userDetails?.school)}
                    ${content.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    const summaryCounts = useMemo(() => {
        const counts = {
            'Exceeding Expectation': 0,
            'Meeting Expectation': 0,
            'Approaching Expectation': 0,
            'Below Expectation': 0,
            Unknown: 0,
        };

        return (subjectMarks || []).reduce((acc, result) => {
            if (!result || result.marksObtained === undefined || result.marksObtained === null) {
                acc.Unknown += 1;
                return acc;
            }

            const gradeInfo = calculateGrade(result.marksObtained, result.gradingSystem) || result;
            const remark = gradeInfo?.remark || 'Unknown';

            if (acc[remark] !== undefined) {
                acc[remark] += 1;
            } else {
                acc.Unknown += 1;
            }
            return acc;
        }, counts);
    }, [subjectMarks]);

    const getPerformanceChip = (result) => {
        const gradeInfo = calculateGrade(result.marksObtained, result.gradingSystem) || result;
        const remark = gradeInfo?.remark || 'Unknown';
        const color = gradeInfo?.grade ? getGradeColor(gradeInfo.grade) : '#9E9E9E';

        return (
            <Chip
                label={remark}
                size="small"
                sx={{ backgroundColor: color, color: '#fff' }}
            />
        );
    };

    const renderExamTable = (title, results) => {
        return (
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                    {title}
                </Typography>
                <Table>
                    <TableHead>
                        <StyledTableRow>
                            <StyledTableCell>Subject</StyledTableCell>
                            <StyledTableCell>Marks</StyledTableCell>
                            <StyledTableCell>Grade</StyledTableCell>
                            <StyledTableCell>Points</StyledTableCell>
                            <StyledTableCell>Subject Position</StyledTableCell>
                            <StyledTableCell>Performance</StyledTableCell>
                        </StyledTableRow>
                    </TableHead>
                    <TableBody>
                        {results.length > 0 ? (
                            results.map((result, index) => {
                                if (!result.subName) return null;
                                const subjectLabel = getSubjectLabel(result);
                                const subjectId = String(result.subName?._id || result.subName);
                                const subjectRank = reportSummary.subjectRanks?.[subjectId];
                                const gradeInfo = calculateGrade(result.marksObtained, result.gradingSystem) || result;
                                return (
                                    <StyledTableRow key={`${title}-${index}`}>
                                        <StyledTableCell>{subjectLabel}<br /><small>Teacher: {result.subjectTeacher || result.subName?.teacher?.name || 'Not assigned'}</small></StyledTableCell>
                                        <StyledTableCell>{result.marksObtained ?? 'N/A'}</StyledTableCell>
                                        <StyledTableCell>{formatGrade(gradeInfo)}</StyledTableCell>
                                        <StyledTableCell>{result.points ?? 0}</StyledTableCell>
                                        <StyledTableCell>{subjectRank ? `${subjectRank.rank}/${subjectRank.outOf}` : 'N/A'}</StyledTableCell>
                                        <StyledTableCell>{getPerformanceChip(result)}</StyledTableCell>
                                    </StyledTableRow>
                                );
                            })
                        ) : (
                            <StyledTableRow>
                                <StyledTableCell colSpan={6} align="center">
                                    No {title.toLowerCase()} available yet.
                                </StyledTableCell>
                            </StyledTableRow>
                        )}
                    </TableBody>
                </Table>
            </Box>
        );
    };

    const renderTableSection = () => {
        const totalFees = userDetails?.totalFees ?? currentUser?.totalFees ?? 0;
        const amountPaid = userDetails?.amountPaid ?? currentUser?.amountPaid ?? 0;
        const balance = userDetails?.balance ?? currentUser?.balance ?? 0;

        return (
            <Box id="report-card-print">
                <Box sx={{ mb: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {schoolBranding.logo && (
                        <Box component="img" src={schoolBranding.logo} alt={`${schoolBranding.name} logo`} sx={{ maxWidth: 140, maxHeight: 90, objectFit: 'contain', mb: 1 }} />
                    )}
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{schoolBranding.name}</Typography>
                    <Typography variant="h4" gutterBottom>Student Academic Report</Typography>
                    {schoolBranding.tagline && <Typography color="text.secondary">{schoolBranding.tagline}</Typography>}
                </Box>
                <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1 }}>
                    <Typography><strong>Student:</strong> {userDetails?.name || 'N/A'}</Typography>
                    <Typography><strong>Admission No:</strong> {userDetails?.admissionNo || 'N/A'}</Typography>
                    <Typography><strong>Class / Program:</strong> {userDetails?.sclassName?.sclassName || 'N/A'}</Typography>
                    <Typography><strong>Roll No:</strong> {userDetails?.rollNum || 'N/A'}</Typography>
                    <Typography><strong>Stream:</strong> {stream}</Typography>
                    <Typography><strong>Term:</strong> {session}</Typography>
                    <Typography><strong>Class Teacher:</strong> {userDetails?.classTeacherName || 'Not assigned'}</Typography>
                </Box>
                <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                    <Box><Typography variant="subtitle2" color="textSecondary">Total Marks Scored</Typography><Typography variant="h6">{reportSummary.totalMarks ?? 0}</Typography></Box>
                    <Box><Typography variant="subtitle2" color="textSecondary">Total Marks</Typography><Typography variant="h6">{totalMarksScored}/{totalMarksPossible || 0}</Typography></Box>
                    <Box><Typography variant="subtitle2" color="textSecondary">Average</Typography><Typography variant="h6">{averageMarks.toFixed(1)}%</Typography></Box>
                    <Box><Typography variant="subtitle2" color="textSecondary">Total Points</Typography><Typography variant="h6">{reportSummary.totalPoints ?? 0}</Typography></Box>
                    <Box><Typography variant="subtitle2" color="textSecondary">Overall Position</Typography><Typography variant="h6">{reportSummary.overallRank ? `${reportSummary.overallRank}/${reportSummary.overallOutOf}` : 'N/A'}</Typography></Box>
                </Box>
                <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                            Total Fees
                        </Typography>
                        <Typography variant="h6">KES {totalFees}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                            Paid
                        </Typography>
                        <Typography variant="h6">KES {amountPaid}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                            Balance
                        </Typography>
                        <Typography variant="h6">KES {balance}</Typography>
                    </Box>
                </Box>
                {renderExamTable('CAT Results', catResults)}
                {renderExamTable('End Term Results', endTermResults)}

                <Box sx={{ mb: 3, height: 260 }}>
                    <Typography variant="h6" gutterBottom>Performance Trend</Typography>
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="exam" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="average" name="Average marks" stroke="#1976d2" strokeWidth={3} dot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <Typography color="text.secondary">No trend data available yet.</Typography>}
                    <Typography sx={{ mt: 1 }} color={performanceChange === null ? 'text.secondary' : performanceChange >= 0 ? 'success.main' : 'error.main'}>
                        Performance change: {performanceChange === null ? 'Not enough assessment data' : `${performanceChange >= 0 ? '+' : ''}${performanceChange.toFixed(1)} percentage points`}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    <Typography variant="h6" sx={{ alignSelf: 'center' }}>
                        Performance summary:
                    </Typography>
                    <Chip label={`Exceeding: ${summaryCounts['Exceeding Expectation']}`} color="success" />
                    <Chip label={`Meeting: ${summaryCounts['Meeting Expectation']}`} color="info" />
                    <Chip label={`Approaching: ${summaryCounts['Approaching Expectation']}`} sx={{ backgroundColor: '#FF9800', color: '#fff' }} />
                    <Chip label={`Below: ${summaryCounts['Below Expectation']}`} color="error" />
                    <Chip label={`Unknown: ${summaryCounts.Unknown}`} />
                </Box>
                <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #bdbdbd' }}>
                    <Typography variant="h6">Class Teacher Comments</Typography>
                    <Typography sx={{ minHeight: 70, mt: 2, mb: 3, p: 1, border: '1px solid #e0e0e0' }}>
                        {userDetails?.classTeacherRemarks || userDetails?.teacherRemarks || userDetails?.suggestedClassTeacherRemarks || 'No remarks recorded.'}
                    </Typography>
                    <Typography variant="h6">Principal Remarks</Typography>
                    <Typography sx={{ minHeight: 70, mt: 2, mb: 3, p: 1, border: '1px solid #e0e0e0' }}>
                        {userDetails?.principalRemarks || userDetails?.headTeacherRemarks || userDetails?.suggestedPrincipalRemarks || 'No remarks recorded.'}
                    </Typography>
                    <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                        <Typography><strong>Next School Opening:</strong> {formatDate(nextOpeningDate)}</Typography>
                        <Typography><strong>Term:</strong> {session}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                        <Typography sx={{ flex: 1, borderTop: '1px solid #757575', pt: 1 }}>Class teacher signature</Typography>
                        <Typography sx={{ flex: 1, borderTop: '1px solid #757575', pt: 1 }}>Date</Typography>
                    </Box>
                </Box>
            </Box>
        );
    };

    const renderChartSection = () => {
        return (
            <Box>
                <Typography variant="h4" align="center" gutterBottom>
                    Exam Marks Chart
                </Typography>
                <CustomBarChart chartData={subjectMarks} dataKey="marksObtained" />
            </Box>
        );
    };

    const renderClassDetailsSection = () => {
        return (
            <Container>
                <Typography variant="h4" align="center" gutterBottom>
                    Class Details
                </Typography>
                <Typography variant="h5" gutterBottom>
                    You are currently in Class {sclassDetails && sclassDetails.sclassName}
                </Typography>
                <Typography variant="h6" gutterBottom>
                    And these are the subjects:
                </Typography>
                {subjectsList &&
                    subjectsList.map((subject, index) => (
                        <div key={index}>
                            <Typography variant="subtitle1">
                                {subject.subName} ({subject.subCode})
                            </Typography>
                        </div>
                    ))}
            </Container>
        );
    };

    const handleSectionChange = (event, newValue) => {
        setSelectedSection(newValue);
    };

    return (
        <>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div>
                    {subjectMarks && Array.isArray(subjectMarks) && subjectMarks.length > 0
                        ?
                        (<>
                            {selectedSection === 'table' && renderTableSection()}
                            {selectedSection === 'chart' && renderChartSection()}

                            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handlePrintReportCard}
                                >
                                    Print / Download Report Card
                                </Button>
                            </Box>

                            <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
                                <BottomNavigation value={selectedSection} onChange={handleSectionChange} showLabels>
                                    <BottomNavigationAction
                                        label="Table"
                                        value="table"
                                        icon={selectedSection === 'table' ? <TableChartIcon /> : <TableChartOutlinedIcon />}
                                    />
                                    <BottomNavigationAction
                                        label="Chart"
                                        value="chart"
                                        icon={selectedSection === 'chart' ? <InsertChartIcon /> : <InsertChartOutlinedIcon />}
                                    />
                                </BottomNavigation>
                            </Paper>
                        </>)
                        :
                        (<>
                            {renderClassDetailsSection()}
                        </>)
                    }
                </div>
            )}
        </>
    );
};

export default StudentSubjects;