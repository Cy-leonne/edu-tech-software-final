
const mongoose = require('mongoose');
const Student = require('./models/studentSchema');

const fixStudentFees = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/schoolManagementSystem');
        console.log('Connected to MongoDB');

        // Find all students with totalFees = 0
        const studentsWithZeroFees = await Student.find({ totalFees: { $lte: 0 } });
        console.log(`Found ${studentsWithZeroFees.length} students with totalFees = 0`);

        // Update each student
        for (const student of studentsWithZeroFees) {
            // Set a default totalFees if 0
            if (!student.totalFees || student.totalFees === 0) {
                student.totalFees = 50000; // Default amount, adjust as needed
            }

            // Ensure paymentHistory is an array
            if (!student.paymentHistory) {
                student.paymentHistory = [];
            }

            // Recalculate amounts
            const completedPayments = student.paymentHistory.filter(p => ['Completed', 'Verified'].includes(p.status));
            const computedAmountPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            
            student.amountPaid = computedAmountPaid;
            student.balance = Math.max(Number(student.totalFees || 0) - Number(computedAmountPaid), 0);
            student.paymentStatus = completedPayments.length > 0 ? 'Completed' : 'Pending';

            await student.save();
            console.log(`Fixed: ${student.name} - TotalFees: ${student.totalFees}, AmountPaid: ${student.amountPaid}, Balance: ${student.balance}`);
        }

        console.log('Fee fixing completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing fees:', error);
        process.exit(1);
    }
};

fixStudentFees();
