
const normalizePaymentStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['completed', 'success'].includes(normalized)) return 'Completed';
  if (normalized === 'verified') return 'Verified';
  if (['failed', 'declined', 'error'].includes(normalized)) return 'Failed';
  return 'Pending';
};

const reconcileStudentFees = (student = {}) => {
  const history = Array.isArray(student.paymentHistory) ? student.paymentHistory : [];
  const currentPeriod = student.feePeriodKey || 'initial';
  const totalFees = Math.max(Number(student.totalFees) || 0, 0);
  let amountPaid = 0;

  history.forEach((payment) => {
    payment.status = normalizePaymentStatus(payment.status);
    payment.amount = Number(payment.amount || 0);
    if ((payment.feePeriodKey || 'initial') === currentPeriod && ['Completed', 'Verified'].includes(payment.status)) {
      amountPaid += payment.amount;
    }
  });

  student.totalFees = totalFees;
  student.amountPaid = amountPaid;
  student.balance = Math.max(totalFees - amountPaid, 0);
  student.paymentStatus = student.balance === 0 ? 'Completed' : 'Pending';

  let runningPaid = 0;
  history.forEach((payment) => {
    if ((payment.feePeriodKey || 'initial') === currentPeriod && ['Completed', 'Verified'].includes(payment.status)) {
      runningPaid += payment.amount;
      payment.balanceAfter = Math.max(totalFees - runningPaid, 0);
    }
  });

  return student;
};

const applyClassFeeToStudent = (student = {}, classFeeAmount = 0) => {
  const carriedForwardBalance = Number(student.carriedForwardBalance || 0);
  const totalFees = Number(classFeeAmount || 0) + carriedForwardBalance;
  const amountPaid = Number(student.amountPaid || 0);
  const balance = Math.max(totalFees - amountPaid, 0);
  const paymentStatus = balance === 0 ? 'Completed' : 'Pending';

  return {
    ...student,
    totalFees,
    amountPaid,
    balance,
    paymentStatus,
  };
};

const summarizeFinanceReport = ({ students = [], financeSettings = {} } = {}) => {
  const totalExpectedFees = students.reduce((sum, student) => sum + Number(student.totalFees || 0), 0);
  const totalCollected = students.reduce((sum, student) => sum + Number(student.amountPaid || 0), 0);
  const outstandingBalance = students.reduce((sum, student) => sum + Number(student.balance || 0), 0);
  const classFeeBudget = (financeSettings.classFees || []).reduce((sum, entry) => sum + Number(entry.feeAmount || 0), 0);
  const chequeEntries = (financeSettings.cheques || []).map((entry = {}) => ({
    ...entry,
    amount: Number(entry.amount || 0),
    transactionType: entry.transactionType || entry.type || 'Received Cheque',
    bankName: entry.bankName || entry.bank || '',
    payeePayer: entry.payeePayer || entry.payerPayee || '',
    status: entry.status || 'Pending',
  }));
  const isIncomingCheque = (entry = {}) => {
    const transactionType = (entry.transactionType || entry.type || '').toString().toLowerCase();
    return transactionType === 'incoming' || transactionType === 'received cheque' || transactionType === 'received';
  };
  const isOutgoingCheque = (entry = {}) => {
    const transactionType = (entry.transactionType || entry.type || '').toString().toLowerCase();
    return transactionType === 'outgoing' || transactionType === 'issued cheque' || transactionType === 'issued';
  };
  const incomingCheques = chequeEntries.filter(isIncomingCheque).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const outgoingCheques = chequeEntries.filter(isOutgoingCheque).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const supplyPayments = (financeSettings.supplies || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const pendingCheques = chequeEntries.filter((entry) => (entry.status || '').toString().toLowerCase() === 'pending').length;

  return {
    totalExpectedFees,
    totalCollected,
    outstandingBalance,
    classFeeBudget,
    incomingCheques,
    outgoingCheques,
    supplyPayments,
    pendingCheques,
    chequeEntries,
  };
};

module.exports = {
  reconcileStudentFees,
  applyClassFeeToStudent,
  summarizeFinanceReport,
};
