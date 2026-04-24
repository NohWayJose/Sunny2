const { pool } = require('../config/database');

/**
 * Solar Data Service
 * Handles all database queries and data aggregation for solar panel data
 */

class SolarDataService {
  /**
   * Get daily aggregated solar data
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Daily aggregated data with summary
   */
  async getDailyData(startDate, endDate) {
    try {
      const query = `
        SELECT 
          DATE(DT) as date,
          ROUND(SUM(CAST(PWR AS DECIMAL(10,2))) / 1000, 2) as totalKwh,
          ROUND(AVG(CAST(PWR AS DECIMAL(10,2))), 2) as avgPower,
          ROUND(MAX(CAST(PWR AS DECIMAL(10,2))), 2) as maxPower,
          ROUND(MIN(CAST(PWR AS DECIMAL(10,2))), 2) as minPower,
          COUNT(*) as readingCount
        FROM DTP
        WHERE DT BETWEEN ? AND ?
        GROUP BY DATE(DT)
        ORDER BY date
      `;

      const [rows] = await pool.execute(query, [
        `${startDate} 00:00:00`,
        `${endDate} 23:59:59`
      ]);

      // Calculate summary statistics
      const summary = {
        totalDays: rows.length,
        totalGeneration: rows.reduce((sum, row) => sum + parseFloat(row.totalKwh || 0), 0).toFixed(2),
        avgDailyGeneration: rows.length > 0 
          ? (rows.reduce((sum, row) => sum + parseFloat(row.totalKwh || 0), 0) / rows.length).toFixed(2)
          : 0,
        peakDay: rows.length > 0 
          ? rows.reduce((max, row) => parseFloat(row.totalKwh) > parseFloat(max.totalKwh) ? row : max)
          : null
      };

      return {
        data: rows,
        summary
      };
    } catch (error) {
      console.error('Error fetching daily data:', error);
      throw error;
    }
  }

  /**
   * Get monthly aggregated solar data
   * @param {string} startMonth - Start month (YYYY-MM)
   * @param {string} endMonth - End month (YYYY-MM)
   * @returns {Promise<Object>} Monthly aggregated data with summary
   */
  async getMonthlyData(startMonth, endMonth) {
    try {
      const query = `
        SELECT 
          DATE_FORMAT(DT, '%Y-%m') as month,
          ROUND(SUM(CAST(PWR AS DECIMAL(10,2))) / 1000, 2) as totalKwh,
          ROUND(AVG(CAST(PWR AS DECIMAL(10,2))), 2) as avgPower,
          COUNT(DISTINCT DATE(DT)) as daysInMonth,
          ROUND(SUM(CAST(PWR AS DECIMAL(10,2))) / 1000 / COUNT(DISTINCT DATE(DT)), 2) as avgDailyKwh
        FROM DTP
        WHERE DATE_FORMAT(DT, '%Y-%m') BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(DT, '%Y-%m')
        ORDER BY month
      `;

      const [rows] = await pool.execute(query, [startMonth, endMonth]);

      // Get peak day for each month
      const monthsWithPeakDay = await Promise.all(
        rows.map(async (row) => {
          const peakDayQuery = `
            SELECT 
              DATE(DT) as date,
              ROUND(SUM(CAST(PWR AS DECIMAL(10,2))) / 1000, 2) as totalKwh
            FROM DTP
            WHERE DATE_FORMAT(DT, '%Y-%m') = ?
            GROUP BY DATE(DT)
            ORDER BY totalKwh DESC
            LIMIT 1
          `;
          const [peakDay] = await pool.execute(peakDayQuery, [row.month]);
          return {
            ...row,
            peakDay: peakDay[0]?.date || null,
            peakDayKwh: peakDay[0]?.totalKwh || 0
          };
        })
      );

      const summary = {
        totalMonths: rows.length,
        totalGeneration: rows.reduce((sum, row) => sum + parseFloat(row.totalKwh || 0), 0).toFixed(2),
        avgMonthlyGeneration: rows.length > 0
          ? (rows.reduce((sum, row) => sum + parseFloat(row.totalKwh || 0), 0) / rows.length).toFixed(2)
          : 0,
        peakMonth: rows.length > 0
          ? rows.reduce((max, row) => parseFloat(row.totalKwh) > parseFloat(max.totalKwh) ? row : max)
          : null
      };

      return {
        data: monthsWithPeakDay,
        summary
      };
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      throw error;
    }
  }

