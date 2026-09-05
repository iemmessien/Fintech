# FIN Bank Nova — Digital Banking System

A backend banking system built with Node.js/Express, integrated with **NIBSS by Phoenix** (simulated Nigerian Interbank Settlement System).

---

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Email**: Nodemailer (Gmail)
- **External API**: NIBSS by Phoenix (`https://nibssbyphoenix.onrender.com`)

---

## Project Structure

```
Fintech/
├── config/
│   ├── databaseConfig.js      # MongoDB connection
│   ├── emailConfig.js         # Nodemailer transporter
│   └── nibssService.js        # All NIBSS API calls + token caching
├── controllers/
│   ├── AdminController.js     # NIBSS onboarding, health check
│   ├── AuthController.js      # Customer register, login, profile
│   ├── KycController.js       # BVN/NIN register & validate
│   ├── AccountController.js   # Account creation, balance, name enquiry
│   └── TransactionController.js # Transfer, history, TSQ
├── middleware/
│   ├── authMiddleware.js      # JWT verification
│   └── emailSenderMiddleware.js # Transaction email sender
├── models/
│   ├── CustomerModel.js       # Customer schema
│   ├── AccountModel.js        # Bank account schema
│   └── TransactionModel.js    # Transaction history schema
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── kycRoutes.js
│   ├── accountRoutes.js
│   └── transactionRoutes.js
└── src/
    └── index.js               # Express app entry point
```

---

## API Flow

```
1. POST /api/admin/nibss/onboard    → Get NIBSS credentials (one-time)
2. POST /api/auth/register          → Register as a bank customer
3. POST /api/auth/login             → Get local JWT token
4. POST /api/kyc/bvn/register  OR  → Register BVN or NIN in NIBSS
   POST /api/kyc/nin/register
5. POST /api/account/create         → Create NIBSS bank account
6. GET  /api/account/balance        → Check account balance
7. GET  /api/account/name-enquiry/:accountNumber  → Verify recipient
8. POST /api/transaction/transfer   → Send money
9. GET  /api/transaction/status/:txId → Check transaction status
10. GET /api/transaction/history    → View your transaction history
```

---

## Full API Reference

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/health` | None | Health check |
| POST | `/api/admin/nibss/onboard` | None | Register bank with NIBSS |
| GET | `/api/admin/nibss/token-test` | None | Test NIBSS credentials |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register a new customer |
| POST | `/api/auth/login` | None | Login and get JWT |
| GET | `/api/auth/me` | Bearer | Get own profile |

### KYC (Identity)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/kyc/bvn/register` | Bearer | Register BVN in NIBSS |
| POST | `/api/kyc/bvn/validate` | Bearer | Validate a BVN |
| POST | `/api/kyc/nin/register` | Bearer | Register NIN in NIBSS |
| POST | `/api/kyc/nin/validate` | Bearer | Validate a NIN |

### Account

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/account/create` | Bearer | Create bank account (requires KYC) |
| GET | `/api/account/my-account` | Bearer | Get own account details |
| GET | `/api/account/balance` | Bearer | Get live account balance |
| GET | `/api/account/name-enquiry/:accountNumber` | Bearer | Resolve account to name |
| GET | `/api/account/all` | Bearer | List all bank accounts |

### Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/transaction/transfer` | Bearer | Initiate fund transfer |
| GET | `/api/transaction/history` | Bearer | Own transaction history |
| GET | `/api/transaction/status/:transactionId` | Bearer | TSQ — check tx status |

---

## Sample Request Bodies

### Register Customer
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "phone": "08012345678",
  "dob": "1995-06-15"
}
```

### Register BVN
```json
{
  "bvn": "12345678901",
  "firstName": "John",
  "lastName": "Doe",
  "dob": "1995-06-15",
  "phone": "08012345678"
}
```

### Register NIN
```json
{
  "nin": "12345678901",
  "firstName": "John",
  "lastName": "Doe",
  "dob": "1995-06-15"
}
```

### Create Account
```json
{}
```
*(No body needed — customer's registered KYC and DOB are used automatically)*

### Transfer Funds
```json
{
  "toAccount": "1084071287",
  "amount": 5000,
  "description": "Rent payment"
}
```

---

## Business Rules

1. **One account per customer** — attempting to create a second account returns 409.
2. **KYC before account** — account creation blocked until BVN or NIN is registered in NIBSS.
3. **Pre-funded accounts** — NIBSS credits ₦15,000 on account creation.
4. **Data isolation** — customers can only view their own transactions and account details.
5. **Email notifications** — every successful transfer sends a receipt to the sender's email.
6. **Name enquiry before transfer** — the transfer endpoint automatically performs name enquiry and returns the recipient name in the response.

---

## Notes on NIBSS Integration

- The NIBSS JWT token expires every **1 hour**. `nibssService.js` caches and auto-refreshes it.
- BVN and NIN must be 11-digit numbers.
- Account numbers are 10-digit NUBAN-style numbers auto-generated by NIBSS.
- Transfer `amount` is sent as a string to NIBSS per their API spec.
