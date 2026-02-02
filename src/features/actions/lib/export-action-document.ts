/**
 * Export action Questions, Notes, and Legal Comments as Word (.docx) or PDF.
 * Produces a clear, well-structured document with sections and metadata.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { jsPDF } from "jspdf";
import type { Action } from "@/types";
import type { ActionQuestion } from "@/types";
import type { ActionNote } from "@/types";
import type { ActionLegalComment } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";

// =========================================================
// HELPERS
// =========================================================

function formatDate(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  return formatUNDateTime(typeof d === "string" ? d : d);
}

function wrapPdfText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const trimmed = (text || "").trim();
  if (!trimmed) return [];
  return trimmed.split(/\r?\n/).flatMap((line) => doc.splitTextToSize(line, maxWidth));
}

// =========================================================
// WORD (.docx)
// =========================================================

function buildWordDocument(
  action: Action,
  questions: ActionQuestion[],
  notes: ActionNote[],
  legalComments: ActionLegalComment[],
): Document {
  const children: (Paragraph)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: `Action ${action.action_display_id}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
    }),
  );

  // Subtitle: report, work package, indicative activity
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${action.report} · Work package ${action.work_package_number}`,
          bold: false,
          size: 22,
        }),
      ],
      spacing: { after: 80 },
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: action.indicative_activity,
          italics: true,
          size: 24,
        }),
      ],
      spacing: { after: 400 },
    }),
  );

  // Section: Questions
  children.push(
    new Paragraph({
      text: "Questions",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    }),
  );
  if (questions.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "No questions recorded.", italics: true })],
        spacing: { after: 120 },
      }),
    );
  } else {
    questions.forEach((q, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. ${q.question}`, bold: true }),
          ],
          spacing: { before: 120, after: 60 },
        }),
      );
      if (q.answer) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Answer: ", bold: true }),
              new TextRun({ text: q.answer }),
            ],
            indent: { left: 360 },
            spacing: { after: 60 },
          }),
        );
        if (q.answered_at || q.answered_by_email) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Answered ${formatDate(q.answered_at)}${q.answered_by_email ? ` by ${q.answered_by_email}` : ""}`,
                  italics: true,
                  size: 20,
                }),
              ],
              indent: { left: 360 },
              spacing: { after: 120 },
            }),
          );
        }
      }
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${formatDate(q.created_at)} · ${q.user_email ?? "—"}`,
              italics: true,
              size: 20,
            }),
          ],
          spacing: { after: 80 },
        }),
      );
    });
  }

  // Section: Notes
  children.push(
    new Paragraph({
      text: "Notes",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    }),
  );
  if (notes.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "No notes recorded.", italics: true })],
        spacing: { after: 120 },
      }),
    );
  } else {
    notes.forEach((n, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Note ${i + 1}`, bold: true }),
            new TextRun({
              text: ` · ${formatDate(n.created_at)}${n.user_email ? ` · ${n.user_email}` : ""}`,
              italics: true,
              size: 20,
            }),
          ],
          spacing: { before: 120, after: 60 },
        }),
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: n.content })],
          spacing: { after: 120 },
        }),
      );
    });
  }

  // Section: Legal Comments
  children.push(
    new Paragraph({
      text: "Legal Comments",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    }),
  );
  if (legalComments.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "No legal comments recorded.", italics: true })],
        spacing: { after: 120 },
      }),
    );
  } else {
    legalComments.forEach((c, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Comment ${i + 1}`, bold: true }),
            new TextRun({
              text: ` · ${formatDate(c.created_at)}${c.user_email ? ` · ${c.user_email}` : ""}`,
              italics: true,
              size: 20,
            }),
          ],
          spacing: { before: 120, after: 60 },
        }),
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: c.content })],
          spacing: { after: 120 },
        }),
      );
    });
  }

  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
}

export async function exportActionToWord(
  action: Action,
  questions: ActionQuestion[],
  notes: ActionNote[],
  legalComments: ActionLegalComment[],
): Promise<Blob> {
  const doc = buildWordDocument(action, questions, notes, legalComments);
  return Packer.toBlob(doc);
}

// =========================================================
// PDF
// =========================================================

const PDF_FONT = "helvetica";
const PDF_TITLE = 16;
const PDF_HEADING = 12;
const PDF_BODY = 10;
const PDF_SMALL = 9;
const PDF_MARGIN = 20;
const PDF_LINE_HEIGHT = 6;

export function exportActionToPdf(
  action: Action,
  questions: ActionQuestion[],
  notes: ActionNote[],
  legalComments: ActionLegalComment[],
): Blob {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  let y = PDF_MARGIN;

  const addText = (text: string, fontSize: number, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont(PDF_FONT, bold ? "bold" : "normal");
    const lines = wrapPdfText(doc, text, 170);
    lines.forEach((line) => {
      if (y > 270) {
        doc.addPage();
        y = PDF_MARGIN;
      }
      doc.text(line, PDF_MARGIN, y);
      y += PDF_LINE_HEIGHT;
    });
  };

  const addSpace = (mm = 4) => {
    y += mm;
  };

  // Title
  addText(`Action ${action.action_display_id}`, PDF_TITLE, true);
  addSpace(2);
  addText(`${action.report} · Work package ${action.work_package_number}`, PDF_BODY);
  addText(action.indicative_activity, PDF_BODY);
  addSpace(8);

  // Questions
  addText("Questions", PDF_HEADING, true);
  addSpace(4);
  if (questions.length === 0) {
    addText("No questions recorded.", PDF_BODY);
  } else {
    questions.forEach((q, i) => {
      addText(`${i + 1}. ${q.question}`, PDF_BODY, true);
      if (q.answer) {
        addText(`Answer: ${q.answer}`, PDF_BODY);
        if (q.answered_at || q.answered_by_email) {
          addText(
            `Answered ${formatDate(q.answered_at)}${q.answered_by_email ? ` by ${q.answered_by_email}` : ""}`,
            PDF_SMALL,
          );
        }
      }
      addText(`${formatDate(q.created_at)} · ${q.user_email ?? "—"}`, PDF_SMALL);
      addSpace(4);
    });
  }
  addSpace(8);

  // Notes
  addText("Notes", PDF_HEADING, true);
  addSpace(4);
  if (notes.length === 0) {
    addText("No notes recorded.", PDF_BODY);
  } else {
    notes.forEach((n, i) => {
      addText(`Note ${i + 1} · ${formatDate(n.created_at)}${n.user_email ? ` · ${n.user_email}` : ""}`, PDF_BODY, true);
      addText(n.content, PDF_BODY);
      addSpace(4);
    });
  }
  addSpace(8);

  // Legal Comments
  addText("Legal Comments", PDF_HEADING, true);
  addSpace(4);
  if (legalComments.length === 0) {
    addText("No legal comments recorded.", PDF_BODY);
  } else {
    legalComments.forEach((c, i) => {
      addText(`Comment ${i + 1} · ${formatDate(c.created_at)}${c.user_email ? ` · ${c.user_email}` : ""}`, PDF_BODY, true);
      addText(c.content, PDF_BODY);
      addSpace(4);
    });
  }

  return doc.output("blob");
}
