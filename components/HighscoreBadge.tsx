import { HighscoreLevel } from '@/lib/survival-highscores';

export function HighscoreBadge({ level, className = '' }: { level: HighscoreLevel, className?: string }) {
  if (level === 'NONE') return null;

  if (level === 'YEAR') {
    return (
      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase bg-green-500/20 text-green-400 border border-green-500/30 print:bg-gray-200 print:text-black print:border-gray-400 ${className}`}>
        Highscore of the Year
      </span>
    );
  }

  if (level === 'MONTH') {
    return (
      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase bg-green-500/20 text-green-400 border border-green-500/30 print:bg-gray-200 print:text-black print:border-gray-400 ${className}`}>
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
