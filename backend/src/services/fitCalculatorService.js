const { pool } = require('../config/database');

/**
 * UK Feed-in Tariff (FIT) Calculator Service
 * 
 * Installation Details:
 * - Installation Date: February 29, 2012
 * - System Size: 2.5 kW (9 panels)
 * - Generation Tariff: 43.3p/kWh (locked for 25 years, RPI-adjusted annually)
 * - Export Tariff: 3.1p/kWh (RPI-adjusted annually)
 * - Export Assumption: 50% of generation (standard deemed export)
 * 
 * FIT Scheme Details:
 * - Scheme ran from 2010-2019 (closed to new applicants March 2019)
 * - Payments guaranteed for 25 years from installation
 * - Annual RPI adjustments applied each April
 * - Generation payments: All kWh generated × generation tariff
 * - Export payments: 50% of kWh generated × export tariff
 */

// UK RPI (Retail Price Index) annual adjustment factors
// Applied each April to FIT rates
const RPI_ADJUSTMENTS = {
  2012: 1.000,  // Base year (Feb 2012 installation)
  2013: 1.032,  // +3.2% (April 2013)
  2014: 1.065,  // +3.3% (April 2014)
  2015: 1.078,  // +1.3% (April 2015)
  2016: 1.088,  // +1.0% (April 2016)
  2017: 1.122,  // +3.1% (April 2017)
  2018: 1.158,  // +3.2% (April 2018)
  2019: 1.193,  // +3.0% (April 2019)
  2020: 1.210,  // +1.4% (April 2020)
  2021: 1.223,  // +1.1% (April 2021)
  2022: 1.268,  // +3.7% (April 2022)
  2023: 1.408,  // +11.0% (April 2023)
  2024: 1.451,  // +3.1% (April 2024)
  2025: 1.488,  // +2.5% (April 2025)
  2026: 1.518,  // +2.0% (April 2026, estimated)
};

// Base tariff rates (pence per kWh) from February 2012 installation
const BASE_GENERATION_TARIFF = 43.3; // p/kWh
const BASE_EXPORT_TARIFF = 3.1;      // p/kWh
const EXPORT_PERCENTAGE = 0.5;        // 50% deemed export

/**
 * Get RPI adjustment factor for a given year
 */
function getRPIAdjustment(year) {
  return RPI_ADJUSTMENTS[year] || RPI_ADJUSTMENTS[2026]; // Use latest if year not found
}

/**
 * Calculate FIT earnings for a specific year
 */
async function calculateYearlyEarnings(year) {
  try {
    // Get total generation for the year
    const [rows] = await pool.query(`
      SELECT 
        YEAR(DT) as year,
        ROUND(SUM(CAST(PWR AS DECIMAL(10,2)) * (10.0/60.0)), 2) as totalKwh,
        COUNT(*) as readingCount
      FROM DTP
      WHERE YEAR(DT) = ?
      GROUP BY YEAR(DT)
    `, [year]);

    if (rows.length === 0) {
      return {
        year,
        totalKwh: 0,
        generationEarnings: 0,
        exportEarnings: 0,
        totalEarnings: 0,
        rpiAdjustment: getRPIAdjustment(year),
        generationTariff: 0,
        exportTariff: 0
      };
    }

    const totalKwh = parseFloat(rows[0].totalKwh);
    const rpiAdjustment = getRPIAdjustment(year);
    
    // Calculate adjusted tariffs
    const adjustedGenerationTariff = BASE_GENERATION_TARIFF * rpiAdjustment;
    const adjustedExportTariff = BASE_EXPORT_TARIFF * rpiAdjustment;
    
    // Calculate earnings (convert pence to pounds)
    const generationEarnings = (totalKwh * adjustedGenerationTariff) / 100;
    const exportKwh = totalKwh * EXPORT_PERCENTAGE;
    const exportEarnings = (exportKwh * adjustedExportTariff) / 100;
    const totalEarnings = generationEarnings + exportEarnings;

    return {
      year,
      totalKwh: totalKwh.toFixed(2),
      exportKwh: exportKwh.toFixed(2),
      generationTariff: adjustedGenerationTariff.toFixed(2),
      exportTariff: adjustedExportTariff.toFixed(2),
      rpiAdjustment: rpiAdjustment.toFixed(3),
      generationEarnings: generationEarnings.toFixed(2),
      exportEarnings: exportEarnings.toFixed(2),
      totalEarnings: totalEarnings.toFixed(2)
    };
  } catch (error) {
    console.error('Error calculating yearly earnings:', error);
    throw error;
  }
}

/**
 * Calculate FIT earnings for a date range
 */
async function calculateEarningsRange(startYear, endYear) {
  try {
    const yearlyEarnings = [];
    let totalGeneration = 0;
    let totalGenerationEarnings = 0;
    let totalExportEarnings = 0;

    // Calculate earnings for each year
    for (let year = startYear; year <= endYear; year++) {
      const earnings = await calculateYearlyEarnings(year);
      yearlyEarnings.push(earnings);
      
      totalGeneration += parseFloat(earnings.totalKwh);
      totalGenerationEarnings += parseFloat(earnings.generationEarnings);
      totalExportEarnings += parseFloat(earnings.exportEarnings);
    }

    const totalEarnings = totalGenerationEarnings + totalExportEarnings;

    return {
      yearlyEarnings,
      summary: {
        startYear,
        endYear,
        totalYears: endYear - startYear + 1,
        totalGeneration: totalGeneration.toFixed(2),
        totalGenerationEarnings: totalGenerationEarnings.toFixed(2),
        totalExportEarnings: totalExportEarnings.toFixed(2),
        totalEarnings: totalEarnings.toFixed(2),
        avgYearlyEarnings: (totalEarnings / (endYear - startYear + 1)).toFixed(2)
      }
    };
  } catch (error) {
    console.error('Error calculating earnings range:', error);
    throw error;
  }
}

