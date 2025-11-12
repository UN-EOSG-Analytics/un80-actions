import type { Actions, WorkPackage, WorkPackageStats, NextMilestone } from "@/types";
import { parseDate, formatDate } from "./utils";

/**
 * Group actions by work package number, combining across reports
 * @param actions - Array of actions to group
 * @returns Array of work packages sorted by number
 */
export function groupActionsByWorkPackage(actions: Actions): WorkPackage[] {
    const wpMap = new Map<string, WorkPackage>();

    actions.forEach((action) => {
        // Use work_package_number as key to combine across reports
        const key = action.work_package_number || 'empty';
        if (!wpMap.has(key)) {
            // work_package_leads is already an array
            const leads = Array.isArray(action.work_package_leads)
                ? action.work_package_leads.filter(lead => lead && lead.trim().length > 0)
                : [];

            wpMap.set(key, {
                report: [action.report],
                number: action.work_package_number || '',
                name: action.work_package_name,
                leads: leads,
                goal: action.work_package_goal || null,
                bigTicket: action.big_ticket || false,
                actions: [],
            });
        }
        const wp = wpMap.get(key)!;

        // Add report if not already included
        if (!wp.report.includes(action.report)) {
            wp.report.push(action.report);
        }

        // Merge leads from all reports
        const newLeads = Array.isArray(action.work_package_leads)
            ? action.work_package_leads.filter(lead => lead && lead.trim().length > 0)
            : [];
        newLeads.forEach(lead => {
            if (!wp.leads.includes(lead)) {
                wp.leads.push(lead);
            }
        });

        // Update goal if not set or if this action has a goal
        if (action.work_package_goal && !wp.goal) {
            wp.goal = action.work_package_goal;
        }

        // Update big_ticket status - if any action is big_ticket, mark the work package as big_ticket
        if (action.big_ticket) {
            wp.bigTicket = true;
        }

        // Add indicative activity if not already included
        if (action.indicative_activity) {
            const existingAction = wp.actions.find(a => a.text === action.indicative_activity && a.report === action.report);
            if (!existingAction) {
                // work_package_leads is already an array
                const actionLeads = Array.isArray(action.work_package_leads)
                    ? action.work_package_leads.filter(lead => lead && lead.trim().length > 0)
                    : [];

                wp.actions.push({
                    text: action.indicative_activity,
                    documentParagraph: action.document_paragraph || '',
                    leads: actionLeads,
                    report: action.report,
                    docText: action.doc_text || null,
                });
            } else {
                // Merge leads if action already exists
                const actionLeads = Array.isArray(action.work_package_leads)
                    ? action.work_package_leads.filter(lead => lead && lead.trim().length > 0)
                    : [];
                actionLeads.forEach(lead => {
                    if (!existingAction.leads.includes(lead)) {
                        existingAction.leads.push(lead);
                    }
                });
                // Update doc_text if not already set
                if (action.doc_text && !existingAction.docText) {
                    existingAction.docText = action.doc_text;
                }
            }
        }
    });

    return Array.from(wpMap.values()).sort((a, b) => {
        // Handle empty numbers - put them at the end
        if (!a.number && !b.number) return a.name.localeCompare(b.name);
        if (!a.number) return 1;
        if (!b.number) return -1;

        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        if (numA !== numB) return numA - numB;

        // If numbers are equal, sort by name
        return a.name.localeCompare(b.name);
    });
}

/**
 * Calculate statistics from actions data
 * @param actions - Array of actions
 * @returns Work package statistics
 */
export function calculateStats(actions: Actions): WorkPackageStats {
    const uniqueWPs = new Set(
        actions.map((a) => `${a.report}-${a.work_package_number}`)
    );
    
    return {
        total: uniqueWPs.size,
        completed: 2, // This would come from actual completion data
        totalActions: actions.length,
        completedActions: 0, // This would come from actual completion data
    };
}

/**
 * Calculate the next upcoming milestone from actions
 * @param actions - Array of actions
 * @returns Next milestone or null
 */
export function calculateNextMilestone(actions: Actions): NextMilestone | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for consistent comparison
    
    const milestones = actions
        .filter(a => a.first_milestone && a.indicative_activity)
        .map(a => {
            const milestoneDate = parseDate(a.first_milestone);
            return milestoneDate ? {
                date: milestoneDate,
                indicativeActivity: a.indicative_activity,
            } : null;
        })
        .filter((m): m is { date: Date; indicativeActivity: string } => {
            if (!m) return false;
            m.date.setHours(0, 0, 0, 0); // Normalize to start of day
            return m.date >= today;
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (milestones.length > 0) {
        const next = milestones[0];
        return {
            date: formatDate(next.date),
            indicativeActivity: next.indicativeActivity,
        };
    }
    
    return null;
}

/**
 * Calculate progress bar percentage based on date range
 * @returns Progress percentage (0-100)
 */
export function calculateProgressPercentage(): number {
    const startDate = new Date(2025, 9, 31); // October 31, 2025 (month is 0-indexed)
    const endDate = new Date(2027, 11, 31); // December 31, 2027
    const now = new Date();

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();

    // Calculate percentage, clamped between 0 and 100
    const percentage = (elapsedDuration / totalDuration) * 100;
    return Math.max(0, Math.min(100, percentage));
}
