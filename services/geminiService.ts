import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

// FIX: Use import.meta.env for Vite (Frontend) instead of process.env
// process.env causes "ReferenceError: process is not defined" (White Screen) in browsers.
// In Netlify, set the environment variable as "VITE_API_KEY"
const apiKey = import.meta.env.VITE_API_KEY || "";

const ai = new GoogleGenAI({ apiKey: apiKey });

export const generatePaymentSuccessMessage = async (order: Order): Promise<string> => {
  try {
    // Safety check to prevent crashing if API key is missing
    if (!apiKey) return "付款確認成功！我們會盡快安排出貨。";

    const itemsList = order.items.map(item => `${item.name} x${item.quantity}`).join(', ');
    
    const prompt = `
      Customer Name: ${order.customerName}
      Items Purchased: ${itemsList}
      Amount Paid: NT$${order.depositAmount}
      
      Write a warm, professional, and short "Payment Received" message in Traditional Chinese (Taiwanese style) for a Daigou (purchasing agent) service.
      Mention the specific items to reassure them.
      Tell them the reconciliation is complete and shipment is being prepared.
      Add a cute emoji.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "付款確認成功！我們會盡快安排出貨。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "付款成功！感謝您的購買，我們會盡快為您出貨。";
  }
};

export const analyzeCustomerSentiment = async (query: string): Promise<string> => {
    try {
        if (!apiKey) return "Inquiry";
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the sentiment/intent of this customer query: "${query}". Return one word: Urgent, Inquiry, or Complaint.`
        });
        return response.text || "Inquiry";
    } catch (e) {
        return "Inquiry";
    }
}