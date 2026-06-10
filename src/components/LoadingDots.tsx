export default function LoadingDots() {
  return (
    <div className="inline-flex gap-1 px-5 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-text-secondary"
          style={{
            animation: "bounce 1.4s infinite ease-in-out both",
            animationDelay: `${-0.32 + i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
}
