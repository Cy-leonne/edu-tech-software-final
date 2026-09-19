
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { deleteUser, getUserDetails, updateUser } from '../../../redux/userRelated/userHandle';
import { resetStudentPasswordByAdmin } from '../../../redux/studentRelated/studentHandle';
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getSubjectList } from '../../../redux/sclassRelated/sclassHandle';
import { Box, Button, Collapse, IconButton, Table, TableBody, TableHead, Typography, Tab, Paper, BottomNavigation, BottomNavigationAction, Container, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { KeyboardArrowUp, KeyboardArrowDown, Delete as DeleteIcon } from '@mui/icons-material';
import { removeStuff, updateStudentFields, payStudentFee } from '../../../redux/studentRelated/studentHandle';
import { calculateOverallAttendancePercentage, calculateSubjectAttendancePercentage, groupAttendanceBySubject } from '../../../components/attendanceCalculator';
import CustomBarChart from '../../../components/CustomBarChart'
import CustomPieChart from '../../../components/CustomPieChart'
import { StyledTableCell, StyledTableRow } from '../../../components/styles';
import { getSchoolBranding } from '../../../utils/printBranding';

import InsertChartIcon from '@mui/icons-material/InsertChart';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import TableChartIcon from '@mui/icons-material/TableChart';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import Popup from '../../../components/Popup';

const ViewStudent = () => {
    const [showTab, setShowTab] = useState(false);

    const navigate = useNavigate()
    const params = useParams()
    const location = useLocation()
    const dispatch = useDispatch()
    const { userDetails, response, loading, error, currentUser } = useSelector((state) => state.user);

    const studentID = params.id
    const address = "Student"

    useEffect(() => {
        dispatch(getUserDetails(studentID, address));
    }, [dispatch, studentID])

    useEffect(() => {
        if (userDetails && userDetails.sclassName && userDetails.sclassName._id !== undefined) {
            dispatch(getSubjectList(userDetails.sclassName._id, "ClassSubjects"));
        }
    }, [dispatch, userDetails]);

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const isEditPath = location.pathname.endsWith('/edit');
        if (query.get('edit') === 'true' || isEditPath) {
            setShowTab(true);
        }
    }, [location.pathname, location.search]);

    if (response) { console.log(response) }
    else if (error) { console.log(error) }

    const [name, setName] = useState('');
    const [rollNum, setRollNum] = useState('');
    const [password, setPassword] = useState('');
    const [sclassName, setSclassName] = useState('');
    const [studentSchool, setStudentSchool] = useState('');
    const [subjectMarks, setSubjectMarks] = useState('');
    const [subjectAttendance, setSubjectAttendance] = useState([]);

    const [openStates, setOpenStates] = useState({});
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const [showPopup, setShowPopup] = useState(false);
    const [message, setMessage] = useState("");

    const handleOpen = (subId) => {
        setOpenStates((prevState) => ({
            ...prevState,
            [subId]: !prevState[subId],
        }));
    };

    const [value, setValue] = useState('1');

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    const [selectedSection, setSelectedSection] = useState('table');
    const handleSectionChange = (event, newSection) => {
        setSelectedSection(newSection);
    };

    const handleOpenResetDialog = () => {
        setNewPassword('');
        setPasswordError('');
        setPasswordDialogOpen(true);
    };

    const handleConfirmResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters.');
            return;
        }

        setPasswordError('');
        setResetLoading(true);

        try {
            await dispatch(resetStudentPasswordByAdmin(studentID, newPassword));
            setMessage('Password reset successfully. The student/parent has been notified by email if configured.');
            setShowPopup(true);
            setPasswordDialogOpen(false);
        } catch (err) {
            console.error(err);
            setPasswordError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setResetLoading(false);
        }
    };

    const [totalFees, setTotalFees] = useState('');
    const [feeAmount, setFeeAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Paybill');
    const [paybill, setPaybill] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [receipt, setReceipt] = useState(null);
    const [notifyMessage, setNotifyMessage] = useState('');
    const [notifyVia, setNotifyVia] = useState('both');
    const [notifyLoading, setNotifyLoading] = useState(false);
    const [approvingPaymentIndex, setApprovingPaymentIndex] = useState(null);

    const fields = password === ""
        ? { name, rollNum }
        : { name, rollNum, password }

    useEffect(() => {
        if (userDetails) {
            setName(userDetails.name || '');
            setRollNum(userDetails.rollNum || '');
            setSclassName(userDetails.sclassName || '');
            setStudentSchool(userDetails.school || '');
            setSubjectMarks(userDetails.examResult || '');
            setSubjectAttendance(userDetails.attendance || []);
            setTotalFees(userDetails.totalFees !== undefined ? userDetails.totalFees : '');
        }
    }, [userDetails]);

    const submitHandler = async (event) => {
        event.preventDefault()
        try {
            await dispatch(updateUser(fields, studentID, address));
            await dispatch(getUserDetails(studentID, address));
            setMessage('Student record successfully updated.');
            setShowPopup(true);
            setShowTab(false);
        } catch (error) {
            console.error(error)
            setMessage(error?.response?.data?.message || 'Failed to update student.');
            setShowPopup(true);
        }
    }

    const deleteHandler = async () => {
        if (!window.confirm('Delete this student permanently? This cannot be undone.')) {
            return;
        }

        try {
            await dispatch(deleteUser(studentID, address));
            navigate(-1);
        } catch (err) {
            setMessage(err.response?.data?.message || err.message || 'Delete failed');
            setShowPopup(true);
        }
    }

    const removeHandler = (id, deladdress) => {
        dispatch(removeStuff(id, deladdress))
            .then(() => {
                dispatch(getUserDetails(studentID, address));
            })
    }

    const removeSubAttendance = (subId) => {
        dispatch(updateStudentFields(studentID, { subId }, "RemoveStudentSubAtten"))
            .then(() => {
                dispatch(getUserDetails(studentID, address));
            })
    }

    const handlePaymentSubmit = (event) => {
        event.preventDefault();

        const paymentFields = {
            totalFees: totalFees !== '' ? Number(totalFees) : undefined,
            amount: Number(feeAmount),
            paymentMethod,
            paybill,
            accountNumber,
        };

        if (!paymentFields.amount || paymentFields.amount <= 0) {
            setMessage('Enter a valid payment amount');
            setShowPopup(true);
            return;
        }

        dispatch(payStudentFee(studentID, paymentFields))
            .then((result) => {
                setReceipt(result.paymentHistory && result.paymentHistory.length > 0 ? result.paymentHistory[result.paymentHistory.length - 1] : null);
                setFeeAmount('');
                setPaybill('');
                setAccountNumber('');
                dispatch(getUserDetails(studentID, address));
            })
            .catch((error) => {
                setMessage(error?.response?.data?.message || 'Unable to process payment');
                setShowPopup(true);
            });
    }

    const handleApprovePayment = async (paymentIndex) => {
        if (!studentID) return;

        setApprovingPaymentIndex(paymentIndex);
        try {
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL || 'http://localhost:5000'}/Student/VerifyPayment`, {
                studentId: studentID,
                paymentIndex,
                verifiedBy: currentUser?._id || currentUser?.email || 'principal'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-id': currentUser?._id
                }
            });

            if (response.data?.message) {
                setMessage(response.data.message);
                setShowPopup(true);
            }
            await dispatch(getUserDetails(studentID, address));
        } catch (error) {
            setMessage(error?.response?.data?.message || 'Unable to approve payment');
            setShowPopup(true);
        } finally {
            setApprovingPaymentIndex(null);
        }
    };

    const overallAttendancePercentage = calculateOverallAttendancePercentage(subjectAttendance);
    const overallAbsentPercentage = 100 - overallAttendancePercentage;

    const chartData = [
        { name: 'Present', value: overallAttendancePercentage },
        { name: 'Absent', value: overallAbsentPercentage }
    ];

    const subjectData = Object.entries(groupAttendanceBySubject(subjectAttendance)).map(([subName, { subCode, present, sessions }]) => {
        const subjectAttendancePercentage = calculateSubjectAttendancePercentage(present, sessions);
        return {
            subject: subName,
            attendancePercentage: subjectAttendancePercentage,
            totalClasses: sessions,
            attendedClasses: present
        };
    });

    const StudentAttendanceSection = () => {
        const renderTableSection = () => {
            return (
                <>
                    <h3>Attendance:</h3>
                    <Table>
                        <TableHead>
                            <StyledTableRow>
                                <StyledTableCell>Subject</StyledTableCell>
                                <StyledTableCell>Present</StyledTableCell>
                                <StyledTableCell>Total Sessions</StyledTableCell>
                                <StyledTableCell>Attendance Percentage</StyledTableCell>
                                <StyledTableCell align="center">Actions</StyledTableCell>
                            </StyledTableRow>
                        </TableHead>
                        {Object.entries(groupAttendanceBySubject(subjectAttendance)).map(([subName, { present, allData, subId, sessions }], index) => {
                            const subjectAttendancePercentage = calculateSubjectAttendancePercentage(present, sessions);
                            return (
                                <TableBody key={index}>
                                    <StyledTableRow>
                                        <StyledTableCell>{subName}</StyledTableCell>
                                        <StyledTableCell>{present}</StyledTableCell>
                                        <StyledTableCell>{sessions}</StyledTableCell>
                                        <StyledTableCell>{subjectAttendancePercentage}%</StyledTableCell>
                                        <StyledTableCell align="center">
                                            <Button variant="contained"
                                                onClick={() => handleOpen(subId)}>
                                                {openStates[subId] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}Details
                                            </Button>
                                            <IconButton onClick={() => removeSubAttendance(subId)}>
                                                <DeleteIcon color="error" />
                                            </IconButton>
                                            <Button variant="contained" sx={styles.attendanceButton}
                                                onClick={() => navigate(`/Admin/subject/student/attendance/${studentID}/${subId}`)}>
                                                Change
                                            </Button>
                                        </StyledTableCell>
                                    </StyledTableRow>
                                    <StyledTableRow>
                                        <StyledTableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                                            <Collapse in={openStates[subId]} timeout="auto" unmountOnExit>
                                                <Box sx={{ margin: 1 }}>
                                                    <Typography variant="h6" gutterBottom component="div">
                                                        Attendance Details
                                                    </Typography>
                                                    <Table size="small" aria-label="purchases">
                                                        <TableHead>
                                                            <StyledTableRow>
                                                                <StyledTableCell>Date</StyledTableCell>
                                                                <StyledTableCell align="right">Status</StyledTableCell>
                                                            </StyledTableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {allData.map((data, index) => {
                                                                const date = new Date(data.date);
                                                                const dateString = date.toString() !== "Invalid Date" ? date.toISOString().substring(0, 10) : "Invalid Date";
                                                                return (
                                                                    <StyledTableRow key={index}>
                                                                        <StyledTableCell component="th" scope="row">
                                                                            {dateString}
                                                                        </StyledTableCell>
                                                                        <StyledTableCell align="right">{data.status}</StyledTableCell>
                                                                    </StyledTableRow>
                                                                )
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            </Collapse>
                                        </StyledTableCell>
                                    </StyledTableRow>
                                </TableBody>
                            )
                        }
                        )}
                    </Table>
                    <div>
                        Overall Attendance Percentage: {overallAttendancePercentage.toFixed(2)}%
                    </div>
                    <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => removeHandler(studentID, "RemoveStudentAtten")}>Delete All</Button>
                    <Button variant="contained" sx={styles.styledButton} onClick={() => navigate("/Admin/students/student/attendance/" + studentID)}>
                        Add Attendance
                    </Button>
                </>
            )
        }
        const renderChartSection = () => {
            return (
                <>
                    <CustomBarChart chartData={subjectData} dataKey="attendancePercentage" />
                </>
            )
        }
        return (
            <>
                {subjectAttendance && Array.isArray(subjectAttendance) && subjectAttendance.length > 0
                    ?
                    <>
                        {selectedSection === 'table' && renderTableSection()}
                        {selectedSection === 'chart' && renderChartSection()}

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
                    </>
                    :
                    <Button variant="contained" sx={styles.styledButton} onClick={() => navigate("/Admin/students/student/attendance/" + studentID)}>
                        Add Attendance
                    </Button>
                }
            </>
        )
    }

    const StudentMarksSection = () => {
        const renderTableSection = () => {
            return (
                <>
                    <h3>Subject Marks:</h3>
                    <Table>
                        <TableHead>
                            <StyledTableRow>
                                <StyledTableCell>Subject</StyledTableCell>
                                <StyledTableCell>Marks</StyledTableCell>
                            </StyledTableRow>
                        </TableHead>
                        <TableBody>
                            {subjectMarks.map((result, index) => {
                                if (!result.subName || !result.marksObtained) {
                                    return null;
                                }
                                return (
                                    <StyledTableRow key={index}>
                                        <StyledTableCell>{result.subName.subName}</StyledTableCell>
                                        <StyledTableCell>{result.marksObtained}</StyledTableCell>
                                    </StyledTableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <Button variant="contained" sx={styles.styledButton} onClick={() => navigate("/Admin/students/student/marks/" + studentID)}>
                        Add Marks
                    </Button>
                </>
            )
        }
        const renderChartSection = () => {
            return (
                <>
                    <CustomBarChart chartData={subjectMarks} dataKey="marksObtained" />
                </>
            )
        }
        return (
            <>
                {subjectMarks && Array.isArray(subjectMarks) && subjectMarks.length > 0
                    ?
                    <>
                        {selectedSection === 'table' && renderTableSection()}
                        {selectedSection === 'chart' && renderChartSection()}

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
                    </>
                    :
                    <Button variant="contained" sx={styles.styledButton} onClick={() => navigate("/Admin/students/student/marks/" + studentID)}>
                        Add Marks
                    </Button>
                }
            </>
        )
    }

    const PaymentSection = () => {
        const paymentHistory = userDetails?.paymentHistory || [];

        const buildReceiptHtml = () => {
            const branding = getSchoolBranding(currentUser, studentSchool);
            const schoolName = branding.name || 'School Name';
            const schoolLogo = branding.logo;
            const schoolTagline = branding.tagline;
            const schoolPhone = branding.phone || studentSchool?.phone || currentUser?.school?.phone || currentUser?.phone || '';
            const schoolEmail = branding.email || studentSchool?.email || currentUser?.school?.email || currentUser?.email || '';
            const schoolAddress = branding.address || studentSchool?.address || currentUser?.school?.address || currentUser?.address || '';
            const schoolWebsite = branding.website || studentSchool?.website || currentUser?.school?.website || currentUser?.website || '';
            const paidBy = userDetails?.parentName || userDetails?.parent?.name || 'N/A';
            const receiptDate = receipt.date ? new Date(receipt.date).toLocaleString() : new Date().toLocaleString();
            const totalDue = receipt.totalFees ?? userDetails?.totalFees ?? 0;
            const amountPaid = receipt.amount ?? 0;
            const balance = receipt.balanceAfter ?? userDetails?.balance ?? totalDue - amountPaid;

            return `
                <html>
                    <head>
                        <title>Payment Receipt</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #222; }
                            .receipt-wrapper { max-width: 760px; margin: 0 auto; padding: 24px; border: 1px solid #ddd; }
                            .receipt-header { text-align: center; margin-bottom: 20px; }
                            .receipt-header img { max-height: 80px; margin-bottom: 8px; }
                            .receipt-header h1 { margin: 0; font-size: 28px; letter-spacing: 1px; }
                            .receipt-header p { margin: 4px 0; color: #444; }
                            .receipt-title { margin: 24px 0 12px; font-size: 18px; letter-spacing: 0.1em; text-align: center; }
                            .receipt-info, .student-info, .payment-table, .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
                            .receipt-info td, .student-info td, .payment-table td, .payment-table th, .summary-table td { padding: 10px; border: 1px solid #ccc; }
                            .receipt-info .label, .student-info .label { width: 30%; background: #f5f5f5; font-weight: 600; }
                            .payment-table th { background: #f5f5f5; text-align: left; }
                            .payment-table td { background: #fff; }
                            .summary-table td { font-weight: 600; }
                            .footer { margin-top: 24px; font-size: 12px; color: #555; text-align: center; }
                            .received-by { margin-top: 24px; font-size: 14px; }
                        </style>
                    </head>
                    <body>
                        <div class="receipt-wrapper">
                            <div class="receipt-header">
                                ${schoolLogo ? `<img src="${schoolLogo}" alt="${schoolName} logo" />` : ''}
                                <h1>${schoolName}</h1>
                                ${schoolAddress ? `<p>${schoolAddress}</p>` : ''}
                                ${schoolPhone ? `<p>Tel: ${schoolPhone}</p>` : ''}
                                ${schoolEmail ? `<p>Email: ${schoolEmail}</p>` : ''}
                                ${schoolWebsite ? `<p>Website: ${schoolWebsite}</p>` : ''}
                            </div>

                            <div class="receipt-title">RECEIPT</div>

                            <table class="receipt-info">
                                <tr><td class="label">Receipt No</td><td>${receipt.receiptNumber || 'N/A'}</td></tr>
                                <tr><td class="label">Date</td><td>${receiptDate}</td></tr>
                                <tr><td class="label">Payment Method</td><td>${receipt.paymentMethod || 'N/A'}</td></tr>
                                <tr><td class="label">Transaction No.</td><td>${receipt.transactionId || receipt.paybill || receipt.accountNumber || 'N/A'}</td></tr>
                            </table>

                            <table class="student-info">
                                <tr><td class="label">Student Name</td><td>${userDetails?.name || 'N/A'}</td></tr>
                                <tr><td class="label">Admission No.</td><td>${userDetails?.admissionNo || userDetails?.rollNum || 'N/A'}</td></tr>
                                <tr><td class="label">Class</td><td>${userDetails?.sclassName?.name || userDetails?.sclassName || 'N/A'}</td></tr>
                                <tr><td class="label">Parent</td><td>${paidBy}</td></tr>
                            </table>

                            <table class="payment-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Amount (KES)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>School Fees</td><td>${totalDue.toLocaleString()}</td></tr>
                                    <tr><td>Amount Paid</td><td>${amountPaid.toLocaleString()}</td></tr>
                                    <tr><td>Balance</td><td>${balance.toLocaleString()}</td></tr>
                                </tbody>
                            </table>

                            <div class="received-by">Received By: ${currentUser?.name || 'Cashier'}</div>
                            <div class="footer">Thank you for your payment. This is a computer-generated receipt.</div>
                        </div>
                    </body>
                </html>`;
        };

        const printReceipt = () => {
            if (!receipt) return;
            const html = buildReceiptHtml();
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(html);
                newWindow.document.close();
                newWindow.focus();
                newWindow.print();
            }
        };

        return (
            <Box>
                <Typography variant="h6">Fee Summary</Typography>
                <Typography>Total Fees: {userDetails?.totalFees ?? 0}</Typography>
                <Typography>Paid: {userDetails?.amountPaid ?? 0}</Typography>
                <Typography>Balance: {userDetails?.balance ?? 0}</Typography>

                <Paper sx={{ p: 2, mt: 2, mb: 2 }}>
                    <Typography variant="subtitle1">Record Payment</Typography>
                    <Box component="form" onSubmit={handlePaymentSubmit} sx={{ display: 'grid', gap: 2 }}>
                        <input
                            type="number"
                            placeholder="Total Fees (optional)"
                            value={totalFees}
                            onChange={(event) => setTotalFees(event.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="Payment Amount"
                            value={feeAmount}
                            onChange={(event) => setFeeAmount(event.target.value)}
                            required
                        />
                        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                            <option value="Paybill">Paybill</option>
                            <option value="Account Number">Account Number</option>
                            <option value="Cash">Cash</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Paybill"
                            value={paybill}
                            onChange={(event) => setPaybill(event.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Account Number"
                            value={accountNumber}
                            onChange={(event) => setAccountNumber(event.target.value)}
                        />
                        <Button type="submit" variant="contained" sx={styles.styledButton}>Submit Payment</Button>
                    </Box>
                </Paper>

                {receipt && (
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1">Receipt Preview</Typography>
                        <Typography>Receipt #: {receipt.receiptNumber}</Typography>
                        <Typography>Amount Paid: {receipt.amount}</Typography>
                        <Typography>Balance After: {receipt.balanceAfter}</Typography>
                        <Button variant="contained" onClick={printReceipt}>Print Receipt</Button>
                    </Paper>
                )}

                {paymentHistory.length > 0 && (
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1">Payment History</Typography>
                        <Table>
                            <TableHead>
                                <StyledTableRow>
                                    <StyledTableCell>Date</StyledTableCell>
                                    <StyledTableCell>Amount</StyledTableCell>
                                    <StyledTableCell>Method</StyledTableCell>
                                    <StyledTableCell>Receipt</StyledTableCell>
                                    <StyledTableCell>Balance</StyledTableCell>
                                    <StyledTableCell>Action</StyledTableCell>
                                </StyledTableRow>
                            </TableHead>
                            <TableBody>
                                {paymentHistory.slice().reverse().map((item, index) => {
                                    const reversedIndex = paymentHistory.length - 1 - index;
                                    const isPending = item.status === 'Pending';
                                    return (
                                        <StyledTableRow key={index}>
                                            <StyledTableCell>{new Date(item.date).toLocaleDateString()}</StyledTableCell>
                                            <StyledTableCell>{item.amount}</StyledTableCell>
                                            <StyledTableCell>{item.paymentMethod}</StyledTableCell>
                                            <StyledTableCell>{item.receiptNumber}</StyledTableCell>
                                            <StyledTableCell>{item.balanceAfter}</StyledTableCell>
                                            <StyledTableCell>
                                                {isPending ? (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        onClick={() => handleApprovePayment(reversedIndex)}
                                                        disabled={approvingPaymentIndex === reversedIndex}
                                                    >
                                                        {approvingPaymentIndex === reversedIndex ? 'Approving...' : 'Approve'}
                                                    </Button>
                                                ) : (
                                                    <Typography variant="body2" color={item.status === 'Verified' ? 'primary' : 'success.main'}>
                                                        {item.status || 'Approved'}
                                                    </Typography>
                                                )}
                                            </StyledTableCell>
                                        </StyledTableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Box>
        )
    }

    const StudentDetailsSection = () => {
        const className = typeof sclassName === 'object' && sclassName !== null
            ? sclassName.sclassName || 'N/A'
            : sclassName || 'N/A';
        const schoolName = typeof studentSchool === 'object' && studentSchool !== null
            ? studentSchool.schoolName || 'N/A'
            : studentSchool || 'N/A';

        return (
            <div>
                Name: {userDetails?.name || 'N/A'}
                <br />
                Roll Number: {userDetails?.rollNum || 'N/A'}
                <br />
                Class: {className}
                <br />
                School: {schoolName}
                <br />
                Total Fees: {userDetails?.totalFees ?? 0}
                <br />
                Paid: {userDetails?.amountPaid ?? 0}
                <br />
                Balance: {userDetails?.balance ?? 0}
                <br />
                {/* Photo and parent/guardian info */}
                {userDetails?.photo && (
                    <div style={{ marginTop: 12 }}>
                        <img src={userDetails.photo} alt="Student" style={{ width: 140, borderRadius: 6 }} />
                    </div>
                )}
                <div style={{ marginTop: 8 }}>
                    <strong>Parent:</strong> {userDetails?.parentName || 'N/A'}
                    <br />
                    <strong>Phone:</strong> {userDetails?.parentPhone || 'N/A'}
                    <br />
                    <strong>Email:</strong> {userDetails?.parentEmail || 'N/A'}
                    <br />
                    <strong>Guardian:</strong> {userDetails?.guardianName || 'N/A'}
                    <br />
                    <strong>Guardian Phone:</strong> {userDetails?.guardianPhone || 'N/A'}
                    <br />
                    <strong>Relation:</strong> {userDetails?.guardianRelation || 'N/A'}
                </div>

                <Button variant="outlined" color="error" sx={{ mt: 2 }} onClick={handleOpenResetDialog}>
                    Reset Password
                </Button>
                <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
                    <DialogTitle>Reset Student Password</DialogTitle>
                    <DialogContent>
                        {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
                        <TextField
                            autoFocus
                            margin="dense"
                            label="New Temporary Password"
                            type="password"
                            fullWidth
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            helperText="Minimum 6 characters"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setPasswordDialogOpen(false)} disabled={resetLoading}>Cancel</Button>
                        <Button onClick={handleConfirmResetPassword} disabled={resetLoading}>
                            {resetLoading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="subtitle1">Notify Parent / Guardian</Typography>
                    <textarea
                        placeholder="Notification message"
                        value={notifyMessage}
                        onChange={(e) => setNotifyMessage(e.target.value)}
                        style={{ width: '100%', minHeight: 80, marginTop: 8 }}
                    />
                    <div style={{ marginTop: 8 }}>
                        <label style={{ marginRight: 8 }}>Via:</label>
                        <select value={notifyVia} onChange={(e) => setNotifyVia(e.target.value)}>
                            <option value="sms">SMS</option>
                            <option value="email">Email</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                    <Button
                        variant="contained"
                        sx={{ mt: 1 }}
                        onClick={async () => {
                            setNotifyLoading(true);
                            try {
                                const res = await axios.post(`${process.env.REACT_APP_BASE_URL}/Student/NotifyParent/${studentID}`, {
                                    message: notifyMessage,
                                    subject: 'Message from School',
                                    via: notifyVia,
                                }, {
                                    headers: {
                                        'x-admin-id': currentUser?._id
                                    }
                                });
                                setMessage(res.data.message || 'Notification attempted');
                                setShowPopup(true);
                            } catch (err) {
                                setMessage(err.response?.data?.message || 'Notification failed');
                                setShowPopup(true);
                            } finally {
                                setNotifyLoading(false);
                            }
                        }}
                        disabled={notifyLoading}
                    >
                        {notifyLoading ? 'Sending...' : 'Notify Parent'}
                    </Button>
                </Paper>
                {
                    subjectAttendance && Array.isArray(subjectAttendance) && subjectAttendance.length > 0 && (
                        <CustomPieChart data={chartData} />
                    )
                }
                <Button variant="contained" sx={styles.styledButton} onClick={deleteHandler}>
                    Delete
                </Button>
                <br />
                <Button variant="contained" sx={styles.styledButton} className="show-tab" onClick={() => { setShowTab(!showTab) }}>
                    {showTab ? <KeyboardArrowUp /> : <KeyboardArrowDown />} Edit Student
                </Button>
                <Collapse in={showTab} timeout="auto" unmountOnExit>
                    <div className="register" style={{ marginTop: 16 }}>
                        <form className="registerForm" onSubmit={submitHandler}>
                            <span className="registerTitle">Edit Details</span>
                            <label>Name</label>
                            <input className="registerInput" type="text" placeholder="Enter student's name..."
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                autoComplete="name" required />

                            <label>Roll Number</label>
                            <input className="registerInput" type="number" placeholder="Enter student's Roll Number..."
                                value={rollNum}
                                onChange={(event) => setRollNum(event.target.value)}
                                required />

                            <label>New Password (optional)</label>
                            <input className="registerInput" type="password" placeholder="Enter new password to update"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="new-password" />

                            <button className="registerButton" type="submit">Update</button>
                        </form>
                    </div>
                </Collapse>
            </div>
        )
    }

    return (
        <>
            {loading
                ?
                <>
                    <div>Loading...</div>
                </>
                :
                <>
                    <Box sx={{ width: '100%', typography: 'body1', }} >
                        <TabContext value={value}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <TabList onChange={handleChange} sx={{ position: 'fixed', width: '100%', bgcolor: 'background.paper', zIndex: 1 }}>
                                    <Tab label="Details" value="1" />
                                    <Tab label="Attendance" value="2" />
                                    <Tab label="Marks" value="3" />
                                    <Tab label="Fees" value="4" />
                                </TabList>
                            </Box>
                            <Container sx={{ marginTop: "3rem", marginBottom: "4rem" }}>
                                <TabPanel value="1">
                                    <StudentDetailsSection />
                                </TabPanel>
                                <TabPanel value="2">
                                    <StudentAttendanceSection />
                                </TabPanel>
                                <TabPanel value="3">
                                    <StudentMarksSection />
                                </TabPanel>
                                <TabPanel value="4">
                                    <PaymentSection />
                                </TabPanel>
                            </Container>
                        </TabContext>
                    </Box>
                </>
            }
            <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />

        </>
    )
}

export default ViewStudent

const styles = {
    attendanceButton: {
        marginLeft: "20px",
        backgroundColor: "#270843",
        "&:hover": {
            backgroundColor: "#3f1068",
        }
    },
    styledButton: {
        margin: "20px",
        backgroundColor: "#02250b",
        "&:hover": {
            backgroundColor: "#106312",
        }
    }
}
