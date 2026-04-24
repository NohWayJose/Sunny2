const express = require('express');
const router = express.Router();
const solarDataService = require('../services/solarDataService');

/**
 * API Routes for Solar Dashboard
 */

/**
 * GET /api/solar/daily
 * Get daily aggregated solar data
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD)
 */
router.get('/solar/daily', async (req, res) => {
  try {
    const { start, end } = req.query;

    // Validate required parameters
    if (!start || !end) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both start and end dates are required (format: YYYY-MM-DD)'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Dates must be in YYYY-MM-DD format'
      });
    }

    const result = await solarDataService.getDailyData(start, end);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/solar/daily:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch daily data'
    });
  }
});

/**
 * GET /api/solar/monthly
 * Get monthly aggregated solar data
 * Query params: start (YYYY-MM), end (YYYY-MM)
 */
router.get('/solar/monthly', async (req, res) => {
  try {
    const { start, end } = req.query;

    // Validate required parameters
    if (!start || !end) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both start and end months are required (format: YYYY-MM)'
      });
    }

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(start) || !monthRegex.test(end)) {
      return res.status(400).json({
        error: 'Invalid month format',
        message: 'Months must be in YYYY-MM format'
      });
    }

    const result = await solarDataService.getMonthlyData(start, end);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/solar/monthly:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch monthly data'
    });
  }
});

/**
 * GET /api/solar/yearly
 * Get yearly aggregated solar data
 * Query params: start (YYYY), end (YYYY)
 */
router.get('/solar/yearly', async (req, res) => {
  try {
    const { start, end } = req.query;

    // Validate required parameters
    if (!start || !end) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both start and end years are required (format: YYYY)'
      });
    }

    // Validate year format
    const yearRegex = /^\d{4}$/;
    if (!yearRegex.test(start) || !yearRegex.test(end)) {
      return res.status(400).json({
        error: 'Invalid year format',
        message: 'Years must be in YYYY format'
      });
    }

    const startYear = parseInt(start);
    const endYear = parseInt(end);

    if (startYear > endYear) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'Start year must be before or equal to end year'
      });
    }

    const result = await solarDataService.getYearlyData(startYear, endYear);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/solar/yearly:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch yearly data'
    });
  }
});

/**
 * GET /api/solar/raw
 * Get raw solar data (10-minute intervals)
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD), limit (optional), offset (optional)
 */
router.get('/solar/raw', async (req, res) => {
  try {
    const { start, end, limit = 1000, offset = 0 } = req.query;

    // Validate required parameters
    if (!start || !end) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both start and end dates are required (format: YYYY-MM-DD)'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Dates must be in YYYY-MM-DD format'
      });
    }

    // Validate and parse pagination parameters
    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 10000) {
      return res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 10000'
      });
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error: 'Invalid offset',
        message: 'Offset must be a non-negative number'
      });
    }

    const result = await solarDataService.getRawData(start, end, parsedLimit, parsedOffset);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/solar/raw:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch raw data'
    });
  }
});

/**
 * GET /api/solar/range
 * Get the date range of available data
 */
router.get('/solar/range', async (req, res) => {
  try {
    const result = await solarDataService.getDataRange();
    res.json(result);
  } catch (error) {
    console.error('Error in /api/solar/range:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch data range'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'solar-dashboard-api'
  });
});

module.exports = router;

// Made with Bob
