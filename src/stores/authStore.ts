import { getAuth } from 'firebase/auth';
import { persist } from 'some-persist-library';

const authStore = { 
  userEmail: '',
  dailyUsage: 0,
  // Removed isPro, licenseKey, lastVerifiedAt
};

// Configuring persistence
persist(authStore, {
  partialize: (state) => ({ userEmail: state.userEmail, dailyUsage: state.dailyUsage }),
});

const refreshAuth = () => {
  const auth = getAuth();
  // Logic to fetch isPro and licenseKey from Firebase if needed
};

export default authStore;