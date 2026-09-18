/**
 * API Configuration
 * 
 * In development: VITE_API_URL is empty, and Vite proxy forwards /api to backend (localhost:3000)
 * In production:  VITE_API_URL = "https://your-backend.onrender.com" (or Railway URL)
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "";