  /**
   * Get yearly aggregated solar data
   * @param {number} startYear - Start year (YYYY)
   * @param {number} endYear - End year (YYYY)
   * @returns {Promise<Object>} Yearly aggregated data with summary
   */
  async getYearlyData(startYear, endYear) {
    try {
      const query = `
        SELECT 
          YEAR(DT) as year,
          ROUND(SUM(CAST(PWR AS DECIMAL(10,2))) / 1000, 2) as totalKwh,
          ROUND(AVG(CAST(PWR AS DECIMAL(10,2))), 2) as avgPower,
          COUNT(DISTINCT DATE_FORMAT(DT, '%Y-%m')) as monthsInYear,
          ROUND(SUM(CAST(PWR AS DECIMAL(10,2))) / 1000 / COUNT(DISTINCT DATE_FORMAT(DT, '%Y-%m')), 2) as avgMonthlyKwh
        FROM DTP
        WHERE YEAR(DT) BETWEEN ? AND ?
        GROUP BY YEAR(DT)
        ORDER BY year
      `;

      const [rows] = await pool.execute(query, [startYear, endYear]);

      // Get peak month for each year
      const yearsWithPeakMonth = await Promise.all(
        rows.map(async (row) => {
          const peakMonthQuery = `
            SELECT 
              DATE_FORMAT(DT, '%Y-%m') as month,
              ROUND(SUM(CAST(PWR AS DECIMAL(10,2))) / 1000, 2) as totalKwh
            FROM DTP
            WHERE YEAR(DT) = ?
            GROUP BY DATE_FORMAT(DT, '%Y-%m')
            ORDER BY totalKwh DESC
            LIMIT 1
          `;
          const [peakMonth] = await pool.execute(peakMonthQuery, [row.year]);
          return {
            ...row,
            peakMonth: peakMonth[0]?.month || null,
            peakMonthKwh: peakMonth[0]?.totalKwh || 0
          };
        })
      );

      const summary = {
        totalYears: rows.length,
        totalGeneration: rows.reduce((sum, row) => sum + parseFloat(row.totalKwh || 0), 0).toFixed(2),
        avgYearlyGeneration: rows.length > 0
          ? (rows.reduce((sum, row) => sum + parseFloat(row.totalKwh || 0), 0) / rows.length).toFixed(2)
          : 0,
        peakYear: rows.length > 0
          ? rows.reduce((max, row) => parseFloat(row.totalKwh) > parseFloat(max.totalKwh) ? row : max)
          : null
      };

      return {
        data: yearsWithPeakMonth,
        summary
      };
    } catch (error) {
      console.error('Error fetching yearly data:', error);
      throw error;
    }
  }

  /**
   * Get raw solar data (10-minute intervals)
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {number} limit - Number of records to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Raw data with pagination info
   */
  async getRawData(startDate, endDate, limit = 1000, offset = 0) {
    try {
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM DTP
        WHERE DT BETWEEN ? AND ?
      `;
      const [countResult] = await pool.execute(countQuery, [
        `${startDate} 00:00:00`,
        `${endDate} 23:59:59`
      ]);
      const total = countResult[0].total;

      // Get paginated data
      const dataQuery = `
        SELECT 
          DT as timestamp,
          CAST(PWR AS DECIMAL(10,2)) as power
        FROM DTP
        WHERE DT BETWEEN ? AND ?
        ORDER BY DT
        LIMIT ? OFFSET ?
      `;
      const [rows] = await pool.execute(dataQuery, [
        `${startDate} 00:00:00`,
        `${endDate} 23:59:59`,
        limit,
        offset
      ]);

      return {
        data: rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
          totalPages: Math.ceil(total / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      };
    } catch (error) {
      console.error('Error fetching raw data:', error);
      throw error;
    }
  }

  /**
   * Get data range (earliest and latest dates in database)
   * @returns {Promise<Object>} Date range information
   */
  async getDataRange() {
    try {
      const query = `
        SELECT 
          MIN(DT) as earliestDate,
          MAX(DT) as latestDate,
          COUNT(*) as totalRecords
        FROM DTP
      `;
      const [rows] = await pool.execute(query);
      return rows[0];
    } catch (error) {
      console.error('Error fetching data range:', error);
      throw error;
    }
  }
}

module.exports = new SolarDataService();

// Made with Bob
