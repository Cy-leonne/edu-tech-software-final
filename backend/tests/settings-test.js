#!/usr/bin/env node

/**
 * Settings Integration Test Script
 * Tests all school settings endpoints and functionality
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

// Sample test data - replace with actual admin/school IDs from your system
const TEST_CONFIG = {
    adminId: 'replace_with_actual_admin_id', // x-admin-id header
    schoolId: 'replace_with_actual_school_id', // :schoolId param
};

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, endpoint, data = null, headers = {}) {
    try {
        log(`\n▶ Testing: ${name}`, 'cyan');
        
        const defaultHeaders = {
            'x-admin-id': TEST_CONFIG.adminId,
            'Content-Type': 'application/json',
            ...headers,
        };

        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: defaultHeaders,
            ...(data && { data }),
        };

        const response = await axios(config);
        
        log(`✓ ${name} - SUCCESS`, 'green');
        log(`  Status: ${response.status}`, 'green');
        log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'green');
        
        return { success: true, data: response.data };
    } catch (error) {
        log(`✗ ${name} - FAILED`, 'red');
        if (error.response) {
            log(`  Status: ${error.response.status}`, 'red');
            log(`  Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
        } else {
            log(`  Error: ${error.message}`, 'red');
        }
        return { success: false, error: error.message };
    }
}

async function runTests() {
    log('\n═══════════════════════════════════════════════════════════', 'blue');
    log('SCHOOL SETTINGS INTEGRATION TEST SUITE', 'blue');
    log('═══════════════════════════════════════════════════════════\n', 'blue');

    // Test data for settings update
    const settingsTestData = {
        branding: {
            schoolName: 'ABC High School',
            schoolTagline: 'Excellence in Education',
            schoolLogo: 'https://example.com/logo.png',
            primaryColor: '#1976D2',
            secondaryColor: '#424242',
            accentColor: '#FF9800',
        },
        emailSettings: {
            emailProvider: 'Gmail',
            senderEmail: 'accounts@abcschool.ac.ke',
            senderName: 'ABC School',
            emailPassword: 'encrypted_password_here',
            emailAPIKey: 'encrypted_api_key_here',
        },
        smsSettings: {
            enabled: true,
            smsProvider: 'Africa_Talking',
            senderID: 'ABCSchool',
            apiKey: 'encrypted_api_key_here',
            apiSecret: 'encrypted_secret_here',
        },
        mpesaSettings: {
            enabled: true,
            businessShortCode: '522533',
            businessTillNumber: '1234567',
            accountNumberFormat: 'Student Admission Number',
            consumerKey: 'encrypted_consumer_key',
            consumerSecret: 'encrypted_consumer_secret',
            passkey: 'encrypted_passkey',
            environment: 'sandbox',
        },
        fileUpload: {
            maxSizeInMB: 50,
            maxStudentPhotoBytesInMB: 5,
            storageQuotaInGB: 100,
            allowedFileTypes: ['pdf', 'doc', 'docx', 'xlsx', 'jpg', 'jpeg', 'png'],
        },
        notificationSettings: {
            enableEmailNotifications: true,
            enableSMSNotifications: true,
            enableInAppNotifications: true,
        },
        timezone: 'Africa/Nairobi',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24H',
        language: 'en',
    };

    const results = {
        passed: 0,
        failed: 0,
        tests: [],
    };

    // Test 1: GET Settings
    log('\n📋 TEST GROUP 1: Retrieve Settings', 'yellow');
    let getResult = await testEndpoint(
        'Get School Settings',
        'GET',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`
    );
    results.tests.push(getResult);
    if (getResult.success) results.passed++; else results.failed++;

    // Test 2: Update Settings - Branding
    log('\n📋 TEST GROUP 2: Update Branding Settings', 'yellow');
    let brandingResult = await testEndpoint(
        'Update Branding (School Name, Logo, Colors)',
        'PUT',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        { branding: settingsTestData.branding }
    );
    results.tests.push(brandingResult);
    if (brandingResult.success) results.passed++; else results.failed++;

    // Test 3: Update Settings - Email
    log('\n📋 TEST GROUP 3: Update Email Settings', 'yellow');
    let emailResult = await testEndpoint(
        'Update Email Configuration (Provider, Sender, Password)',
        'PUT',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        { emailSettings: settingsTestData.emailSettings }
    );
    results.tests.push(emailResult);
    if (emailResult.success) results.passed++; else results.failed++;

    // Test 4: Update Settings - SMS
    log('\n📋 TEST GROUP 4: Update SMS Settings', 'yellow');
    let smsResult = await testEndpoint(
        'Update SMS Configuration (Provider, Sender ID, API Keys)',
        'PUT',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        { smsSettings: settingsTestData.smsSettings }
    );
    results.tests.push(smsResult);
    if (smsResult.success) results.passed++; else results.failed++;

    // Test 5: Update Settings - M-Pesa
    log('\n📋 TEST GROUP 5: Update M-Pesa Settings', 'yellow');
    let mpesaResult = await testEndpoint(
        'Update M-Pesa Configuration (Paybill, Till, Consumer Keys, Passkey)',
        'PUT',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        { mpesaSettings: settingsTestData.mpesaSettings }
    );
    results.tests.push(mpesaResult);
    if (mpesaResult.success) results.passed++; else results.failed++;

    // Test 6: Update Settings - File Upload
    log('\n📋 TEST GROUP 6: Update File Upload Settings', 'yellow');
    let fileUploadResult = await testEndpoint(
        'Update File Upload (Max Size, Photo Size, Storage Quota)',
        'PUT',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        { fileUpload: settingsTestData.fileUpload }
    );
    results.tests.push(fileUploadResult);
    if (fileUploadResult.success) results.passed++; else results.failed++;

    // Test 8: Update Settings - Notifications
    log('\n📋 TEST GROUP 8: Update Notification Settings', 'yellow');
    let notificationsResult = await testEndpoint(
        'Update Notifications (Email, SMS, In-App toggles)',
        'PUT',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        { notificationSettings: settingsTestData.notificationSettings }
    );
    results.tests.push(notificationsResult);
    if (notificationsResult.success) results.passed++; else results.failed++;

    // Test 9: Update Settings - Regional
    log('\n📋 TEST GROUP 9: Update Regional Settings', 'yellow');
    let regionalResult = await testEndpoint(
        'Update Regional (Timezone, Date Format, Time Format, Language)',
        'PUT',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        {
            timezone: settingsTestData.timezone,
            dateFormat: settingsTestData.dateFormat,
            timeFormat: settingsTestData.timeFormat,
            language: settingsTestData.language,
        }
    );
    results.tests.push(regionalResult);
    if (regionalResult.success) results.passed++; else results.failed++;

    // Test 10: Update All Settings at Once (Comprehensive Test)
    log('\n📋 TEST GROUP 10: Comprehensive Settings Update (All Fields)', 'yellow');
    let comprehensiveResult = await testEndpoint(
        'Update All Settings Simultaneously',
        'PUT',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        settingsTestData
    );
    results.tests.push(comprehensiveResult);
    if (comprehensiveResult.success) results.passed++; else results.failed++;

    // Test 11: Verify Settings Persistence
    log('\n📋 TEST GROUP 11: Verify Settings Persistence', 'yellow');
    let verifyResult = await testEndpoint(
        'Retrieve Settings to Verify Persistence',
        'GET',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`
    );
    results.tests.push(verifyResult);
    if (verifyResult.success) results.passed++; else results.failed++;

    // Test 12: Error Handling - Missing Admin ID
    log('\n📋 TEST GROUP 12: Error Handling Tests', 'yellow');
    let errorResult = await testEndpoint(
        'Missing Admin ID (Should Fail)',
        'GET',
        `/Admin/Settings/${TEST_CONFIG.schoolId}`,
        null,
        { 'x-admin-id': '' }
    );
    results.tests.push(errorResult);
    if (!errorResult.success) results.passed++; else results.failed++;

    // Summary Report
    log('\n═══════════════════════════════════════════════════════════', 'blue');
    log('TEST SUMMARY REPORT', 'blue');
    log('═══════════════════════════════════════════════════════════\n', 'blue');

    log(`Total Tests: ${results.tests.length}`, 'cyan');
    log(`✓ Passed: ${results.passed}`, 'green');
    log(`✗ Failed: ${results.failed}`, 'red');
    log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(2)}%\n`, 
        results.failed === 0 ? 'green' : 'yellow');

    if (results.failed === 0) {
        log('🎉 ALL TESTS PASSED! Settings system is working properly.', 'green');
    } else {
        log(`⚠️  ${results.failed} test(s) failed. Please review the errors above.`, 'red');
    }

    log('\n═══════════════════════════════════════════════════════════\n', 'blue');
}

// Run the tests
runTests().catch(error => {
    log(`\n🔴 Fatal Error: ${error.message}`, 'red');
    log('\nMake sure:');
    log('1. Backend server is running on http://localhost:5000');
    log('2. MongoDB is connected');
    log('3. TEST_CONFIG.adminId and TEST_CONFIG.schoolId are correctly set', 'yellow');
    process.exit(1);
});