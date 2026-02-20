export type PaymentProviderType = "stripe" | "razorpay" | "paddle";

export interface PaymentProduct {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: "monthly" | "yearly";
}

export interface CheckoutSession {
    id: string;
    url: string;
}

export interface PaymentService {
    createCheckoutSession(productId: string): Promise<CheckoutSession>;
    getProStatus(email: string): Promise<{ isPro: boolean; expiry: string | null }>;
}

/**
 * Mock implementation of a payment service.
 * In production, this would communicate with our backend.
 */
export const MockPaymentService: PaymentService = {
    async createCheckoutSession(productId: string): Promise<CheckoutSession> {
        console.log(`Creating checkout session for product: ${productId}`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            id: `sess_${Math.random().toString(36).substr(2, 9)}`,
            url: "https://typezero.app/checkout/mock"
        };
    },

    async getProStatus(email: string): Promise<{ isPro: boolean; expiry: string | null }> {
        console.log(`Checking Pro status for: ${email}`);
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
            isPro: email.endsWith("@pro.id"), // Simple mock rule
            expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
    }
};
