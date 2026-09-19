/**
 * API Configuration
 *
 * How it works:
 * - LOCAL DEV: Vite proxy forwards /api/* -> localhost:8000 (FastAPI backend)
 * - PRODUCTION (Vercel): vercel.json rewrite forwards /api/* -> https://uostimetableanalyzerapi.vercel.app/api/*
 *   So API_BASE_URL stays "" (empty) and relative /api/... calls go through Vercel's edge proxy.
 *
 * VITE_API_URL is an optional override — only set it in Vercel's environment variables
 * if you want to bypass the rewrite proxy (usually not needed).
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "";
