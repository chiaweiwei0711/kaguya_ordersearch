import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assumes process.env.API_KEY is pre-configured and valid.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePaymentSuccessMessage = async (order: Order): Promise<string> => {
  try {
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the sentiment/intent of this customer query: "${query}". Return one word: Urgent, Inquiry, or Complaint.`
        });
        return response.text || "Inquiry";
    } catch (e) {
        return "Inquiry";
    }
}