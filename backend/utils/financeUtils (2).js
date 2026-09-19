const applyClassFeeToStudent = (student = {}, classFeeAmount = 0) => {
  const carriedForwardBalance = Number(student.carriedForwardBalance || 0);
  const totalFees = Number(classFeeAmount || 0) + carriedForwardBalance;
  const amountPaid = Number(student.amountPaid || 0);
  const balance = Math.max(totalFees - amountPaid, 0);
  const paymentStatus = balance > 0 ? (student.paymentStatus || 'Pending') : 'Completed';

  return {
    ...student,
    totalFees,
    amountPaid,
    balance,
    paymentStatus,
  };
};

/**
 * Canonical payment status normalisation. Payment history entries may carry a
 * variety of provider supplied status strings; the persisted vocabulary is
 * Pending | Completed | Verified | Failed | Cancelled.
 */
const normalizePaymentStatus = (status) => {
  if (!status) return 'Completed';
  const normalized = status.toString().trim().toLowerCase();
  if (['completed', 'success', 'successful', 'paid'].includes(normalized)) return 'Completed';
  if (normalized === 'verified') return 'Verified';
  if (['failed', 'declined', 'error'].includes(normalized)) return 'Failed';
  if (['cancelled', 'canceled', 'aborted'].includes(normalized)) return 'Cancelled';
  return 'Pending';
};

const toPlainPayment = (payment) => {
  if (!payment || typeof payment !== 'object') return {};
  // Mongoose subdocuments do not survive a plain object spread (schema fields
  // live behind getters, not own enumerable properties), so always serialise
  // through toObject() first. Plain objects fall back to a normal spread.
  if (typeof payment.toObject === 'function') {
    try {
      return payment.toObject();
    } catch (error) {
      /* fall through to the shallow copy below */
    }
  }
  return { ...payment };
};

/**
 * Authoritative fee reconciliation for a student record.
 *
 * Rules (shared by every portal: accountant, admin, parent, student):
 *   - amountPaid      = sum of Completed/Verified payments in the current fee period
 *   - balance         = max(totalFees - amountPaid, 0)  (never negative)
 *   - paymentStatus   = 'Completed' when balance <= 0, otherwise 'Pending'
 *   - balanceAfter    = balance of the running total at each payment (>= 0)
 *
 * The function mutates the passed student object (document or plain object)
 * and returns it. Callers that persist the document keep history, totals and
 * per-payment balanceAfter consistent in one save.
 */
const reconcileStudentFees = (student) => {
  if (!student) return student;

  const history = Array.isArray(student.paymentHistory) ? student.paymentHistory : [];
  const currentPeriod = student.feePeriodKey || 'initial';
  const totalFees = Number(student.totalFees) || 0;

  const normalizedHistory = history
    .map((payment) => {
      const plain = toPlainPayment(payment);
      return {
        ...plain,
        status: normalizePaymentStatus(plain.status),
        amount: Number(plain.amount || 0),
      };
    })
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  let runningTotal = 0;
  const updatedHistory = normalizedHistory.map((payment) => {
    const inCurrentPeriod = (payment.feePeriodKey || 'initial') === currentPeriod;
    if (inCurrentPeriod && ['Completed', 'Verified'].includes(payment.status)) {
      runningTotal += payment.amount;
    }
    const balanceAfter = inCurrentPeriod
      ? Math.max(totalFees - runningTotal, 0)
      : payment.balanceAfter;
    return {
      ...payment,
      balanceAfter,
    };
  });

  student.amountPaid = runningTotal;
  student.balance = Math.max(totalFees - runningTotal, 0);
  student.paymentStatus = student.balance <= 0 ? 'Completed' : 'Pending';
  student.paymentHistory = updatedHistory;

  return student;
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
  applyClassFeeToStudent,
  normalizePaymentStatus,
  reconcileStudentFees,
  summarizeFinanceReport,
};
