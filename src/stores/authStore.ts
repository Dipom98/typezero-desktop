import { create } from "zustand";
import { persist } from "zustand/middleware";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

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
    initializeAuth: () => Promise<void>;
}

const DAILY_LIMITS = {
    FREE_DICTATION_SECONDS: 400, // ~1000 words at avg speaking speed
    FREE_TTS_CHARS: 1500,
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

            initializeAuth: async () => {
                const { signInAnonymously } = await import("firebase/auth");
                try {
                    if (!auth.currentUser) {
                        await signInAnonymously(auth);
                        console.log("✅ Firebase Anonymous Auth Initialized");
                    }
                } catch (error) {
                    console.error("❌ Firebase Auth initialization failed:", error);
                }
            },

            validateLicense: async (email: string) => {
                try {
                    // Enforce real Firebase Auth
                    const currentUser = auth.currentUser;
                    if (!currentUser) {
                        console.error("❌ Auth Error: No authenticated user found.");
                        throw new Error("unauthenticated");
                    }

                    // Force lowercase and trim to ensure we match the document ID in Firestore exactly
                    const normalizedEmail = email.trim().toLowerCase();

                    // Safety check: UID must match or email must match
                    if (currentUser.email?.toLowerCase() !== normalizedEmail) {
                        console.warn("⚠️ Auth mismatch: Current user doesn't match license email.");
                    }

                    // Check Firestore for the user document (document ID is the email)
                    const userDocRef = doc(db, "users", normalizedEmail);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        console.log("✅ User document found in Firestore:", normalizedEmail);

                        // Heartbeat: Update lastSeenAt for existing users (even if free)
                        await setDoc(userDocRef, {
                            lastSeenAt: new Date().toISOString(),
                            platform: window.navigator.platform,
                            version: "1.0.2", // Current app version
                            uid: currentUser.uid // Ensure UID is saved
                        }, { merge: true });

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
                        console.log("🆕 New user detected. Syncing with Firestore...");
                        await setDoc(userDocRef, {
                            email: email,
                            uid: currentUser.uid,
                            isPro: false,
                            createdAt: new Date().toISOString(),
                            platform: window.navigator.platform,
                            lastSeenAt: new Date().toISOString(),
                            version: "1.0.2"
                        }, { merge: true });
                        console.log("✅ Firestore User Initialized:", normalizedEmail);
                    }

                    // Not a Pro user
                    set({ isPro: false, userEmail: email, lastVerifiedAt: new Date().toISOString() });
                    return false;
                } catch (error: any) {
                    console.error("❌ CRITICAL: Firestore validation/sync failed:", {
                        code: error?.code,
                        message: error?.message
                    });
                    // We throw here because onboarding NEEDS this sync to succeed
                    throw error;
                }
            },

            validateFallbackLicense: async (email: string, licenseKeyParam: string) => {
                try {
                    const normalizedEmail = email.trim().toLowerCase();
                    const trimmedKey = licenseKeyParam.trim();
                    const userDocRef = doc(db, "users", normalizedEmail);
                    const userDoc = await getDoc(userDocRef);

                    // 1. Check if the CURRENT user already owns this key
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

                    // 2. Global Key Search
                    const { collection, query, where, getDocs } = await import("firebase/firestore");
                    const usersRef = collection(db, "users");

                    // Check all possible key fields across all users
                    const queries = [
                        query(usersRef, where("licenseKey", "==", trimmedKey)),
                        query(usersRef, where("lemonSqueezyLicenseKey", "==", trimmedKey)),
                        query(usersRef, where("subscriptionId", "==", trimmedKey)),
                        query(usersRef, where("razorpaySubscriptionId", "==", trimmedKey)),
                        query(usersRef, where("stripeSubscriptionId", "==", trimmedKey))
                    ];

                    let foundValidKey = false;
                    for (const q of queries) {
                        const querySnapshot = await getDocs(q);
                        if (!querySnapshot.empty) {
                            const matchedUserDoc = querySnapshot.docs[0].data();

                            // Check expiration
                            if (matchedUserDoc.expiresAt) {
                                const expiresAt = new Date(matchedUserDoc.expiresAt);
                                if (new Date() > expiresAt) continue;
                            }

                            foundValidKey = true;
                            break;
                        }
                    }

                    if (foundValidKey) {
                        // Valid key found globally! Attach it to the CURRENT user.
                        set({
                            isPro: true,
                            licenseKey: trimmedKey,
                            userEmail: normalizedEmail,
                            lastVerifiedAt: new Date().toISOString()
                        });

                        // Save this license mapping to the current user's document
                        await setDoc(userDocRef, {
                            isPro: true,
                            licenseKey: trimmedKey,
                            email: normalizedEmail,
                            linkedFromGlobalKey: true,
                            lastSeenAt: new Date().toISOString(),
                            platform: window.navigator.platform,
                            version: "1.0.2"
                        }, { merge: true });

                        return true;
                    }

                    return false;
                } catch (error) {
                    console.error("❌ CRITICAL: Firestore fallback validation failed:", error);
                    throw error;
                }
            },

            isLicenseValid: () => {
                const { isPro, lastVerifiedAt } = get();
                if (!isPro) return false;
                if (!lastVerifiedAt) return true; // Legacy Pro status

                const lastVerified = new Date(lastVerifiedAt);
                const now = new Date();

                // Basic monotonicity check: If the system clock has been moved back 
                // before the last verification, invalidate until fixed.
                if (now < lastVerified) {
                    console.warn("⚠️ System clock drift detected (Time travel). Licensing suspended.");
                    return false;
                }

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
            partialize: (state) => ({
                userEmail: state.userEmail,
                dailyUsage: state.dailyUsage,
                isPro: state.isPro,
                licenseKey: state.licenseKey,
                lastVerifiedAt: state.lastVerifiedAt,
            }),
        }
    )
);

