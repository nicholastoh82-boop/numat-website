"""
NUMAT Sales Pipeline — CSV Importer
=====================================
Handles the Google Sheet export which has a merged title row at the top.
Automatically finds the real header row, maps columns, and imports to Supabase.

Setup:
    pip install supabase python-dotenv

Usage:
    1. Export the DATA ENTRY tab from Google Sheet as CSV
    2. Save as 'data_entry.csv' in the same folder as this script
    3. Run: python import_pipeline.py

    Optional flags:
    python import_pipeline.py --file myexport.csv     # use a different filename
    python import_pipeline.py --dry-run               # preview without importing
    python import_pipeline.py --clear                 # clear table first then import
"""

import csv
import os
import sys
import argparse
from datetime import datetime, date
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# ── Column mapping ───────────────────────────────────────────────────
# Maps Google Sheet column names → Supabase sales_pipeline column names
COLUMN_MAP = {
    "#":                    "deal_id",
    "deal id":              "deal_id",
    "company":              "company",
    "company name":         "company",
    "contact name":         "contact_name",
    "contact":              "contact_name",
    "full name":            "contact_name",
    "name":                 "contact_name",
    "email":                "email",
    "email address":        "email",
    "email status":         "email_status",
    "email ok?":            "email_status",
    "phone":                "phone",
    "title":                "title",
    "job title":            "title",
    "linkedin":             "linkedin_url",
    "linkedin url":         "linkedin_url",
    "apollo id":            "apollo_id",
    "country":              "country",
    "city":                 "city",
    "address":              "address",
    "segment":              "segment",
    "industry":             "industry",
    "stage":                "stage",
    "prob":                 "prob_pct",
    "prob %":               "prob_pct",
    "probability":          "prob_pct",
    "product":              "product",
    "qty":                  "qty",
    "unit":                 "unit",
    "value (php)":          "value_php",
    "value php":            "value_php",
    "php value":            "value_php",
    "value (usd)":          "value_usd",
    "value usd":            "value_usd",
    "usd value":            "value_usd",
    "weighted usd":         "weighted_usd",
    "weighted value":       "weighted_usd",
    "currency":             "currency",
    "won reason":           "won_reason",
    "lost reason":          "lost_reason",
    "close date":           "close_date",
    "rep":                  "rep",
    "sales rep":            "rep",
    "assigned to":          "rep",
    "rep email":            "rep_email",
    "lead source":          "lead_source",
    "source":               "lead_source",
    "priority":             "priority",
    "ai score":             "ai_score",
    "lead score":           "ai_score",
    "qual tier":            "qual_tier",
    "meeting":              "meeting",
    "outreach":             "outreach",
    "status":               "status",
    "sequence step":        "sequence_step",
    "sequence_step":        "sequence_step",
    "last email date":      "last_email_date",
    "last_email_date":      "last_email_date",
    "notes":                "notes",
    "website":              "website",
    "updated by":           "updated_by",
    "last updated":         "updated_by",
    "date added":           "date_added",
    "won/lost":             "won_reason",
    "first name (email)":   "contact_name",
    "first name":           "contact_name",
    "follow-up":            "notes",
    "next call":            "notes",
}


def find_header_row(rows):
    """Find the actual header row by looking for known column names."""
    known_cols = {"#", "company", "email", "stage", "country", "segment",
                  "contact name", "contact", "deal id", "rep", "sales rep"}
    for i, row in enumerate(rows[:10]):  # check first 10 rows
        row_lower = {c.strip().lower() for c in row if c.strip()}
        if len(row_lower & known_cols) >= 2:
            print(f"    Found header row at row {i + 1}")
            return i, row
    return None, None


def clean_value(val, col_name):
    """Clean and type-cast a value based on its target column."""
    if val is None:
        return None
    val = str(val).strip()
    if not val or val in ("-", "N/A", "n/a", "#N/A", "—"):
        return None

    # Numeric fields
    if col_name in ("prob_pct", "value_php", "value_usd", "weighted_usd",
                    "ai_score", "qty"):
        val = val.replace(",", "").replace("₱", "").replace("$", "").replace("%", "").strip()
        try:
            return float(val)
        except ValueError:
            return None

    if col_name == "sequence_step":
        try:
            return int(float(val))
        except ValueError:
            return None

    # Date fields
    if col_name in ("close_date", "last_email_date", "date_added"):
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y", "%m-%d-%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(val, fmt).date().isoformat()
            except ValueError:
                continue
        return None

    return val if val else None


