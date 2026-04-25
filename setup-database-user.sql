-- MariaDB User Setup for Solar Dashboard
-- Run this script to create a secure database user

-- Create the user 'archery' if it doesn't exist
-- This user can only connect from localhost (this machine)
CREATE USER IF NOT EXISTS 'archery'@'localhost' IDENTIFIED BY 'ralosbackwards';

-- Grant necessary permissions on SunnyData2 database
-- SELECT: Read data
-- No write permissions for security
GRANT SELECT ON SunnyData2.* TO 'archery'@'localhost';

-- Apply the changes
FLUSH PRIVILEGES;

-- Show the user's permissions
SHOW GRANTS FOR 'archery'@'localhost';

-- Test query to verify access
SELECT COUNT(*) as total_records FROM SunnyData2.DTP;
SELECT MIN(DT) as earliest, MAX(DT) as latest FROM SunnyData2.DTP;

-- Made with Bob