/**
 * Calculate ROI (Return on Investment) metrics
 */
async function calculateROI(installationCost = null) {
  try {
    // Get all earnings from installation to present
    const currentYear = new Date().getFullYear();
    const installationYear = 2012;
    
    const earningsData = await calculateEarningsRange(installationYear, currentYear);
    const totalEarnings = parseFloat(earningsData.summary.totalEarnings);
    const yearsElapsed = currentYear - installationYear;
    
    // Calculate remaining FIT years (25 year guarantee from Feb 2012)
    const fitEndYear = 2037; // Feb 2012 + 25 years
    const remainingYears = fitEndYear - currentYear;
    
    // Estimate future earnings (using average of last 3 years)
    const recentYears = earningsData.yearlyEarnings.slice(-3);
    const avgRecentEarnings = recentYears.reduce((sum, y) => 
      sum + parseFloat(y.totalEarnings), 0) / recentYears.length;
    const projectedFutureEarnings = avgRecentEarnings * remainingYears;
    const projectedTotalEarnings = totalEarnings + projectedFutureEarnings;

    const result = {
      installationDate: '2012-02-29',
      systemSize: '2.5 kW',
      fitGuaranteeEndDate: '2037-02-28',
      yearsElapsed,
      remainingYears,
      totalEarningsToDate: totalEarnings.toFixed(2),
      avgYearlyEarnings: (totalEarnings / yearsElapsed).toFixed(2),
      projectedFutureEarnings: projectedFutureEarnings.toFixed(2),
      projectedTotalEarnings: projectedTotalEarnings.toFixed(2),
      totalGeneration: earningsData.summary.totalGeneration,
      generationEarnings: earningsData.summary.totalGenerationEarnings,
      exportEarnings: earningsData.summary.totalExportEarnings
    };

    // Add ROI calculations if installation cost provided
    if (installationCost) {
      const roi = ((totalEarnings - installationCost) / installationCost) * 100;
      const projectedROI = ((projectedTotalEarnings - installationCost) / installationCost) * 100;
      const paybackYears = installationCost / (totalEarnings / yearsElapsed);
      const paybackDate = new Date(2012, 1, 29); // Feb 29, 2012
      paybackDate.setFullYear(paybackDate.getFullYear() + Math.ceil(paybackYears));

      result.installationCost = installationCost.toFixed(2);
      result.currentROI = roi.toFixed(2) + '%';
      result.projectedROI = projectedROI.toFixed(2) + '%';
      result.paybackPeriod = paybackYears.toFixed(1) + ' years';
      result.estimatedPaybackDate = paybackDate.toISOString().split('T')[0];
    }

    return result;
  } catch (error) {
    console.error('Error calculating ROI:', error);
    throw error;
  }
}

/**
 * Get monthly earnings breakdown for a specific year
 */
async function getMonthlyEarnings(year) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        YEAR(DT) as year,
        MONTH(DT) as month,
        DATE_FORMAT(DT, '%Y-%m') as yearMonth,
        ROUND(SUM(CAST(PWR AS DECIMAL(10,2)) * (10.0/60.0)), 2) as totalKwh,
        COUNT(*) as readingCount
      FROM DTP
      WHERE YEAR(DT) = ?
      GROUP BY YEAR(DT), MONTH(DT)
      ORDER BY MONTH(DT)
    `, [year]);

    const rpiAdjustment = getRPIAdjustment(year);
    const adjustedGenerationTariff = BASE_GENERATION_TARIFF * rpiAdjustment;
    const adjustedExportTariff = BASE_EXPORT_TARIFF * rpiAdjustment;

    const monthlyData = rows.map(row => {
      const totalKwh = parseFloat(row.totalKwh);
      const exportKwh = totalKwh * EXPORT_PERCENTAGE;
      const generationEarnings = (totalKwh * adjustedGenerationTariff) / 100;
      const exportEarnings = (exportKwh * adjustedExportTariff) / 100;
      const totalEarnings = generationEarnings + exportEarnings;

      return {
        year: row.year,
        month: row.month,
        yearMonth: row.yearMonth,
        totalKwh: totalKwh.toFixed(2),
        exportKwh: exportKwh.toFixed(2),
        generationEarnings: generationEarnings.toFixed(2),
        exportEarnings: exportEarnings.toFixed(2),
        totalEarnings: totalEarnings.toFixed(2)
      };
    });

    const totalEarnings = monthlyData.reduce((sum, m) => 
      sum + parseFloat(m.totalEarnings), 0);

    return {
      year,
      generationTariff: adjustedGenerationTariff.toFixed(2),
      exportTariff: adjustedExportTariff.toFixed(2),
      rpiAdjustment: rpiAdjustment.toFixed(3),
      monthlyData,
      yearTotal: totalEarnings.toFixed(2)
    };
  } catch (error) {
    console.error('Error getting monthly earnings:', error);
    throw error;
  }
}

module.exports = {
  calculateYearlyEarnings,
  calculateEarningsRange,
  calculateROI,
  getMonthlyEarnings,
  BASE_GENERATION_TARIFF,
  BASE_EXPORT_TARIFF,
  EXPORT_PERCENTAGE,
  RPI_ADJUSTMENTS
};

// Made with Bob
