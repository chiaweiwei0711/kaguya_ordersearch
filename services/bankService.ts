import { VirtualAccountResponse } from '../types';

// Simulating a connection to CTBC (Chinatrust) API
// In a real app, this would call your backend, which signs requests to the Bank API.

export const generateCTBCVirtualAccount = async (orderId: string, amount: number): Promise<VirtualAccountResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Logic to generate a checksum-valid virtual account (Simulated)
      // Format: 98 + UserCode(4) + OrderHash(8) + Checksum(2)
      const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      
      resolve({
        bankCode: "822", // 中國信託
        accountNumber: `9877${randomPart}00`, // Example VA format
        expireDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Valid for 24 hours
      });
    }, 1500); // Simulate network delay
  });
};

export const checkPaymentReceived = async (accountNumber: string, amount: number): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate instant reconciliation success
      console.log(`Checking bank ledger for VA: ${accountNumber} with amount $${amount}`);
      resolve(true);
    }, 2000);
  });
};