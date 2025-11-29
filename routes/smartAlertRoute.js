// routes/smartAlertRoute.js
import express from 'express';
import { generateSmartAlert, generateBatchAlerts } from '../controllers/smartAlertController.js';

const router = express.Router();

/**
 * POST /api/smart-alert
 * Generate a single smart Bangla alert using LLM
 * 
 * Body: {
 *   cropType: string (required),
 *   storageType: string,
 *   division: string,
 *   district: string,
 *   riskLevel: string (required) - "Critical", "High", "Moderate", "Low",
 *   etcl: number (hours to critical loss),
 *   temperature: number,
 *   humidity: number,
 *   rainProb: number,
 *   moisture: number
 * }
 */
router.post('/', generateSmartAlert);

/**
 * POST /api/smart-alert/batch
 * Generate alerts for multiple crops at once
 * 
 * Body: {
 *   crops: Array of crop objects with riskLevel, weather data, etc.
 * }
 */
router.post('/batch', generateBatchAlerts);

export default router;

