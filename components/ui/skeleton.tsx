export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`grimoire-card p-4 ${className}`}>
      <div className="skeleton h-4 w-3/4 mb-3" />
      <div className="skeleton h-3 w-1/2 mb-4" />
      <div className="skeleton h-12 w-full mb-2" />
      <div className="flex justify-between">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>
  );
}

export function SkeletonTierRow() {
  return (
    <div className="flex gap-4 mb-4">
      <div className="skeleton w-20 h-24 rounded-xl flex-shrink-0" />
      <div className="flex-1 flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton w-16 h-16 rounded-full flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}
