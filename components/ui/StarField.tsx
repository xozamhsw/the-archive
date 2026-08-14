const stars = [
  [5, 18, 1.1, 0.55],
  [11, 42, 1.8, 0.75],
  [17, 12, 1.2, 0.65],
  [24, 70, 1.4, 0.4],
  [29, 33, 1.1, 0.78],
  [37, 16, 1.7, 0.6],
  [43, 58, 1.3, 0.45],
  [51, 25, 1.2, 0.7],
  [57, 73, 1.8, 0.7],
  [63, 12, 1.1, 0.5],
  [69, 48, 1.3, 0.62],
  [74, 29, 1.1, 0.48],
  [81, 63, 1.7, 0.68],
  [86, 17, 1.2, 0.52],
  [91, 39, 1.4, 0.62],
  [95, 78, 1.2, 0.45],
  [9, 82, 1.3, 0.5],
  [33, 88, 1.5, 0.7],
  [48, 91, 1.1, 0.4],
  [77, 88, 1.4, 0.55],
];

export default function StarField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map(([left, top, size, opacity], index) => (
        <span
          key={`${left}-${top}`}
          className="archive-star absolute rounded-full bg-white"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${size}px`,
            height: `${size}px`,
            opacity,
            animationDelay: `${(index % 6) * 0.55}s`,
          }}
        />
      ))}

      <span className="archive-shooting-star absolute left-[42%] top-[12%] h-px w-28 rotate-[-26deg]" />
      <span className="archive-shooting-star absolute right-[13%] top-[28%] h-px w-20 rotate-[-31deg] opacity-50" />
    </div>
  );
}
