import { writable } from 'svelte/store';
import { persist } from 'svelte-local-storage-store';

// Updated to persist only userEmail and dailyUsage
export const authStore = persist('authStore', {
    userEmail: '',
    dailyUsage: 0
});