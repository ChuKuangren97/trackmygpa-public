import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in-up">
        {/* Brand */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 mb-6 shadow-lg shadow-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">TrackMyGPA</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium px-4">Your academic scoreboard. Always know where you stand.</p>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col space-y-4 pt-8 w-full max-w-sm mx-auto">
          <Link
            to="/signup"
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
