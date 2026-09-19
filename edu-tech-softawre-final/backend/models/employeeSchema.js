
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        required: true,
    },

    // Personal Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: [true, 'Email already exists'],
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
    },
    dateOfBirth: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
    bloodGroup: {
        type: String,
        enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    },
    nationality: String,
    idNumber: {
        type: String,
        unique: true,
        sparse: true,
    },
    profilePhoto: String,

    // Address Information
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
    },

    // Job Information
    employeeId: {
        type: String,
        unique: true,
        required: true,
    },
    biometricId: {
        type: String,
        trim: true,
        sparse: true,
        unique: true,
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: [
            'Administration',
            'HR',
            'Finance',
            'Academic',
            'Support Staff',
            'IT',
            'Maintenance',
            'Security',
            'Transportation',
            'Catering',
        ],
    },
    position: {
        type: String,
        required: [true, 'Position is required'],
    },
    employmentType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Temporary'],
        default: 'Full-time',
    },
    reportingTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee',
        sparse: true,
    },
    dateOfJoining: {
        type: Date,
        required: [true, 'Date of joining is required'],
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'On Leave', 'Suspended'],
        default: 'Active',
    },
    payrollStatus: {
        type: String,
        enum: ['Pending Verification', 'Verified', 'Rejected'],
        default: 'Pending Verification',
    },
    accountsStatus: {
        type: String,
        enum: ['Not Yet Verified', 'Verified', 'Rejected'],
        default: 'Not Yet Verified',
    },
    accountsVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        default: null,
    },
    accountsVerifiedAt: {
        type: Date,
        default: null,
    },
    payrollPeriod: {
        type: String,
        default: () => new Date().toISOString().slice(0, 7),
    },

    // Compensation & Salary
    salary: {
        baseSalary: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: 'KES',
        },
        payFrequency: {
            type: String,
            enum: ['Monthly', 'Bi-weekly', 'Weekly'],
            default: 'Monthly',
        },
        grossSalary: Number,
        netSalary: Number,
    },

    // Bank & Payment Details
    paymentDetails: {
        paymentMethod: {
            type: String,
            enum: ['Bank Transfer', 'Mobile Money', 'Cash', 'Check'],
            default: 'Bank Transfer',
        },
        // Bank Transfer Details
        bankInfo: {
            bankName: String,
            accountNumber: String,
            accountType: {
                type: String,
                enum: ['Checking', 'Savings', 'Business'],
            },
            accountHolderName: String,
            routingNumber: String,
            swiftCode: String,
            ifscCode: String,
            iban: String,
        },
        // Mobile Money Details (for M-Pesa, Airtel Money, etc.)
        mobileMoneyInfo: {
            provider: String, // e.g., "M-Pesa", "Airtel Money"
            phoneNumber: String,
            registeredName: String,
        },
    },

    // Tax Information
    taxInfo: {
        taxNumber: String,
        taxBracket: {
            type: String,
            enum: ['Standard', 'Exempt', 'Special'],
        },
        w9FormUrl: String, // For US employees
        kra11FormUrl: String, // For Kenya employees
    },

    // Deductions & Contributions
    deductions: {
        healthInsurance: Number,
        lifeInsurance: Number,
        pensionContribution: Number,
        unionDues: Number,
        otherDeductions: Number,
        payee: {
            type: Number,
            default: 0,
        },
        nssf: {
            type: Number,
            default: 0,
        },
        nhif: {
            type: Number,
            default: 0,
        },
        housingLevy: {
            type: Number,
            default: 0,
        },
        sha: {
            type: Number,
            default: 0,
        },
    },

    // Allowances
    allowances: {
        houseRent: Number,
        transportAllowance: Number,
        medicalAllowance: Number,
        dearnesAllowance: Number,
        performanceBonus: Number,
        otherAllowances: Number,
    },

    // Payment History
    paymentHistory: [
        {
            paymentDate: Date,
            payrollPeriod: { type: String, default: '' },
            grossAmount: Number,
            netAmount: Number,
            paymentMethod: String,
            referenceNumber: String,
            status: {
                type: String,
                enum: ['Pending', 'Processed', 'Paid', 'Failed', 'Reversed'],
                default: 'Processed',
            },
            approvalStatus: {
                type: String,
                enum: ['Pending', 'Approved', 'Rejected'],
                default: 'Pending',
            },
            approvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'admin',
                default: null,
            },
            approvalDate: {
                type: Date,
                default: null,
            },
            rejectionReason: {
                type: String,
                default: '',
            },
            payslipUrl: String,
        },
    ],

    accountBalance: {
        type: Number,
        default: 0,
    },
    accountLedger: [
        {
            type: {
                type: String,
                enum: ['Debit', 'Credit'],
                required: true,
            },
            amount: {
                type: Number,
                required: true,
            },
            reference: {
                type: String,
                default: '',
            },
            description: {
                type: String,
                required: true,
            },
            relatedEntity: {
                type: String,
                default: '',
            },
            entityId: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'admin',
                default: null,
            },
        }
    ],

    // Payment Preferences
    paymentPreferences: {
        preferredPaymentMethod: String,
        paymentNotificationEmail: String,
        paymentNotificationPhone: String,
        tdsDeductible: Boolean,
    },

    // Emergency Contact
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String,
    },

    // Qualifications
    qualifications: [
        {
            degree: String,
            field: String,
            institution: String,
            graduationYear: Number,
            certificateUrl: String,
        },
    ],

    // Experience
    experience: [
        {
            company: String,
            position: String,
            startDate: Date,
            endDate: Date,
            description: String,
        },
    ],

    // Documents
    documents: [
        {
            documentType: String,
            documentUrl: String,
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],

    // Leave & Attendance
    leaveBalance: {
        annualLeave: {
            type: Number,
            default: 20,
        },
        sickLeave: {
            type: Number,
            default: 10,
        },
        maternityLeave: {
            type: Number,
            default: 0,
        },
        paternityLeave: {
            type: Number,
            default: 0,
        },
        usedLeave: {
            type: Number,
            default: 0,
        },
    },

    // Skills
    skills: [String],

    // Notes & History
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index for unique email per school
employeeSchema.index({ school: 1, email: 1 }, { unique: true });
employeeSchema.index({ school: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('employee', employeeSchema);
