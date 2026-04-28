"""Extract QUICK SUMMARY tables from the progress PDF and merge into actions_progress.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

import fitz

PDF_PATH = Path("data/input/actions_progress.pdf")
JSON_PATH = Path("public/data/actions_progress.json")


def parse_action_cell(text: str) -> tuple[str, str]:
    """Split an action cell into (action_numbers, description)."""
    text = text.replace("\n", " ").strip()
    m = re.match(
        r"((?:Actions?\s+)?#?[\d,\s]+(?:and\s+\d+)?)\s*[:.]?\s*(.*)",
        text,
        re.S,
    )
    if m:
        return m.group(1).strip().rstrip(":. "), m.group(2).strip()
    return "", text


def clean_cell(text: str) -> str:
    return text.replace("\n", " ").strip()


def parse_products(text: str) -> list[str]:
    """Split a products cell into individual product strings."""
    text = text.replace("\n", " ").strip()
    if not text or text == "-":
        return []
    parts = re.split(r"●\s*", text)
    return [p.strip() for p in parts if p.strip() and p.strip() != "-"]


def extract_table_from_page(page) -> list[dict]:
    """Extract the QUICK SUMMARY table from a single page using find_tables()."""
    tabs = page.find_tables()
    if not tabs.tables:
        return []

    table = tabs.tables[0]
    if table.row_count > 10:
        return []

    rows = []
    for ri in range(table.row_count):
        cells = [table.extract()[ri][ci] or "" for ci in range(table.col_count)]

        if table.col_count == 4:
            action_text = cells[0]
            pathway = cells[1]
            products = cells[2]
            intergov = cells[3]
        elif table.col_count == 2:
            action_text = ""
            pathway = cells[0]
            products = cells[1]
            intergov = ""
        else:
            continue

        # Skip header rows
        if re.match(r"^\s*Actions?\s*$", action_text, re.I):
            continue
        if "Pathway" in pathway and "decision" in pathway and not action_text.strip():
            continue

        action_nums, description = parse_action_cell(action_text)
        product_list = parse_products(products)

        rows.append(
            {
                "action": f"{action_nums}: {description}".strip(": ") if action_nums or description else "",
                "pathwayToDecision": clean_cell(pathway),
                "intergovernmentalConsideration": clean_cell(intergov),
                "writtenProducts": product_list,
            }
        )

    return rows


def extract_table_partial_columns(page) -> list[dict]:
    """Fallback for pages where find_tables() returns fewer than 4 columns.

    Uses the 'lines' strategy (gives clean pathway + products) and parses
    action numbers from the page text to reassemble full rows.
    """
    text = page.get_text()
    if "QUICK SUMMARY" not in text.upper():
        return []

    # Extract action entries from text: collect description and product lines
    action_entries: list[tuple[str, str, list[str]]] = []
    for m in re.finditer(
        r"(Actions?\s+[\d,\s]+(?:and\s+\d+)?)\s*[:.]?\s*\n(.*?)(?=(?:Actions?\s+\d)|$)",
        text,
        re.S,
    ):
        nums = m.group(1).strip().rstrip(":. ")
        desc_lines = []
        product_lines = []
        in_products = False
        for ln in m.group(2).split("\n"):
            s = ln.strip()
            if not s:
                continue
            if s.startswith("●") or s.startswith("\t●"):
                in_products = True
                product_lines.append(s)
                continue
            if in_products and s not in ("-", "→") and "Work package" not in s:
                product_lines.append(s)
                continue
            if (
                "Work package leads" in s
                or "Secretary-General" in s
                or s in ("→", "-")
            ):
                in_products = False
                continue
            if not in_products:
                desc_lines.append(s)
        desc = " ".join(desc_lines).strip()
        products_text = " ".join(product_lines)
        action_entries.append((nums, desc, parse_products(products_text)))

    # Get pathway + products from lines-strategy table
    tabs = page.find_tables(strategy="lines")
    table_rows: list[tuple[str, list[str]]] = []
    if tabs.tables:
        for row_data in tabs.tables[0].extract():
            pathway = clean_cell(row_data[0] or "")
            products = parse_products(row_data[1] or "") if len(row_data) > 1 else []
            if "Pathway" in pathway and "decision" in pathway:
                continue
            table_rows.append((pathway, products))

    rows = []
    for i, (nums, desc, text_products) in enumerate(action_entries):
        pathway = ""
        products: list[str] = []
        if i < len(table_rows):
            pathway, products = table_rows[i]
        if not products:
            products = text_products

        action_str = f"{nums}: {desc}".strip(": ") if nums or desc else ""
        rows.append(
            {
                "action": action_str,
                "pathwayToDecision": pathway,
                "intergovernmentalConsideration": "",
                "writtenProducts": products,
            }
        )

    return rows


def main():
    doc = fitz.open(str(PDF_PATH))
    print(f"Opened {PDF_PATH} ({doc.page_count} pages)")

    # Track current WP across pages
    current_wp: list[int] | None = None
    wp_tables: dict[int, list[dict]] = {}

    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text()

        m = re.search(r"Work Packages?\s+([\d,\s]+(?:and\s+\d+)?)\s*\|", text)
        if m:
            nums = re.findall(r"\d+", m.group(1))
            current_wp = [int(n) for n in nums]

        if "QUICK SUMMARY" not in text.upper():
            continue

        tabs = page.find_tables()
        has_good_table = tabs.tables and tabs.tables[0].col_count == 4 and tabs.tables[0].row_count <= 10

        if has_good_table:
            rows = extract_table_from_page(page)
        else:
            rows = extract_table_partial_columns(page)

        if not rows or not current_wp:
            continue

        for wp_num in current_wp:
            existing = wp_tables.get(wp_num, [])
            existing.extend(rows)
            wp_tables[wp_num] = existing

    # Load existing JSON and merge
    with open(JSON_PATH, encoding="utf-8") as f:
        progress_data = json.load(f)

    updated = 0
    for wp in progress_data:
        wp_num = wp["workPackageNumber"]
        if wp_num in wp_tables:
            wp["summaryTable"] = wp_tables[wp_num]
            updated += 1
            actions_count = len(wp_tables[wp_num])
            products_count = sum(len(r["writtenProducts"]) for r in wp_tables[wp_num])
            print(f"  WP{wp_num:2d}: {actions_count} rows, {products_count} products")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(progress_data, f, ensure_ascii=False, indent=2)

    print(f"\nUpdated {updated} work packages with summary tables")
    print(f"JSON written to {JSON_PATH}")


if __name__ == "__main__":
    main()
