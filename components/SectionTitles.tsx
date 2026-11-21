import { Trophy, Crosshair, Skull, Target } from 'lucide-react';

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

export function CtfBanner() {
  return (
    <div className="relative mb-10 mt-6 print:mb-6 overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#05131a] via-[#090b10] to-[#0a0a0a] p-6 shadow-[0_0_35px_rgba(6,182,212,0.2)]">
      {/* Background arcade grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]"></div>

      {/* Cyan/Orange dual bottom laser glow */}
      <div className="absolute bottom-0 left-0 right-1/2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 blur-[2px]"></div>
      <div className="absolute bottom-0 left-1/2 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-80 blur-[2px]"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center mb-0 relative z-10">
          <h1 className="text-5xl sm:text-7xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 via-gray-300 to-gray-700 drop-shadow-[0_5px_15px_rgba(0,0,0,1)] print:text-black print:drop-shadow-none print:bg-none uppercase" style={{ WebkitTextStroke: '2px rgba(6,182,212,0.3)' }}>
            CAPTURE THE FLAG
          </h1>
        </div>
        
        <div className="relative -mt-3 sm:-mt-5 text-sm sm:text-2xl font-black tracking-widest uppercase flex items-center justify-center gap-4 sm:gap-6 print:text-gray-700 z-20">
          {/* Large crossed textured Orange (left) & Blue/Cyan (right) flags overlapping behind/through elements like TDM lightning */}
          <svg
            viewBox="0 0 280 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 m-auto w-60 h-40 sm:w-80 sm:h-52 -translate-y-3 sm:-translate-y-4 scale-125 z-0 pointer-events-none opacity-90 drop-shadow-[0_0_20px_rgba(0,0,0,0.95)] print:hidden"
          >
            <defs>
              {/* Tactical ripstop / woven cloth texture */}
              <pattern id="ctf-cloth-weave" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
                <path d="M 0 3 L 6 3 M 3 0 L 3 6" stroke="rgba(255,255,255,0.24)" strokeWidth="0.75" />
              </pattern>

              {/* Metallic shaft gradient */}
              <linearGradient id="ctf-pole-metal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="45%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* Orange billowing flag fabric gradient (left flag, contrasting against Blue Team) */}
              <linearGradient id="ctf-orange-fabric" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="38%" stopColor="#f97316" />
                <stop offset="72%" stopColor="#c2410c" />
                <stop offset="100%" stopColor="#431407" />
              </linearGradient>

              {/* Orange fabric shadow folds */}
              <linearGradient id="ctf-orange-folds" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
                <stop offset="28%" stopColor="#fed7aa" stopOpacity="0.32" />
                <stop offset="56%" stopColor="#431407" stopOpacity="0.48" />
                <stop offset="80%" stopColor="#fb923c" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
              </linearGradient>

              {/* Cyan/Blue billowing flag fabric gradient (right flag, contrasting against Orange Team) */}
              <linearGradient id="ctf-blue-fabric" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="38%" stopColor="#06b6d4" />
                <stop offset="72%" stopColor="#0e7490" />
                <stop offset="100%" stopColor="#083344" />
              </linearGradient>

              {/* Cyan fabric shadow folds */}
              <linearGradient id="ctf-blue-folds" x1="100%" y1="50%" x2="0%" y2="50%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
                <stop offset="28%" stopColor="#a5f3fc" stopOpacity="0.32" />
                <stop offset="56%" stopColor="#042f2e" stopOpacity="0.48" />
                <stop offset="80%" stopColor="#22d3ee" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
              </linearGradient>

              {/* Clip paths for each flag silhouette */}
              <clipPath id="ctf-left-clip">
                <path d="M84 23 C56 14, 34 33, 6 20 L23 51 L13 82 C46 91, 80 71, 120 81 Z" />
              </clipPath>
              <clipPath id="ctf-right-clip">
                <path d="M196 23 C224 14, 246 33, 274 20 L257 51 L267 82 C234 91, 200 71, 160 81 Z" />
              </clipPath>
            </defs>

            {/* ORANGE FLAG (flies top-left, standing out over Blue side) */}
            <g className="drop-shadow-[0_0_16px_rgba(249,115,22,0.85)]">
              <g clipPath="url(#ctf-left-clip)">
                <path d="M84 23 C56 14, 34 33, 6 20 L23 51 L13 82 C46 91, 80 71, 120 81 Z" fill="url(#ctf-orange-fabric)" />
                <path d="M6 36 L112 58 L116 71 L10 49 Z" fill="#ffedd5" fillOpacity="0.34" />
                <path d="M84 23 C56 14, 34 33, 6 20 L23 51 L13 82 C46 91, 80 71, 120 81 Z" fill="url(#ctf-orange-folds)" />
                <rect x="0" y="10" width="130" height="86" fill="url(#ctf-cloth-weave)" />
                <path d="M78 20 L93 22 L126 80 L112 84 Z" fill="#431407" fillOpacity="0.9" />
              </g>
              <path
                d="M84 23 C56 14, 34 33, 6 20 L23 51 L13 82 C46 91, 80 71, 120 81 Z"
                stroke="#fdba74"
                strokeWidth="1.75"
                strokeOpacity="0.95"
              />
            </g>

            {/* BLUE / CYAN FLAG (flies top-right, standing out over Orange side) */}
            <g className="drop-shadow-[0_0_16px_rgba(6,182,212,0.85)]">
              <g clipPath="url(#ctf-right-clip)">
                <path d="M196 23 C224 14, 246 33, 274 20 L257 51 L267 82 C234 91, 200 71, 160 81 Z" fill="url(#ctf-blue-fabric)" />
                <path d="M274 36 L168 58 L164 71 L270 49 Z" fill="#cffafe" fillOpacity="0.34" />
                <path d="M196 23 C224 14, 246 33, 274 20 L257 51 L267 82 C234 91, 200 71, 160 81 Z" fill="url(#ctf-blue-folds)" />
                <rect x="150" y="10" width="130" height="86" fill="url(#ctf-cloth-weave)" />
                <path d="M202 20 L187 22 L154 80 L168 84 Z" fill="#082f49" fillOpacity="0.9" />
              </g>
              <path
                d="M196 23 C224 14, 246 33, 274 20 L257 51 L267 82 C234 91, 200 71, 160 81 Z"
                stroke="#67e8f9"
                strokeWidth="1.75"
                strokeOpacity="0.95"
              />
            </g>

            {/* CROSSED FLAGPOLES */}
            {/* Pole for right/cyan flag */}
            <line x1="88" y1="188" x2="203" y2="17" stroke="url(#ctf-pole-metal)" strokeWidth="6.5" strokeLinecap="round" />
            <line x1="88" y1="188" x2="203" y2="17" stroke="#22d3ee" strokeWidth="1.4" strokeOpacity="0.65" strokeLinecap="round" />
            <polygon points="209,8 197,15 206,22" fill="#cffafe" stroke="#06b6d4" strokeWidth="1" />
            <circle cx="194" cy="29" r="2.6" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.9" />
            <circle cx="164" cy="75" r="2.6" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.9" />

            {/* Pole for left/orange flag */}
            <line x1="192" y1="188" x2="77" y2="17" stroke="url(#ctf-pole-metal)" strokeWidth="6.5" strokeLinecap="round" />
            <line x1="192" y1="188" x2="77" y2="17" stroke="#fb923c" strokeWidth="1.4" strokeOpacity="0.65" strokeLinecap="round" />
            <polygon points="71,8 83,15 74,22" fill="#fed7aa" stroke="#ea580c" strokeWidth="1" />
            <circle cx="86" cy="29" r="2.6" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.9" />
            <circle cx="116" cy="75" r="2.6" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.9" />
          </svg>

          <span className="bg-cyan-950/80 border-4 border-cyan-500 text-cyan-300 px-4 py-1 sm:px-8 sm:py-2 rounded-l-lg shadow-[0_0_20px_rgba(6,182,212,0.6),inset_0_0_15px_rgba(6,182,212,0.4)] z-10 -skew-x-12 transform">
            Blue Team
          </span>

          <span className="hidden print:inline text-black italic text-3xl font-black px-2 z-10">VS</span>

          <span className="bg-orange-950/80 border-4 border-orange-500 text-orange-400 px-4 py-1 sm:px-8 sm:py-2 rounded-r-lg shadow-[0_0_20px_rgba(249,115,22,0.6),inset_0_0_15px_rgba(249,115,22,0.4)] z-10 -skew-x-12 transform">
            Orange Team
          </span>
        </div>
      </div>
    </div>
  );
}

