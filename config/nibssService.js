// config/nibssService.js
// Centralized service for all NIBSS by Phoenix API interactions

import axios from 'axios';

const NIBSS_BASE_URL = process.env.NIBSS_BASE_URL || 'https://nibssbyphoenix.onrender.com';

// In-memory token cache (refreshed when expired)
let nibssTokenCache = {
   token: null,
   expiresAt: null
};

/**
 * Get a valid NIBSS JWT token, refreshing if expired or missing
 */
export const getNibssToken = async () => {
   const now = Date.now();

   // Return cached token if still valid (with 60s buffer)
   if (nibssTokenCache.token && nibssTokenCache.expiresAt && now < nibssTokenCache.expiresAt - 60000) {
      return nibssTokenCache.token;
   }

   const apiKey = process.env.NIBSS_API_KEY;
   const apiSecret = process.env.NIBSS_API_SECRET;

   if (!apiKey || !apiSecret) {
      throw new Error('NIBSS API credentials not configured. Please run fintech onboarding first.');
   }

   try {
      const response = await axios.post(`${NIBSS_BASE_URL}/api/auth/token`, {
         apiKey,
         apiSecret
      });

      const { token } = response.data;
      nibssTokenCache.token = token;
      // Token expires in 1 hour (3600s); cache for 3600s
      nibssTokenCache.expiresAt = now + 3600 * 1000;

      return token;
   } catch (error) {
      const msg = error.response?.data?.message || error.message;
      throw new Error(`Failed to obtain NIBSS token: ${msg}`);
   }
};

/**
 * Get Axios headers with Bearer token for protected NIBSS endpoints
 */
const getAuthHeaders = async () => {
   const token = await getNibssToken();
   return { Authorization: `Bearer ${token}` };
};

// ─── Fintech Onboarding ────────────────────────────────────────────────────

export const nibssOnboard = async (name, email) => {
   const response = await axios.post(`${NIBSS_BASE_URL}/api/fintech/onboard`, { name, email });
   return response.data;
};

// ─── BVN Operations ────────────────────────────────────────────────────────

export const nibssInsertBvn = async ({ bvn, firstName, lastName, dob, phone }) => {
   const headers = await getAuthHeaders();
   const response = await axios.post(
      `${NIBSS_BASE_URL}/api/insertBvn`,
      { bvn, firstName, lastName, dob, phone },
      { headers }
   );
   return response.data;
};

export const nibssValidateBvn = async (bvn) => {
   const headers = await getAuthHeaders();
   const response = await axios.post(
      `${NIBSS_BASE_URL}/api/validateBvn`,
      { bvn },
      { headers }
   );
   return response.data;
};

// ─── NIN Operations ────────────────────────────────────────────────────────

export const nibssInsertNin = async ({ nin, firstName, lastName, dob }) => {
   const headers = await getAuthHeaders();
   const response = await axios.post(
      `${NIBSS_BASE_URL}/api/insertNin`,
      { nin, firstName, lastName, dob },
      { headers }
   );
   return response.data;
};

export const nibssValidateNin = async (nin) => {
   const headers = await getAuthHeaders();
   const response = await axios.post(
      `${NIBSS_BASE_URL}/api/validateNin`,
      { nin },
      { headers }
   );
   return response.data;
};

// ─── Account Operations ────────────────────────────────────────────────────

export const nibssCreateAccount = async ({ kycType, kycID, dob }) => {
   const headers = await getAuthHeaders();
   const response = await axios.post(
      `${NIBSS_BASE_URL}/api/account/create`,
      { kycType, kycID, dob },
      { headers }
   );
   return response.data;
};

export const nibssNameEnquiry = async (accountNumber) => {
   const headers = await getAuthHeaders();
   const response = await axios.get(
      `${NIBSS_BASE_URL}/api/account/nameenquiry/${accountNumber}`,
      { headers }
   );
   return response.data;
};

export const nibssGetAllAccounts = async () => {
   const headers = await getAuthHeaders();
   const response = await axios.get(`${NIBSS_BASE_URL}/api/accounts`, { headers });
   return response.data;
};

export const nibssGetBalance = async (accountNumber) => {
   const headers = await getAuthHeaders();
   const response = await axios.get(
      `${NIBSS_BASE_URL}/api/account/balance/${accountNumber}`,
      { headers }
   );
   return response.data;
};

// ─── Transfer & Transactions ───────────────────────────────────────────────

export const nibssTransfer = async ({ from, to, amount }) => {
   const headers = await getAuthHeaders();
   const response = await axios.post(
      `${NIBSS_BASE_URL}/api/transfer`,
      { from, to, amount },
      { headers }
   );
   return response.data;
};

export const nibssGetTransaction = async (transactionId) => {
   const headers = await getAuthHeaders();
   const response = await axios.get(
      `${NIBSS_BASE_URL}/api/transaction/${transactionId}`,
      { headers }
   );
   return response.data;
};
