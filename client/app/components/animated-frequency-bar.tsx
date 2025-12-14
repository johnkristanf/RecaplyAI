
export function AnimatedFrequencyBar({
  barCount = 23,
  height = 36,
  barWidth = 6,
  color = "#3B82F6", // Tailwind blue-600
  secondary = "#DBEAFE", // Tailwind blue-100
  animate = true, // Animation runs if true
}: {
  barCount?: number;
  height?: number;
  barWidth?: number;
  color?: string;
  secondary?: string;
  animate?: boolean;
}) {
  const centerBarIndex = Math.floor(barCount / 2);

  // The calculated width of all bars with spacing; used for the viewBox
  const totalWidth = barCount * barWidth + (barCount - 1) * 3;

  return (
    <div
      className="w-full relative flex items-center justify-center mb-1"
      style={{ height: height + 8 /* for label */ }}
    >
      <style>{`
        @keyframes freqs {
          0% { transform: scaleY(0.5); }
          25% { transform: scaleY(1); }
          50% { transform: scaleY(0.6); }
          75% { transform: scaleY(1.2); }
          100% { transform: scaleY(0.5); }
        }
      `}</style>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="none"
        className="block"
        style={{
          display: "block",
          filter: "drop-shadow(0 2px 2px #0001)",
          overflow: "visible",
        }}
      >
        {/* Background bars for subtle grid */}
        {Array.from({ length: barCount }).map((_, i) => (
          <rect
            key={i + "-bg"}
            x={i * (barWidth + 3)}
            y={4}
            width={barWidth}
            height={height - 8}
            rx={2}
            fill={secondary}
            opacity={0.5}
          />
        ))}

        {/* Animated frequency bars */}
        {Array.from({ length: barCount }).map((_, i) => (
          <rect
            key={i}
            x={i * (barWidth + 3)}
            y={4}
            width={barWidth}
            height={height - 8}
            rx={2}
            fill={color}
            style={{
              transformOrigin: `center bottom`,
              ...(animate
                ? {
                    animation: `freqs 1.6s cubic-bezier(.61,-0.2,.25,1.13) infinite`,
                    animationDelay: `${(i - centerBarIndex) * 0.09}s`,
                  }
                : { transform: "scaleY(1)" }),
              opacity: i === centerBarIndex ? 1 : 0.8,
              transition: "opacity 0.15s",
            } as React.CSSProperties}
          />
        ))}

        
      </svg>
    </div>
  );
}
