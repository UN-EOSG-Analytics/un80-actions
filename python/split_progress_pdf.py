"""Split the progress report PDF into per-work-package PDFs."""

import json
from pathlib import Path

import fitz

progress_path = Path("public/data/actions_progress.json")
pdf_path = Path("public/data/actions_progress.pdf")
output_dir = Path("public/data/progress")

progress_data = json.loads(progress_path.read_text())
doc = fitz.open(pdf_path)
total_pages = len(doc)

entries = sorted(
    [(d["workPackageNumber"], d["pdfPage"]) for d in progress_data if d.get("pdfPage")],
    key=lambda x: x[1],
)

output_dir.mkdir(parents=True, exist_ok=True)

for i, (wp_num, start_page) in enumerate(entries):
    # End page is one before the next WP's start (or last page of the PDF)
    if i + 1 < len(entries):
        end_page = entries[i + 1][1] - 1
    else:
        end_page = total_pages

    # Some WPs share a start page (e.g. WP6 and WP12 both on page 17).
    # In that case, give them just that one page.
    if end_page < start_page:
        end_page = start_page

    # fitz pages are 0-indexed, pdfPage values are 1-indexed
    out = fitz.open()
    out.insert_pdf(doc, from_page=start_page - 1, to_page=end_page - 1)
    out_path = output_dir / f"wp{wp_num}.pdf"
    out.save(out_path)
    out.close()

    page_count = end_page - start_page + 1
    print(f"WP {wp_num:>2}: pages {start_page}-{end_page} ({page_count} pages) → {out_path}")

doc.close()
print(f"\n✓ Split {len(entries)} work package PDFs into {output_dir}/")
