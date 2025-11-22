import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generatePaymentSuccessMessage = async (order: Order): Promise<string> => {
  if (!apiKey) {
    return "付款成功！感謝您的購買，我們會盡快為您出貨。";
  }

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
    // Mock function to show AI usage potential - categorizes user intent
    // Not strictly used in the main flow but demonstrates capability
    if(!apiKey) return "Unknown";
    
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