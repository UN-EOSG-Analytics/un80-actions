import { FileText } from "lucide-react";

interface DocumentBadgeProps {
    documentParagraph?: string;
    report?: string;
    workPackageNumber?: string;
}

export function DocumentBadge({ documentParagraph, report, workPackageNumber }: DocumentBadgeProps) {
    // Don't render if no document information is available
    if (!documentParagraph && report !== 'WS1' && workPackageNumber !== '31') {
        return null;
    }

    const getDocumentText = () => {
        if (workPackageNumber === '31') {
            return 'A/80/400';
        }
        if (report === 'WS1') {
            return 'A/80/400';
        }
        if (report === 'WS3' && documentParagraph) {
            return `A/80/392 para. ${documentParagraph}`;
        }
        if (report === 'WS2' && documentParagraph) {
            return `A/80/318 para. ${documentParagraph}`;
        }
        if (documentParagraph) {
            return `Para. ${documentParagraph}`;
        }
        return null;
    };

    const documentText = getDocumentText();

    if (!documentText) {
        return null;
    }

    return (
        <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-sm text-gray-600 leading-tight">
                {documentText}
            </span>
        </div>
    );
}
