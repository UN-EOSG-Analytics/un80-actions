import pandas as pd
import re




# Email regex pattern
EMAIL_PATTERN = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"


def clean_text(text):
    """Clean text by normalizing whitespace and converting to lowercase"""
    if pd.isna(text):
        return ""

    # Convert to string, lowercase, and normalize whitespace
    text = str(text).lower()
    text = re.sub(r"\s+", " ", text)  # Replace all whitespace with single space
    return text.strip()


def extract_emails_from_text(text):
    """Extract all email addresses from cleaned text"""
    if pd.isna(text):
        return ""

    # Clean the text first
    cleaned = clean_text(text)

    # Extract emails
    emails = re.findall(EMAIL_PATTERN, cleaned)
    return ",".join(emails)


df["extracted_emails"] = df["FP Specific for WP-Level -- SUPERSEDED"].apply(extract_emails_from_text)


##########################################

# Validation: Check if @ count matches between original and extracted
def count_at_signs(text):
    """Count the number of @ signs in text"""
    if pd.isna(text):
        return 0
    return str(text).count("@")


df["original_at_count"] = df["FP Specific for WP-Level -- SUPERSEDED"].apply(count_at_signs)
df["extracted_at_count"] = df["extracted_emails"].apply(count_at_signs)
df["at_count_mismatch"] = df["original_at_count"] != df["extracted_at_count"]

# Report any mismatches
mismatches = df[df["at_count_mismatch"]]
if len(mismatches) > 0:
    print(f"Warning: {len(mismatches)} rows have mismatched @ counts")
    print(
        mismatches[
            [
                "action_support_RAW",
                "extracted_emails",
                "original_at_count",
                "extracted_at_count",
            ]
        ]
    )
else:
    print("✓ All @ counts match between original and extracted emails")


# Export extracted emails to CSV

df[["extracted_emails"]].to_csv("extracted_emails.csv", index=False)
print("✓ Extracted emails exported to extracted_emails.csv")
