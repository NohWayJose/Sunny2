#!/usr/bin/env python3
# SunnyCSV2DB — import SunnyBeam CSV files into MariaDB
# Copyright (C) 2024-2026 Greg Lubel
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.


import os
import logging
import pymysql
import argparse
from datetime import datetime
from decimal import Decimal
from os import listdir

#-- Logging setup --

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

#-- Database config --

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_USER = os.getenv("DB_USER", "solar")
DB_PASS = os.getenv("DB_PASS", "ralosbackwards")
DB_NAME = os.getenv("DB_NAME", "SunnyData2")

#-- Behaviour config --

ZERO_THRESHOLD = Decimal("0.005")
ZERO_RUN_LIMIT = 10

#-- Database connection --

def connect_to_db():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        autocommit=False
    )

#-- Ensure tables exist --

def ensure_tables(con):
    with con.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS FILES (
                idfiles INT AUTO_INCREMENT PRIMARY KEY,
                FN VARCHAR(50) UNIQUE,
                FD DATETIME NOT NULL
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS DTP (
                idDTP INT AUTO_INCREMENT PRIMARY KEY,
                DT DATETIME UNIQUE,
                PWR DECIMAL(6,3) NOT NULL
            )
        """)
    con.commit()

#-- Clear all data for full reload --

def clear_tables(con):
    with con.cursor() as cur:
        cur.execute("DELETE FROM DTP")
        cur.execute("DELETE FROM FILES")
    con.commit()
    logging.info("Tables cleared — full reload in progress")

#-- Check filename format --

def is_dated_csv(filename):
    try:
        datetime.strptime(filename, '%y-%m-%d.CSV')
        return True
    except ValueError:
        return False

#-- Extract date from file --

def parse_for_date(filepath):
    with open(filepath, 'r') as f:
        f.readline()
        date_line = f.readline()

    date_part = date_line.split("|")[-1].strip()

    if '.' in date_part:
        y, m, d = date_part.split('.')
    else:
        d, m, y = date_part.split('/')

    return datetime.strptime(f"{y}{m}{d}000000", "%Y%m%d%H%M%S")

#-- Parse CSV readings --

def parse_power_values(filepath, base_date):
    rows = []
    data_started = False

    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()

            if line.startswith("HH:mm"):
                data_started = True
                continue

            if not data_started:
                continue

            parts = line.split(";")
            if len(parts) < 2:
                continue

            time_str = parts[0]
            power_str = parts[1].strip()

            if time_str == "00:00" and rows:
                continue

            if power_str == "-.---":
                continue

            try:
                hour, minute = map(int, time_str.split(":"))
                timestamp = base_date.replace(hour=hour, minute=minute)
                power = Decimal(power_str).quantize(Decimal("0.000"))
                rows.append((timestamp, power))
            except Exception as e:
                logging.warning(f"Bad row skipped: {e}")

    return rows

#-- Optional daylight filtering --

def filter_daylight(rows):
    if not rows:
        return rows

    start_idx = None
    for i, (_, p) in enumerate(rows):
        if p >= ZERO_THRESHOLD:
            start_idx = i
            break

    if start_idx is None:
        return []

    zero_run = 0
    end_idx = len(rows)

    for i in range(start_idx, len(rows)):
        _, p = rows[i]
        if p < ZERO_THRESHOLD:
            zero_run += 1
        else:
            zero_run = 0
        if zero_run >= ZERO_RUN_LIMIT:
            end_idx = i - ZERO_RUN_LIMIT + 2  # +2 includes the first zero as the sundown marker
            break

    return rows[start_idx:end_idx]

#-- Get processed files --

def get_processed_files(con):
    with con.cursor() as cur:
        cur.execute("SELECT FN FROM FILES")
        return {row[0] for row in cur.fetchall()}

#-- Insert file record --

def insert_file(con, filename, filedate):
    with con.cursor() as cur:
        cur.execute(
            "INSERT IGNORE INTO FILES (FN, FD) VALUES (%s, %s)",
            (filename, filedate)
        )

#-- Insert readings --

def insert_power_data(con, rows):
    if not rows:
        return
    with con.cursor() as cur:
        cur.executemany(
            "INSERT IGNORE INTO DTP (DT, PWR) VALUES (%s, %s)",
            rows
        )

#-- Main execution --

def main():
    parser = argparse.ArgumentParser(description="Import SunnyBeam CSV files into database")
    parser.add_argument('--force', action='store_true',
                        help='Clear all existing data and reimport everything from scratch')
    parser.add_argument('--path', default='./',
                        help='Directory containing CSV files (default: current directory)')
    args = parser.parse_args()

    logging.info("Starting CSV processing")

    con = connect_to_db()

    try:
        ensure_tables(con)

        if args.force:
            clear_tables(con)

        processed = get_processed_files(con)

        for filename in sorted(listdir(args.path)):
            if not is_dated_csv(filename):
                continue

            if filename in processed:
                logging.info(f"Skipping already-processed {filename}")
                continue

            logging.info(f"Processing {filename}")

            filepath = os.path.join(args.path, filename)
            filedate = parse_for_date(filepath)
            rows = parse_power_values(filepath, filedate)

            rows = filter_daylight(rows)

            if not rows:
                logging.warning(f"No usable data in {filename}")
                continue

            insert_file(con, filename, filedate)
            insert_power_data(con, rows)
            con.commit()

    except Exception as e:
        logging.error(f"Fatal error: {e}", exc_info=True)
        con.rollback()

    finally:
        con.close()
        logging.info("Finished")

if __name__ == "__main__":
    main()