def process_row(row_dict, header):
    """Map a CSV row to a sales_pipeline record."""
    record = {}
    for col_name, value in zip(header, row_dict):
        col_lower = col_name.strip().lower()
        target = COLUMN_MAP.get(col_lower)
        if not target:
            continue
        cleaned = clean_value(value, target)
        if cleaned is not None:
            # Don't overwrite with None if already set
            if target not in record or cleaned:
                record[target] = cleaned

    # Skip rows with no company or that are sub-header/description rows
    company = record.get("company", "").strip()
    if not company or company in ("", "#", "Auto", "Company", "company"):
        return None

    # Skip description rows (sub-headers below the real header)
    email_val = record.get("email", "").strip()
    if email_val in ("← KEY FIELD", "KEY FIELD", "Email", "email"):
        return None

    # Skip rows where deal_id is just a header marker
    if record.get("deal_id", "").strip() in ("#", "Auto", ""):
        record.pop("deal_id", None)

    return record if record else None


def import_csv(filepath, dry_run=False, clear_first=False):
    print(f"\n🌿 NUMAT Sales Pipeline Importer")
    print("=" * 50)

    # Read file
    print(f"Reading {filepath}...")
    with open(filepath, newline='', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        all_rows = list(reader)

    print(f"  Total rows in file: {len(all_rows)}")

    # Find header
    header_idx, header = find_header_row(all_rows)
    if header is None:
        print("❌ Could not find header row. Make sure the file has columns like 'Company', 'Email', 'Stage'")
        sys.exit(1)

    data_rows = all_rows[header_idx + 1:]
    print(f"  Data rows to process: {len(data_rows)}")

    # Process rows
    records = []
    skipped = 0
    for row in data_rows:
        if not any(c.strip() for c in row):
            continue  # skip empty rows
        record = process_row(row, header)
        if record:
            records.append(record)
        else:
            skipped += 1

    print(f"\n  Valid records: {len(records)}")
    print(f"  Skipped (empty/invalid): {skipped}")

    if dry_run:
        print("\n🔎 DRY RUN — first 3 records:")
        for r in records[:3]:
            print(f"  {r}")
        print("\nDry run complete. Run without --dry-run to import.")
        return

    # Connect to Supabase
    print("\nConnecting to Supabase...")
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Connected")

    if clear_first:
        print("Clearing existing records...")
        sb.table("sales_pipeline").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("✅ Table cleared")

    # Import in batches
    batch_size = 200
    imported = 0
    failed = 0

    print(f"\nImporting {len(records)} records in batches of {batch_size}...")
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            sb.table("sales_pipeline").insert(batch).execute()
            imported += len(batch)
            print(f"  Batch {i//batch_size + 1}: imported {imported}/{len(records)}")
        except Exception as e:
            print(f"  Batch {i//batch_size + 1} failed — trying row by row...")
            for row in batch:
                try:
                    sb.table("sales_pipeline").insert(row).execute()
                    imported += 1
                except Exception as e2:
                    print(f"    Skipped ({row.get('company', '?')}): {e2}")
                    failed += 1

    print(f"\n{'='*50}")
    print(f"✅ Imported: {imported}")
    print(f"❌ Failed:   {failed}")
    print(f"\nView your data at:")
    print(f"  supabase.com → Table Editor → sales_pipeline")
    print(f"  Or run: SELECT COUNT(*) FROM sales_pipeline;\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file",    default="data_entry.csv", help="CSV filename")
    parser.add_argument("--dry-run", action="store_true",      help="Preview without importing")
    parser.add_argument("--clear",   action="store_true",      help="Clear table before importing")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"❌ File not found: {args.file}")
        print(f"   Export the DATA ENTRY tab from Google Sheets as CSV and save as '{args.file}'")
        sys.exit(1)

    import_csv(args.file, dry_run=args.dry_run, clear_first=args.clear)


if __name__ == "__main__":
    main()
