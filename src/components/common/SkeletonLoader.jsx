export function MilestoneSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-2xl" />
        <div>
          <div className="h-4 w-64 bg-gray-200 rounded-xl mb-2" />
          <div className="h-3 w-40 bg-gray-100 rounded-xl" />
        </div>
        <div className="ml-auto">
          <div className="h-4 w-24 bg-gray-200 rounded-xl mb-1" />
          <div className="h-2 w-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
      <div className="flex gap-2">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-7 w-28 bg-gray-100 rounded-xl" />
        ))}
      </div>
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-3 h-3 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="h-4 bg-gray-200 rounded-xl flex-1 animate-shimmer" style={{maxWidth:`${180+i*30}px`}} />
            <div className="ml-auto flex gap-2">
              <div className="h-3 w-16 bg-gray-100 rounded-xl" />
              <div className="h-6 w-20 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
      <div className="text-center py-6 text-violet-400 animate-pulse">
        <div className="text-3xl mb-2">⚡</div>
        <div className="text-xs font-medium">Loading milestone data...</div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-36 bg-gray-200 rounded-xl mb-2" />
          <div className="h-3 w-48 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 bg-gray-100 rounded-2xl mb-3" />
            <div className="h-7 w-12 bg-gray-200 rounded-xl mb-1" />
            <div className="h-3 w-20 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1,2].map(i => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-100 rounded-lg" />
              <div className="h-4 w-32 bg-gray-200 rounded-xl" />
            </div>
            {[1,2,3,4,5].map(j => (
              <div key={j} className="flex items-center gap-2 mb-3">
                <div className="h-4 flex-1 bg-gray-100 rounded-xl animate-shimmer" />
                <div className="h-2 w-16 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="text-center py-6 text-violet-400">
        <div className="text-3xl mb-2 animate-spin-slow">⚙️</div>
        <div className="text-xs font-medium">Loading dashboard...</div>
      </div>
    </div>
  )
}
