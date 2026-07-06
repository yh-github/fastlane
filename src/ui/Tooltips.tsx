/**
 * Tooltips.tsx — Familiarity mechanic tooltips.
 *
 * Shows contextual information that reveals more detail
 * as the player's familiarity with a location/mechanic increases.
 */

import { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <div className="tooltip-popup">{content}</div>}
    </div>
  );
}
