
const { applyClassFeeToStudent } = require('../utils/financeUtils');

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
});
