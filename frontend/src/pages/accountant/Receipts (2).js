
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Alert, Button } from '@mui/material';
import { getSchoolBranding } from '../../utils/printBranding';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const Receipts = () => {
  const { currentUser } = useSelector(state => state.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipts, setReceipts] = useState([]);

  const schoolId = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId;

  useEffect(() => {
    fetchReceipts();
  }, [schoolId]);

  const fetchReceipts = async () => {
    if (!schoolId) {
      setError('Missing school context');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/Student/PaymentStats/${schoolId}`, { headers: { 'x-admin-id': currentUser?._id } });
      const students = res.data?.studentDetails || [];
      const all = [];
      students.forEach((student) => {
        (student.paymentHistory || []).forEach((payment) => {
          all.push({
            studentName: student.name,
            admissionNo: student.admissionNo || student.rollNum || 'N/A',
            rollNum: student.rollNum || 'N/A',
            amount: payment.amount,
            date: payment.date,
            receiptNumber: payment.receiptNumber || payment._id || `RCPT-${student.admissionNo || student.rollNum || student._id}`,
            paymentMethod: payment.paymentMethod || payment.method || 'Cash',
            status: payment.status || 'Completed',
            balance: student.balance ?? 0,
            totalFees: student.totalFees ?? 0,
            amountPaid: student.amountPaid ?? 0,
            balanceAfter: payment.balanceAfter ?? student.balance ?? 0,
            transactionId: payment.transactionId || payment.reference || 'N/A',
            purpose: payment.purpose || payment.description || payment.note || 'School fees payment',
          });
        });
      });
      setReceipts(all);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReceipt = (receipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const { name: schoolName, logo: schoolLogo, tagline: schoolTagline, address: schoolAddress, phone: schoolPhone, email: schoolEmail, website: schoolWebsite } = getSchoolBranding(currentUser);
    const formattedDate = receipt.date ? new Date(receipt.date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const formattedTime = receipt.date ? new Date(receipt.date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const amountPaid = Number(receipt.amount || 0);
    const totalFees = Number(receipt.totalFees || 0);
    const balanceDue = Number(receipt.balance || 0);
    const balanceAfter = Number(receipt.balanceAfter || receipt.balance || 0);
    const amountInWords = `${amountPaid.toLocaleString()} only`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receipt.receiptNumber}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #111827; background: #ffffff; }
            .receipt { max-width: 820px; margin: 0 auto; border: 2px solid #d1d5db; border-radius: 12px; padding: 24px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px; }
            .school-info { flex: 1; }
            .school-info h2 { margin: 0 0 6px; font-size: 24px; }
            .school-info p { margin: 3px 0; color: #4b5563; }
            .header img { max-height: 90px; max-width: 140px; object-fit: contain; margin-bottom: 8px; }
            .receipt-title { text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 1px; margin: 8px 0 14px; text-transform: uppercase; }
            .summary-box { padding: 12px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 14px; }
            .summary-row { display: flex; justify-content: space-between; margin: 6px 0; }
            .summary-row .label { font-weight: 700; color: #374151; }
            .amount-highlight { font-size: 18px; font-weight: 700; color: #0f766e; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td, th { padding: 8px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
            .label-cell { background: #f9fafb; font-weight: 700; width: 35%; }
            .notes { margin-top: 18px; font-size: 13px; color: #4b5563; line-height: 1.6; }
            .signature-block { display: flex; justify-content: space-between; margin-top: 28px; }
            .signature-line { width: 45%; text-align: center; font-size: 13px; color: #374151; }
            .signature-line .line { border-bottom: 1px solid #111827; margin-bottom: 8px; padding-bottom: 6px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="school-info">
                ${schoolLogo ? `<img src="${schoolLogo}" alt="${schoolName} logo" />` : ''}
                <h2>${schoolName}</h2>
                ${schoolTagline ? `<p>${schoolTagline}</p>` : ''}
                ${schoolAddress ? `<p>${schoolAddress}</p>` : ''}
                ${schoolPhone ? `<p>Phone: ${schoolPhone}</p>` : ''}
                ${schoolEmail ? `<p>Email: ${schoolEmail}</p>` : ''}
                ${schoolWebsite ? `<p>Website: ${schoolWebsite}</p>` : ''}
              </div>
              <div style="text-align:right; min-width:180px;">
                <div><strong>Receipt No:</strong> ${receipt.receiptNumber}</div>
                <div><strong>Date:</strong> ${formattedDate}</div>
                <div><strong>Time:</strong> ${formattedTime}</div>
              </div>
            </div>
            <div class="receipt-title">Official Payment Receipt</div>
            <div class="summary-box">
              <div class="summary-row"><span class="label">Student:</span><span>${receipt.studentName}</span></div>
              <div class="summary-row"><span class="label">Admission / Roll No:</span><span>${receipt.admissionNo}</span></div>
              <div class="summary-row"><span class="label">Payment Purpose:</span><span>${receipt.purpose}</span></div>
              <div class="summary-row"><span class="label">Payment Method:</span><span>${receipt.paymentMethod}</span></div>
              <div class="summary-row"><span class="label">Transaction ID:</span><span>${receipt.transactionId}</span></div>
              <div class="summary-row"><span class="label">Status:</span><span>${receipt.status}</span></div>
            </div>
            <div class="summary-box">
              <div class="summary-row"><span class="label">Amount Paid:</span><span class="amount-highlight">KES ${amountPaid.toLocaleString()}</span></div>
              <div class="summary-row"><span class="label">Amount in Words:</span><span>${amountInWords}</span></div>
            </div>
            <table>
              <tr><td class="label-cell">Total Fees</td><td>KES ${totalFees.toLocaleString()}</td></tr>
              <tr><td class="label-cell">Amount Paid</td><td>KES ${amountPaid.toLocaleString()}</td></tr>
              <tr><td class="label-cell">Balance Due</td><td>KES ${balanceDue.toLocaleString()}</td></tr>
              <tr><td class="label-cell">Balance After</td><td>KES ${balanceAfter.toLocaleString()}</td></tr>
            </table>
            <div class="notes">
              <p>This receipt confirms that payment has been received for the services listed above. Please keep this receipt for your records.</p>
              <p>Thank you for your continued support and cooperation.</p>
            </div>
            <div class="signature-block">
              <div class="signature-line">
                <div class="line">&nbsp;</div>
                <div>Received by</div>
              </div>
              <div class="signature-line">
                <div class="line">&nbsp;</div>
                <div>Authorized Signature</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `receipt-${receipt.receiptNumber || 'download'}.html`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Receipts</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Receipt #</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {receipts.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>{r.receiptNumber}</TableCell>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>KES {Number(r.amount || 0).toLocaleString()}</TableCell>
                <TableCell>{r.date ? new Date(r.date).toLocaleString() : '-'}</TableCell>
                <TableCell>
                  <Button variant="outlined" size="small" onClick={() => handleGenerateReceipt(r)}>Generate Receipt</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default Receipts;
