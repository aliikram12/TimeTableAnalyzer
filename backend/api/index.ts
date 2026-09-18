/**
 * Vercel Serverless Function Entry Point
 * 
 * This file wraps the Express app as a Vercel serverless function.
 * All routes are handled by the Express router imported from server.ts.
 */
import app from "../server.js";

export default app;
