
const mongoose = require("mongoose");

const reportSettingsSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'school',
        required: true,
        unique: true,
    },
    
    // Report Templates
    reportTemplates: [
        {
            id: {
                type: String,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            description: String,
            type: {
                type: String,
                enum: ['attendance', 'performance', 'financial', 'student_progress', 'staff', 'custom'],
                required: true,
            },
            fields: [String], // Customizable fields
            format: {
                type: String,
                enum: ['pdf', 'excel', 'csv', 'json'],
                default: 'pdf',
            },
            isDefault: {
                type: Boolean,
                default: false,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }
    ],
    
    // PDF Export Settings
    pdfExport: {
        defaultOrientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait',
        },
        defaultPageSize: {
            type: String,
            enum: ['A4', 'A3', 'Letter', 'Legal'],
            default: 'A4',
        },
        includeWatermark: {
            type: Boolean,
            default: true,
        },
        includeFooter: {
            type: Boolean,
            default: true,
        },
        footerText: String,
        includeHeader: {
            type: Boolean,
            default: true,
        },
        headerText: String,
        includePageNumbers: {
            type: Boolean,
            default: true,
        },
        logoInPDF: {
            type: Boolean,
            default: true,
        },
        fontSize: {
            type: Number,
            default: 11,
            min: 8,
            max: 16,
        },
    },
    
    // Email Report Scheduling
    scheduledReports: [
        {
            id: {
                type: String,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            reportTemplateId: String,
            enabled: {
                type: Boolean,
                default: true,
            },
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
                required: true,
            },
            dayOfWeek: Number, // 0-6 for weekly
            dayOfMonth: Number, // 1-31 for monthly
            time: {
                type: String,
                required: true, // HH:MM format
            },
            recipients: [
                {
                    email: String,
                    role: {
                        type: String,
                        enum: ['admin', 'teacher', 'parent', 'student'],
                    },
                }
            ],
            filters: {
                class: [String],
                department: [String],
                section: [String],
            },
            lastRunAt: Date,
            nextRunAt: Date,
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }
    ],
    
    // Report Generation Settings
    reportGeneration: {
        includeCharts: {
            type: Boolean,
            default: true,
        },
        includeGraphs: {
            type: Boolean,
            default: true,
        },
        includeSummary: {
            type: Boolean,
            default: true,
        },
        includeDetailedBreakdown: {
            type: Boolean,
            default: true,
        },
        maxRecordsPerReport: {
            type: Number,
            default: 10000,
            min: 100,
            max: 1000000,
        },
    },
    
    // Data Export Settings
    dataExport: {
        enableExcelExport: {
            type: Boolean,
            default: true,
        },
        enableCSVExport: {
            type: Boolean,
            default: true,
        },
        enableJSONExport: {
            type: Boolean,
            default: true,
        },
        enableXMLExport: {
            type: Boolean,
            default: false,
        },
        includeTimestamp: {
            type: Boolean,
            default: true,
        },
    },
    
    // Report Delivery Settings
    reportDelivery: {
        sendImmediatelyAfterGeneration: {
            type: Boolean,
            default: false,
        },
        enableCloudStorage: {
            type: Boolean,
            default: false,
        },
        cloudProvider: {
            type: String,
            enum: ['AWS_S3', 'Google_Cloud', 'Azure_Blob', 'Dropbox'],
        },
        retainReportsForDays: {
            type: Number,
            default: 90,
            min: 30,
            max: 3650,
        },
    },
    
    // Custom Report Settings
    customReports: {
        allowCustomReports: {
            type: Boolean,
            default: true,
        },
        maxCustomReportsPerAdmin: {
            type: Number,
            default: 10,
        },
        allowPublicSharing: {
            type: Boolean,
            default: false,
        },
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
    },
});

module.exports = mongoose.model('reportSettings', reportSettingsSchema);
