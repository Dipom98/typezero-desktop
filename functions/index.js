const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// IMPORTANT: Replace this with your actual webhook secret from the Razorpay Dashboard
const WEBHOOK_SECRET = "Welcome@788116";

exports.razorpayWebhook = onRequest({ region: "asia-south1" }, async (req, res) => {
    try {
        // Razorpay sends the signature in this header
        const signature = req.headers["x-razorpay-signature"];

        if (!signature) {
            return res.status(400).send("No signature found");
        }

        // Razorpay Webhooks require raw body for signature verification sometimes,
        // but in Firebase v2 HTTP functions, req.rawBody is available.
        // If req.rawBody exists, use it. Otherwise fallback to stringified body.
        const bodyString = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);

        // Verify the webhook signature to know it actually came from Razorpay
        const expectedSignature = crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(bodyString)
            .digest("hex");

        if (expectedSignature !== signature) {
            console.error("Invalid signature. Expected:", expectedSignature, "Got:", signature);
            return res.status(400).send("Invalid signature");
        }

        const event = req.body.event;
        console.log(`Received Webhook Event: ${event}`);

        // Handle the subscription charge success
        if (event === "subscription.charged") {
            const paymentData = req.body.payload.payment.entity;
            const subscriptionData = req.body.payload.subscription.entity;

            const email = paymentData.email;

            // Calculate next billing cycle for grace period checking
            const nextBillingCycleAtTimestamp = subscriptionData.charge_at;
            let expiresAt = new Date();
            if (nextBillingCycleAtTimestamp) {
                expiresAt = new Date(nextBillingCycleAtTimestamp * 1000);
            } else {
                // Fallback: Add 30 days if not present
                expiresAt.setDate(expiresAt.getDate() + 30);
            }

            console.log(`Setting Pro status for user: ${email} valid until ${expiresAt.toISOString()}`);

            // We update the 'users' collection using the email as the document ID
            await db.collection("users").doc(email).set(
                {
                    isPro: true,
                    licenseKey: subscriptionData.id,
                    subscriptionId: subscriptionData.id,
                    expiresAt: expiresAt.toISOString(),
                    lastVerifiedAt: new Date().toISOString(),
                },
                { merge: true } // Merge true ensures we don't accidentally delete other user data
            );

            console.log(`Successfully updated ${email} to Pro.`);
        }

        // Handle subscription pauses or cancellations to revoke access instantly
        if (event === "subscription.halted" || event === "subscription.cancelled") {
            const subscriptionData = req.body.payload.subscription.entity;
            // Unfortunately, halted/cancelled webhooks don't always contain the email in the top entity.
            // We'll search for the user by subscriptionId instead.
            const usersRef = db.collection("users");
            const snapshot = await usersRef.where("subscriptionId", "==", subscriptionData.id).get();

            if (!snapshot.empty) {
                snapshot.forEach(async (doc) => {
                    await usersRef.doc(doc.id).set({
                        isPro: false
                    }, { merge: true });
                    console.log(`Revoked Pro status for ${doc.id} due to ${event}`);
                });
            }
        }

        return res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook processing error:", error);
        return res.status(500).send("Internal Server Error");
    }
});
