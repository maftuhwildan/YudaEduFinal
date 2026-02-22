/**
 * Utility function to process HTML content for quiz display.
 * 
 * This function detects lines that contain special spacing characters
 * (like &emsp; or multiple &nbsp;) which are typically used for 
 * accounting journal entries, and applies white-space: nowrap to 
 * preserve their formatting on mobile devices.
 * 
 * Lines without special formatting will wrap naturally.
 */

/**
 * Processes HTML content and applies nowrap styling to lines with special spacing.
 * 
 * @param html - The raw HTML content from the database
 * @returns Processed HTML with appropriate styling for pre-formatted content
 */
export function formatQuizContent(html: string): string {
    if (!html) return '';

    // Patterns that indicate pre-formatted content (accounting entries, etc.)
    // These are lines that should NOT wrap
    const spacingPatterns = [
        /&emsp;/,           // em-space (tab equivalent)
        /&ensp;/,           // en-space
        /\u2003/,           // em-space unicode
        /\u2002/,           // en-space unicode
        /&nbsp;&nbsp;/,     // multiple non-breaking spaces
        /\u00A0\u00A0/,     // multiple nbsp unicode
    ];

    // Check if content contains any pre-formatted patterns
    const hasPreformattedContent = spacingPatterns.some(pattern => pattern.test(html));

    if (!hasPreformattedContent) {
        // No special formatting, but still wrap tables for auto-scale
        return wrapTables(html);
    }

    // Split content by line breaks (both <br> and actual newlines in HTML)
    // We want to process each "visual line" independently

    // First, normalize the HTML slightly
    let processed = html;

    // Process each line that contains special spacing
    // Strategy: Wrap lines that have emsp/multiple spaces in a span with nowrap

    // Split by <br>, <br/>, or <br />
    const lines = processed.split(/(<br\s*\/?>)/i);

    const processedLines = lines.map(line => {
        // Don't process <br> tags themselves
        if (/^<br\s*\/?>$/i.test(line)) {
            return line;
        }

        // Check if this line has pre-formatted spacing
        const needsPreserve = spacingPatterns.some(pattern => pattern.test(line));

        if (needsPreserve && line.trim()) {
            // Wrap in a span with white-space: nowrap
            // Use class 'pre-line' for CSS targeting
            return `<span class="pre-line" style="white-space: nowrap; display: inline-block;">${line}</span>`;
        }

        return line;
    });

    let result = processedLines.join('');

    // Wrap all <table> elements in inline-block div for auto-scale measurement
    result = wrapTables(result);

    return result;
}

/**
 * Alternative simpler approach: Apply a CSS class to the container
 * based on whether content has pre-formatted elements.
 * 
 * Use this when you want the container to scroll horizontally
 * rather than wrapping individual lines.
 */
export function getQuizContentClass(html: string): string {
    if (!html) return 'quiz-content';

    const hasEmsp = /&emsp;|\u2003/.test(html);
    const hasMultipleSpaces = /&nbsp;&nbsp;|\u00A0\u00A0/.test(html);

    if (hasEmsp || hasMultipleSpaces) {
        return 'quiz-content quiz-preformatted';
    }

    return 'quiz-content';
}

/**
 * Wraps all <table> elements in an inline-block div wrapper.
 * This forces the wrapper to size to the table's natural content width,
 * making JS auto-scale measurement reliable even when the parent has overflow:hidden.
 */
function wrapTables(html: string): string {
    if (!html.includes('<table')) return html;
    // Wrap <table...>...</table> in a measurement wrapper div
    return html.replace(
        /(<table[\s\S]*?<\/table>)/gi,
        '<div class="quiz-table-wrapper" style="display:inline-block;width:max-content;max-width:none">$1</div>'
    );
}
