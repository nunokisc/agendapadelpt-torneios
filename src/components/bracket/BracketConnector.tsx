// SVG connector lines between bracket rounds.
// Draws an elbow: vertical from source mid → horizontal → vertical to target mid.

interface ConnectorProps {
  x1: number; // right edge of source card
  y1: number; // vertical center of source card
  x2: number; // left edge of target card
  y2: number; // vertical center of target card
  active?: boolean;
}

export default function BracketConnector({ x1, y1, x2, y2, active }: ConnectorProps) {
  const midX = x1 + (x2 - x1) / 2;
  const color = active ? "#10b981" : "#CBD5E1";
  const d = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
