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
