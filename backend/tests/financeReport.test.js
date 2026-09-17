const { summarizeFinanceReport } = require('../utils/financeUtils');

describe('summarizeFinanceReport', () => {
  test('aggregates totals, balances, cheques and supply payments', () => {
    const report = summarizeFinanceReport({
      students: [
        { totalFees: 5000, amountPaid: 2000, balance: 3000, paymentStatus: 'Pending' },
        { totalFees: 4000, amountPaid: 4000, balance: 0, paymentStatus: 'Completed' },
      ],
      financeSettings: {
        classFees: [{ feeAmount: 1000 }, { feeAmount: 2000 }],
        cheques: [
          { type: 'incoming', amount: 3000, status: 'Pending' },
          { type: 'outgoing', amount: 1200, status: 'Cleared' },
        ],
        supplies: [{ amount: 450 }, { amount: 550 }],
      },
    });

    expect(report.totalExpectedFees).toBe(9000);
    expect(report.totalCollected).toBe(6000);
    expect(report.outstandingBalance).toBe(3000);
    expect(report.classFeeBudget).toBe(3000);
    expect(report.incomingCheques).toBe(3000);
    expect(report.outgoingCheques).toBe(1200);
    expect(report.supplyPayments).toBe(1000);
    expect(report.pendingCheques).toBe(1);
    expect(report.chequeEntries).toHaveLength(2);
  });

  test('supports cheque entries using transactionType instead of type', () => {
    const report = summarizeFinanceReport({
      students: [],
      financeSettings: {
        cheques: [
          { transactionType: 'Received Cheque', amount: 2500, status: 'Deposited' },
          { transactionType: 'Issued Cheque', amount: 800, status: 'Pending' },
        ],
      },
    });

    expect(report.incomingCheques).toBe(2500);
    expect(report.outgoingCheques).toBe(800);
    expect(report.pendingCheques).toBe(1);
  });
});