export function FfaBanner() {
  return (
    <div className="relative mb-10 mt-6 print:mb-6 overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-b from-[#141005] via-[#0d0d0d] to-[#0a0a0a] p-6 shadow-[0_0_35px_rgba(234,179,8,0.2)]">
      {/* Background arcade grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(234,179,8,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,0.15) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]"></div>

      {/* Gold neon bottom laser glow */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80 blur-[2px]"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-3 sm:gap-4 mb-0 relative z-10">
          <Skull className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,1)] print:text-black print:drop-shadow-none" />
          <h1 className="text-5xl sm:text-7xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-700 drop-shadow-[0_5px_15px_rgba(0,0,0,1)] print:text-black print:drop-shadow-none print:bg-none uppercase" style={{ WebkitTextStroke: '2px rgba(250,204,21,0.3)' }}>
            FREE FOR ALL
          </h1>
          <Target className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,1)] print:hidden" />
        </div>
        
        <div className="relative mt-2 text-xs sm:text-xl font-black tracking-[0.3em] sm:tracking-[0.4em] uppercase text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)] print:text-gray-700 flex items-center justify-center gap-2 sm:gap-4 z-20">
          <span className="w-8 sm:w-16 h-px bg-yellow-500/50 hidden sm:block shadow-[0_0_10px_rgba(234,179,8,0.8)]"></span>
          SOLO DEATHMATCH • EVERY PLAYER FOR THEMSELVES
          <span className="w-8 sm:w-16 h-px bg-yellow-500/50 hidden sm:block shadow-[0_0_10px_rgba(234,179,8,0.8)]"></span>
        </div>
      </div>
    </div>
  );
}

