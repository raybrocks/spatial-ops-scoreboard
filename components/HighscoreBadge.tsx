import { HighscoreLevel } from '@/lib/survival-highscores';

export function HighscoreBadge({ level, className = '' }: { level: HighscoreLevel, className?: string }) {
  if (level === 'NONE') return null;

  if (level === 'YEAR') {
    return (
      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 print:bg-yellow-200 print:text-black print:border-yellow-400 ${className}`}>
        Highscore of the Year
      </span>
    );
  }

  if (level === 'MONTH') {
    return (
      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30 print:bg-gray-200 print:text-black print:border-gray-400 ${className}`}>
        Highscore of the Month
      </span>
    );
  }

  if (level === 'DAY') {
    return (
      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase bg-green-500/20 text-green-400 border border-green-500/30 print:bg-gray-200 print:text-black print:border-gray-400 ${className}`}>
        Highscore of the Day
      </span>
    );
  }

  return null;
}
