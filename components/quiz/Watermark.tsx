'use client';

import React from 'react';

interface WatermarkProps {
    text: string;
}

/**
 * Anti-screenshot watermark overlay.
 * Renders a repeating diagonal pattern of the user's identity across the entire viewport.
 * Uses pointer-events:none so it never blocks interaction.
 */
export const Watermark: React.FC<WatermarkProps> = ({ text }) => {
    // Generate enough rows/cols to cover the screen even when rotated
    const rows = 12;
    const cols = 6;

    return (
        <div className="watermark-overlay" aria-hidden="true">
            <div className="watermark-grid">
                {Array.from({ length: rows }).map((_, row) => (
                    <div key={row} className="watermark-row">
                        {Array.from({ length: cols }).map((_, col) => (
                            <span key={col} className="watermark-text">
                                {text}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
