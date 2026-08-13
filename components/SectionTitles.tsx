import { Trophy, Crosshair } from 'lucide-react';

export function TdmBanner() {
  return (
    <div className="relative mb-10 mt-6 print:mb-6 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      {/* Background arcade grid effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-0 relative z-10">
          <h1 className="text-5xl sm:text-7xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-gray-100 via-gray-400 to-gray-700 drop-shadow-[0_5px_15px_rgba(0,0,0,1)] print:text-black print:drop-shadow-none print:bg-none uppercase" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.15)' }}>
            TEAM DEATHMATCH
          </h1>
        </div>
        
        <div className="relative -mt-3 sm:-mt-5 text-sm sm:text-2xl font-black tracking-widest uppercase flex items-center justify-center print:text-gray-700 z-20">
          {/* Custom sharp lightning bolt */}
          <svg viewBox="0 0 24 24" fill="currentColor" preserveAspectRatio="none" className="absolute inset-0 m-auto w-16 h-32 sm:w-24 sm:h-48 text-yellow-400/80 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] rotate-[10deg] -translate-y-[10px] z-0 scale-125">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
          </svg>
          <span className="bg-blue-950/80 border-4 border-blue-500 text-blue-400 px-4 py-1 sm:px-8 sm:py-2 rounded-l-lg shadow-[0_0_20px_rgba(59,130,246,0.6),inset_0_0_15px_rgba(59,130,246,0.4)] z-10 -skew-x-12 transform">
            Blue Team
          </span>
          <span className="text-white italic text-4xl sm:text-6xl font-black z-30 drop-shadow-[0_5px_10px_rgba(0,0,0,0.9)] -mx-3 sm:-mx-5 scale-110">VS</span>
          <span className="bg-orange-950/80 border-4 border-orange-500 text-orange-400 px-4 py-1 sm:px-8 sm:py-2 rounded-r-lg shadow-[0_0_20px_rgba(249,115,22,0.6),inset_0_0_15px_rgba(249,115,22,0.4)] z-10 -skew-x-12 transform">
            Orange Team
          </span>
        </div>
      </div>
    </div>
  );
}

export function SurvivalBanner() {
  return (
    <div className="relative mb-10 mt-6 print:mb-6 overflow-hidden rounded-xl border border-red-900/30 bg-gradient-to-b from-black to-[#0a0505] p-6 shadow-[0_0_40px_rgba(220,38,38,0.15)]">
      {/* Terminator metallic/grit texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      
      {/* Red laser glow at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-80 blur-[2px]"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-3 sm:gap-4 mb-0 relative z-10">
          <Crosshair className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,1)] print:text-black print:drop-shadow-none" />
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-gray-200 via-gray-400 to-gray-600 drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] print:text-black print:drop-shadow-none print:bg-none uppercase" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.1)' }}>
            SURVIVAL MODE
          </h1>
          <Crosshair className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,1)] print:hidden" />
        </div>
        
        <div className="relative -mt-1 sm:-mt-2 text-xs sm:text-xl font-black tracking-[0.3em] sm:tracking-[0.4em] uppercase text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] print:text-gray-700 flex items-center justify-center gap-2 sm:gap-4 z-20">
          <span className="w-8 sm:w-16 h-px bg-red-500/50 hidden sm:block shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
          TEAM AGAINST THE MACHINES
          <span className="w-8 sm:w-16 h-px bg-red-500/50 hidden sm:block shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
        </div>
      </div>
    </div>
  );
}
