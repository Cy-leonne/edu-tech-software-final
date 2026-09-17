# M-Pesa STK Push Payment Integration Setup

## Overview
Parents can now pay school fees directly through the portal using M-Pesa STK Push, which sends a payment prompt to their phone where they enter their PIN.

## Configuration Required

Add these environment variables to your backend `.env` file:

```env
# M-Pesa Configuration
MPESA_BASE_URL=https://sandbox.safaricom.co.ke  # Use sandbox for testing, production URL for live
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORTCODE=174379  # Test shortcode, use your actual shortcode for production
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2c0c9d4d311fc90d4f7d60d5f670d123  # Test passkey, use your actual passkey
MPESA_CALLBACK_URL=http://localhost:5000/Payment/MpesaCallback  # Or your production URL
```

## How to Get M-Pesa Credentials

1. **For Testing (Sandbox)**:
   - Visit: https://developer.safaricom.co.ke
   - Register and create an app
   - The sandbox credentials will be provided automatically
   - Test shortcode: 174379

2. **For Production**:
   - Contact Safaricom Business
   - Register as a Paybill merchant
   - Get your actual Business Shortcode and API credentials
   - Update environment variables and callback URL

## API Endpoints Created

### 1. Initiate STK Push
```
POST /Parent/PayFeeStk/:studentId
Headers: 
  - Content-Type: application/json
Body: {
  "amount": 1000,
  "phoneNumber": "254712345678",
  "parentEmail": "parent@example.com"
}
Response: {
  "message": "STK push initiated successfully...",
  "checkoutRequestId": "ws_CO_DMZ_xxx",
  "receiptNumber": "STK-ADM123-xxx"
}
```

### 2. Check STK Push Status
```
POST /Parent/CheckStkStatus
Body: {
  "checkoutRequestId": "ws_CO_DMZ_xxx",
  "studentId": "student_id"
}
Response: {
  "message": "Payment successful",
  "paymentStatus": "Completed",
  "amountPaid": 5000,
  "balance": 15000,
  "receiptNumber": "STK-ADM123-xxx"
}
```

### 3. M-Pesa Callback
```
POST /Payment/MpesaCallback
(Automatically called by M-Pesa after payment)
```

## Frontend Features

### Pay Fee Page (Enhanced)
- **Two payment tabs**:
  1. **Quick Pay (STK Push)**: 
     - Enter amount
     - Enter M-Pesa phone number
     - System sends payment prompt to phone
     - Parent enters PIN
     - Payment automatically confirmed
  
  2. **Manual Entry**: 
     - For non-M-Pesa payments
     - Paybill, Card, Bank Transfer, Cash
     - Requires manual transaction entry

### Payment Flow
1. Parent enters amount and phone number
2. Click "Send Payment Prompt"
3. STK dialog shows "Enter your M-Pesa PIN on your phone"
4. Frontend polls payment status every 1 second
5. Upon successful payment:
   - Student record updated
   - localStorage refreshed
   - Success message displayed
   - Automatic redirect to dashboard

## Payment Statuses

- **Pending**: Payment initiated, waiting for user to enter PIN
- **Completed**: Payment successful, funds received
- **Cancelled**: User rejected payment prompt (Result Code 1032)
- **Failed**: Payment failed for other reason

## Database Updates

Payment records include:
- `checkoutRequestId`: M-Pesa checkout ID for tracking
- `mpesaReceiptNumber`: M-Pesa receipt from callback
- `transactionDate`: Date/time of M-Pesa transaction
- `balanceAfter`: Student balance after payment

## Testing

### Sandbox Credentials
- Business Shortcode: 174379
- Phone: 254712345678 or 254700000000
- Test Amount: Any amount (will not be charged)

### Test Flow
1. Visit Parent Dashboard
2. Click "Pay Fee"
3. Select "Quick Pay (STK Push)" tab
4. Enter amount (e.g., 1000)
5. Enter test phone: 254712345678
6. Click "Send Payment Prompt"
7. In real scenario, user would receive STK prompt
8. Sandbox auto-completes after 5-10 seconds

## Callback Verification

For production, implement signature verification:
```javascript
// In mpesaService.js validateCallback function
// Verify the signature from Safaricom to ensure authenticity
```

## Error Handling

- Network timeouts: 30-second polling limit
- Invalid phone numbers: Format validation
- Amount exceeds balance: Block submission
- Failed STK initiation: Display M-Pesa error message
- User cancellation: Allow retry

## Next Steps

1. Set up M-Pesa developer account
2. Get sandbox credentials
3. Add environment variables to .env
4. Test with sandbox endpoints
5. Move to production credentials when ready