export function OverallBanner() {
  return (
    <div className="relative mb-6 mt-2 print:mb-4 overflow-hidden rounded-xl border border-yellow-500/40 bg-gradient-to-b from-[#171204] via-[#0d0c09] to-[#0a0a0a] p-5 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
      {/* Background arcade grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(234,179,8,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,0.18) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]"></div>

      {/* Gold bottom laser glow */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80 blur-[2px]"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-3 sm:gap-4 mb-0 relative z-10">
          <Trophy className="w-7 h-7 sm:w-9 sm:h-9 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,1)] print:text-black print:drop-shadow-none" />
          <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-700 drop-shadow-[0_5px_15px_rgba(0,0,0,1)] print:text-black print:drop-shadow-none print:bg-none uppercase" style={{ WebkitTextStroke: '2px rgba(250,204,21,0.3)' }}>
            OVERALL STANDINGS
          </h1>
          <Trophy className="w-7 h-7 sm:w-9 sm:h-9 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,1)] print:hidden" />
        </div>
        
        <div className="relative mt-2 text-[11px] sm:text-sm font-black tracking-[0.25em] sm:tracking-[0.35em] uppercase text-yellow-400/90 drop-shadow-[0_0_10px_rgba(234,179,8,0.6)] print:text-gray-700 flex items-center justify-center gap-2 sm:gap-4 z-20">
          <span className="w-6 sm:w-12 h-px bg-yellow-500/50 hidden sm:block"></span>
          SAMMENLAGT • TDM &amp; CTF TOURNAMENT CHAMPION
          <span className="w-6 sm:w-12 h-px bg-yellow-500/50 hidden sm:block"></span>
        </div>
      </div>
    </div>
  );
}



