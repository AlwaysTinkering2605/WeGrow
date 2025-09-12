interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: "green" | "blue" | "purple" | "yellow";
}

export default function ProgressRing({ 
  value, 
  size = 64, 
  strokeWidth = 4, 
  className = "",
  color = "green"
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colorClasses = {
    green: "text-green-600",
    blue: "text-blue-600", 
    purple: "text-purple-600",
    yellow: "text-yellow-600"
  };

  const strokeColors = {
    green: "#10b981",
    blue: "#3b82f6",
    purple: "#8b5cf6", 
    yellow: "#f59e0b"
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(210 40% 88%)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColors[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center ${colorClasses[color]}`}>
        <span className="text-lg font-bold">{value}%</span>
      </div>
    </div>
  );
}
