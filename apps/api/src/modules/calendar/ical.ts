
/**
 * Format a Date object into the ICS date-time string (YYYYMMDDTHHmmSSZ)
 */
function formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(str: string): string {
    if (!str) return ''
    return str
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n')
}

/**
 * Generate an iCalendar (ICS) string from an array of events
 */
export function generateICS(events: any[]): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FlowBoard//Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:FlowBoard Calendar',
        'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
        'X-PUBLISHED-TTL:PT1H'
    ]

    events.forEach(event => {
        lines.push('BEGIN:VEVENT')
        lines.push(`UID:${event.id}@flowboard.app`)
        lines.push(`DTSTAMP:${formatICSDate(new Date())}`)
        lines.push(`DTSTART:${formatICSDate(new Date(event.startAt))}`)
        lines.push(`DTEND:${formatICSDate(new Date(event.endAt))}`)
        lines.push(`SUMMARY:${escapeICS(event.title)}`)

        if (event.description) {
            lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
        }

        if (event.location || event.meetingLink) {
            lines.push(`LOCATION:${escapeICS(event.location || event.meetingLink)}`)
        }

        // Handle RRULE if present (rrule.toString() is usually already in the correct format)
        if (event.recurrence && typeof event.recurrence === 'object') {
            const ruleObj = event.recurrence
            let rruleParts = []

            if (ruleObj.frequency) {
                rruleParts.push(`FREQ=${ruleObj.frequency.toUpperCase()}`)
            }
            if (ruleObj.interval) {
                rruleParts.push(`INTERVAL=${ruleObj.interval}`)
            }
            if (ruleObj.until) {
                rruleParts.push(`UNTIL=${formatICSDate(new Date(ruleObj.until))}`)
            }
            if (ruleObj.count) {
                rruleParts.push(`COUNT=${ruleObj.count}`)
            }

            if (rruleParts.length > 0) {
                lines.push(`RRULE:${rruleParts.join(';')}`)
            }
        }

        lines.push('END:VEVENT')
    })

    lines.push('END:VCALENDAR')
    return lines.join('\r\n')
}
