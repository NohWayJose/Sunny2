const express = require('express');
const router = express.Router();
const solarDataService = require('../services/solarDataService');
const fitCalculatorService = require('../services/fitCalculatorService');

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
 * GET /api/fit/earnings
 * Get FIT earnings for a date range
 * Query params: start (YYYY), end (YYYY)
 */
router.get('/fit/earnings', async (req, res) => {
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

    const result = await fitCalculatorService.calculateEarningsRange(startYear, endYear);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/fit/earnings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate FIT earnings'
    });
  }
});

/**
 * GET /api/fit/roi
 * Get ROI (Return on Investment) summary
 * Query params: installationCost (optional, in GBP)
 */
router.get('/fit/roi', async (req, res) => {
  try {
    const { installationCost } = req.query;
    
    let cost = null;
    if (installationCost) {
      cost = parseFloat(installationCost);
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({
          error: 'Invalid installation cost',
          message: 'Installation cost must be a positive number'
        });
      }
    }

    const result = await fitCalculatorService.calculateROI(cost);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/fit/roi:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate ROI'
    });
  }
});

/**
 * GET /api/fit/monthly/:year
 * Get monthly FIT earnings breakdown for a specific year
 * Path params: year (YYYY)
 */
router.get('/fit/monthly/:year', async (req, res) => {
  try {
    const { year } = req.params;

    // Validate year format
    const yearRegex = /^\d{4}$/;
    if (!yearRegex.test(year)) {
      return res.status(400).json({
        error: 'Invalid year format',
        message: 'Year must be in YYYY format'
      });
    }

    const result = await fitCalculatorService.getMonthlyEarnings(parseInt(year));
    res.json(result);
  } catch (error) {
    console.error('Error in /api/fit/monthly:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch monthly earnings'
    });
  }
});

/**
 * GET /api/fit/tariffs
 * Get current FIT tariff information
 */
router.get('/fit/tariffs', (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const rpiAdjustment = fitCalculatorService.RPI_ADJUSTMENTS[currentYear] ||
                          fitCalculatorService.RPI_ADJUSTMENTS[2026];
    
    const currentGenerationTariff = fitCalculatorService.BASE_GENERATION_TARIFF * rpiAdjustment;
    const currentExportTariff = fitCalculatorService.BASE_EXPORT_TARIFF * rpiAdjustment;

    res.json({
      installationDate: '2012-02-29',
      systemSize: '2.5 kW',
      baseTariffs: {
        generation: fitCalculatorService.BASE_GENERATION_TARIFF,
        export: fitCalculatorService.BASE_EXPORT_TARIFF,
        unit: 'pence per kWh'
      },
      currentYear,
      rpiAdjustment: rpiAdjustment.toFixed(3),
      currentTariffs: {
        generation: currentGenerationTariff.toFixed(2),
        export: currentExportTariff.toFixed(2),
        unit: 'pence per kWh'
      },
      exportAssumption: `${fitCalculatorService.EXPORT_PERCENTAGE * 100}% deemed export`,
      fitGuaranteeEndDate: '2037-02-28',
      rpiAdjustments: fitCalculatorService.RPI_ADJUSTMENTS
    });
  } catch (error) {
    console.error('Error in /api/fit/tariffs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch tariff information'
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
