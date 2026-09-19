
const { applyClassFeeToStudent, reconcileStudentFees } = require('../utils/financeUtils');

describe('applyClassFeeToStudent', () => {
  test('updates totals and balance from class fee settings', () => {
    const student = { amountPaid: 1200, paymentStatus: 'Pending' };

    const result = applyClassFeeToStudent(student, 3000);

    expect(result.totalFees).toBe(3000);
    expect(result.balance).toBe(1800);
    expect(result.paymentStatus).toBe('Pending');
  });

  test('marks a student as completed when the fee is fully covered', () => {
    const student = { amountPaid: 5000 };

    const result = applyClassFeeToStudent(student, 5000);

    expect(result.totalFees).toBe(5000);
    expect(result.balance).toBe(0);
    expect(result.paymentStatus).toBe('Completed');
  });

  test('derives paid, balance and status from completed payment history', () => {
    const student = {
      totalFees: 30000,
      paymentHistory: [
        { amount: 10000, status: 'Completed', feePeriodKey: 'initial' },
      ],
      feePeriodKey: 'initial',
    };

    reconcileStudentFees(student);

    expect(student.amountPaid).toBe(10000);
    expect(student.balance).toBe(20000);
    expect(student.paymentStatus).toBe('Pending');

    student.paymentHistory.push({ amount: 20000, status: 'Completed', feePeriodKey: 'initial' });
    reconcileStudentFees(student);

    expect(student.amountPaid).toBe(30000);
    expect(student.balance).toBe(0);
    expect(student.paymentStatus).toBe('Completed');
  });

  test('never returns a negative balance', () => {
    const student = {
      totalFees: 30000,
      paymentHistory: [{ amount: 40000, status: 'Completed', feePeriodKey: 'initial' }],
      feePeriodKey: 'initial',
    };

    reconcileStudentFees(student);

    expect(student.amountPaid).toBe(40000);
    expect(student.balance).toBe(0);
    expect(student.paymentStatus).toBe('Completed');
  });
});
