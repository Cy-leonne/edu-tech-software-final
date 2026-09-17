// SMS Notification Service using Twilio or Africast
// Install: npm install twilio dotenv

// Validate phone number format (E.164 format: +countrycode...)
const validatePhoneNumber = (phoneNumber) => {
    // Accept +254... or 0... format for Kenya
    const e164Regex = /^\+?([0-9]{1,3})[0-9]{6,14}$/;
    if (!e164Regex.test(phoneNumber.replace(/[\s-]/g, ''))) {
        console.warn(`[SMS] Invalid phone number format: ${phoneNumber}`);
        return false;
    }
    return true;
};

// Normalize phone number to E.164 format
const normalizePhoneNumber = (phoneNumber) => {
    let normalized = phoneNumber.replace(/[\s-()]/g, '');
    // Handle Kenya phone numbers (254 country code)
    if (normalized.startsWith('0')) {
        normalized = '254' + normalized.substring(1);
    }
    if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
    }
    return normalized;
};

const sendSMS = async (phoneNumber, message) => {
    try {
        if (!phoneNumber || !message) {
            console.warn('[SMS] Phone or message is empty');
            return { success: false, error: 'Phone or message is empty' };
        }

        if (!validatePhoneNumber(phoneNumber)) {
            return { success: false, error: 'Invalid phone number format' };
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const smsProvider = process.env.SMS_PROVIDER || 'twilio'; // twilio, africast, or demo
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        const africastApiKey = process.env.AFRICAST_API_KEY;
        const africastUsername = process.env.AFRICAST_USERNAME;

        // Twilio SMS
        if (smsProvider === 'twilio' && twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
            try {
                const twilio = require('twilio');
                const client = twilio(twilioAccountSid, twilioAuthToken);

                const result = await client.messages.create({
                    body: message,
                    from: twilioPhoneNumber,
                    to: normalizedPhone
                });

                console.log(`[SMS] Twilio sent to ${normalizedPhone}: ${result.sid}`);
                return { success: true, provider: 'twilio', messageId: result.sid };
            } catch (error) {
                console.error(`[SMS] Twilio error: ${error.message}`);
                // Fall through to other providers or demo mode
            }
        }

        // Africast SMS (popular in East Africa)
        if (smsProvider === 'africast' && africastApiKey && africastUsername) {
            try {
                const axios = require('axios');
                const response = await axios.post('https://api.africast.com/api/sms/send', {
                    username: africastUsername,
                    api_key: africastApiKey,
                    destination: normalizedPhone,
                    message: message,
                    senderid: process.env.AFRICAST_SENDER_ID || 'SchoolMgmt'
                }, { timeout: 10000 });

                if (response.data.status === 'success') {
                    console.log(`[SMS] Africast sent to ${normalizedPhone}: ${response.data.message_id}`);
                    return { success: true, provider: 'africast', messageId: response.data.message_id };
                }
            } catch (error) {
                console.error(`[SMS] Africast error: ${error.message}`);
                // Fall through to demo mode
            }
        }

        // Demo/Log mode
        console.log(`\n[SMS DEMO] To: ${normalizedPhone}`);
        console.log(`[SMS DEMO] Message: ${message}`);
        console.log(`[SMS DEMO] Configure SMS_PROVIDER in .env (twilio/africast) for real SMS\n`);
        return { success: true, demo: true, message: 'SMS logged (configure SMS provider for real delivery)' };

    } catch (error) {
        console.error('[SMS ERROR]', error.message);
        return { success: false, error: error.message };
    }
};

const sendFeeConfirmationToParent = async (studentName, parentPhone, amount, balance, receiptNumber, paybillCode) => {
    const message = `Dear Parent, ${studentName} has paid KES ${amount}. Balance: KES ${balance}. Receipt: ${receiptNumber}. Thank you!`;
    return await sendSMS(parentPhone, message);
};

const sendPaymentReminderToParent = async (studentName, parentPhone, totalFees, balance, paybillCode) => {
    const message = `Fee Reminder: ${studentName} owes KES ${balance} out of KES ${totalFees}. Paybill: ${paybillCode}. Account: ${studentName}. Please pay soon. Thank you!`;
    return await sendSMS(parentPhone, message);
};

module.exports = {
    sendSMS,
    sendFeeConfirmationToParent,
    sendPaymentReminderToParent
};