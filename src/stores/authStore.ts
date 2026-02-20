import { create } from "zustand";
import { persist } from "zustand/middleware";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AuthState {
    isPro: boolean;
    userEmail: string | null;
    licenseKey: string | null;
    lastVerifiedAt: string | null;
    dailyUsage: {
        dictationSeconds: number;
        ttsCharacters: number;
        lastResetDate: string;
    };

    // Actions
    setPro: (status: boolean) => void;
    setUser: (email: string | null) => void;
    setLicense: (key: string | null) => void;
    validateLicense: (email: string) => Promise<boolean>;
    isLicenseValid: () => boolean;
    incrementDictation: (seconds: number) => void;
    incrementTts: (chars: number) => void;
    checkAndResetDaily: () => void;
    validateFallbackLicense: (email: string, licenseKey: string) => Promise<boolean>;
}

const DAILY_LIMITS = {
    FREE_DICTATION_SECONDS: 300, // 5 minutes
    FREE_TTS_CHARS: 1000,
};

const GRACE_PERIOD_DAYS = 7;

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isPro: false,
            userEmail: null,
            licenseKey: null,
            lastVerifiedAt: null,
            dailyUsage: {
                dictationSeconds: 0,
                ttsCharacters: 0,
                lastResetDate: new Date().toISOString().split("T")[0],
            },

            setPro: (status) => set({ isPro: status }),
            setUser: (email) => set({ userEmail: email }),
            setLicense: (key) => set({ licenseKey: key }),

            validateLicense: async (email: string) => {
                try {
                    // Force lowercase to ensure we match the document ID in Firestore exactly
                    const normalizedEmail = email.toLowerCase();
                    // Check Firestore for the user document (document ID is the email)
                    const userDocRef = doc(db, "users", normalizedEmail);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();

                        if (userData.isPro) {
                            // Check expiration if it exists
                            if (userData.expiresAt) {
                                const expiresAt = new Date(userData.expiresAt);
                                const now = new Date();
                                if (now > expiresAt) {
                                    // Subscription has expired
                                    console.log("Subscription expired on", expiresAt);
                                    set({ isPro: false });
                                    return false;
                                }
                            }

                            // User is valid Pro
                            set({
                                isPro: true,
                                licenseKey: userData.licenseKey || null,
                                userEmail: email,
                                lastVerifiedAt: new Date().toISOString()
                            });
                            return true;
                        }
                    } else {
                        // User document doesn't exist, create a basic free record
                        await setDoc(userDocRef, {
                            email: email,
                            isPro: false,
                            createdAt: new Date().toISOString()
                        }, { merge: true });
                    }

                    // Not a Pro user
                    set({ isPro: false, userEmail: email });
                    return false;
                } catch (error) {
                    console.error("Error validating license:", error);
                    return false;
                }
            },

            validateFallbackLicense: async (email: string, licenseKeyParam: string) => {
                try {
                    const normalizedEmail = email.toLowerCase();
                    const trimmedKey = licenseKeyParam.trim();
                    const userDocRef = doc(db, "users", normalizedEmail);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();

                        // Check if the provided license matches the one in DB
                        if ((userData.licenseKey === trimmedKey) || (userData.lemonSqueezyLicenseKey === trimmedKey) || (userData.subscriptionId === trimmedKey) || (userData.razorpaySubscriptionId === trimmedKey) || (userData.stripeSubscriptionId === trimmedKey)) {
                            // Valid license!
                            // Check expiration if it exists
                            if (userData.expiresAt) {
                                const expiresAt = new Date(userData.expiresAt);
                                const now = new Date();
                                if (now > expiresAt) {
                                    console.log("Subscription expired on", expiresAt);
                                    set({ isPro: false });
                                    return false; // Revoked!
                                }
                            }

                            set({
                                isPro: true,
                                licenseKey: trimmedKey,
                                userEmail: email,
                                lastVerifiedAt: new Date().toISOString()
                            });

                            // Auto-heal the document
                            await setDoc(userDocRef, { isPro: true, licenseKey: trimmedKey }, { merge: true });
                            return true;
                        }
                    }

                    // If we want to check a 'licenses' collection or similar:
                    try {
                        const { collection, query, where, getDocs } = await import("firebase/firestore");
                        const licensesRef = collection(db, "licenses");
                        // check matching license key and email
                        const q = query(licensesRef, where("key", "==", trimmedKey), where("email", "==", normalizedEmail));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            // Check expiration here if needed for the license doc itself
                            const licenseData = querySnapshot.docs[0].data();
                            if (licenseData.status === "cancelled" || licenseData.status === "expired") {
                                return false;
                            }

                            set({
                                isPro: true,
                                licenseKey: trimmedKey,
                                userEmail: email,
                                lastVerifiedAt: new Date().toISOString()
                            });
                            await setDoc(userDocRef, { isPro: true, licenseKey: trimmedKey, email: normalizedEmail }, { merge: true });
                            return true;
                        }
                    } catch (e) {
                        console.error("Error checking licenses collection", e);
                    }

                    return false;
                } catch (error) {
                    console.error("Error validating fallback license:", error);
                    return false;
                }
            },

            isLicenseValid: () => {
                const { isPro, lastVerifiedAt } = get();
                if (!isPro) return false;
                if (!lastVerifiedAt) return true; // Legacy Pro status

                const lastVerified = new Date(lastVerifiedAt);
                const now = new Date();
                const diffDays = (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);

                return diffDays <= GRACE_PERIOD_DAYS;
            },

            incrementDictation: (seconds) => {
                const { dailyUsage } = get();
                set({
                    dailyUsage: {
                        ...dailyUsage,
                        dictationSeconds: dailyUsage.dictationSeconds + seconds,
                    },
                });
            },

            incrementTts: (chars) => {
                const { dailyUsage } = get();
                set({
                    dailyUsage: {
                        ...dailyUsage,
                        ttsCharacters: dailyUsage.ttsCharacters + chars,
                    },
                });
            },

            checkAndResetDaily: () => {
                const today = new Date().toISOString().split("T")[0];
                const { dailyUsage } = get();
                if (dailyUsage.lastResetDate !== today) {
                    set({
                        dailyUsage: {
                            dictationSeconds: 0,
                            ttsCharacters: 0,
                            lastResetDate: today,
                        },
                    });
                }
            },
        }),
        {
            name: "typezero-auth-storage",
        }
    )
);
