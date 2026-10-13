import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { calculateGPA } from '../lib/gpa';
import { LogOut, BookOpen, Clock, Trophy, Plus, ChevronRight, TrendingUp, Settings, Menu, X, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [targetCgpa, setTargetCgpa] = useState(3.5);
  const [loading, setLoading] = useState(true);
  // Start blurred immediately if localStorage says so (before Supabase responds)
  const [cgpaBlurred, setCgpaBlurred] = useState(
    () => localStorage.getItem('cgpa_blurred') === 'true'
  );
  const [blurEnabled, setBlurEnabled] = useState(false); // tracks if blur is "on" per profile/ls
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    async function loadStats() {
      try {
        const [profileRes, semRes, coursesRes] = await Promise.all([
          supabase.from('profiles').select('target_cgpa, blur_cgpa').eq('id', user.id).maybeSingle(),
          supabase.from('semesters').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('courses').select('*').eq('user_id', user.id)
        ]);
        
        if (semRes.error) throw semRes.error;
        if (coursesRes.error) throw coursesRes.error;
        
        if (profileRes.data?.target_cgpa) {
          setTargetCgpa(profileRes.data.target_cgpa);
        }

        // Blur if profile says so OR if localStorage key is set
        const profileBlur = !!profileRes.data?.blur_cgpa;
        const localBlur   = localStorage.getItem('cgpa_blurred') === 'true';
        const shouldBlur  = profileBlur || localBlur;
        setBlurEnabled(shouldBlur);
        setCgpaBlurred(shouldBlur); // set/confirm initial visual state

        setSemesters(semRes.data || []);
        setCourses(coursesRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    
    loadStats();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  };

  const currentCGPA = calculateGPA(courses);
  const currentCGPANum = parseFloat(currentCGPA) || 0;
  const carryOverCount = courses.filter(c => c.is_carryover).length;

  // Process data for the trend chart
  const sortedSemesters = [...semesters].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const chartData = [];
  let accumulatedCourses = [];

  sortedSemesters.forEach(sem => {
    const semCourses = courses.filter(c => c.semester_id === sem.id);
    accumulatedCourses = [...accumulatedCourses, ...semCourses];
    
    const cgpaAtTime = calculateGPA(accumulatedCourses);
    
    chartData.push({
      name: `${sem.level} ${sem.semester}`,
      cgpa: parseFloat(cgpaAtTime) || 0
    });
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">TrackMyGPA</span>
            </div>
            {/* Right side: always-visible ThemeToggle, desktop icons, mobile hamburger */}
            <div className="flex items-center">
              {/* ThemeToggle — always visible */}
              <ThemeToggle />

              {/* Desktop-only icon links */}
              <Link
                to="/simulator"
                className="hidden md:flex p-2 mr-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="CGPA Simulator"
              >
                <TrendingUp className="w-5 h-5" />
              </Link>
              <Link
                to="/settings"
                className="hidden md:flex p-2 mr-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="hidden md:inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </button>

              {/* Mobile hamburger — shown below md */}
              <div className="relative md:hidden" ref={menuRef}>
                <button
                  onClick={() => setMobileMenuOpen((o) => !o)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label="Open menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {mobileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigate('/simulator'); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Simulator
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigate('/settings'); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      Settings
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-slate-200 dark:border-slate-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                Welcome back, <span className="text-emerald-500 dark:text-emerald-400">{user?.name || 'Student'}</span>!
              </h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Here's your academic progress at a glance.
              </p>
            </div>
            <Link 
              to="/add-semester"
              className="inline-flex items-center justify-center px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Semester
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* CGPA Card */}
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col justify-between items-start group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center justify-between w-full">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                  <Trophy className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Out of 5.0
                </span>
              </div>
              <div className="mt-4">
                {/* CGPA value — blur-aware */}
                <button
                  onClick={() => blurEnabled && setCgpaBlurred(b => !b)}
                  className={`flex items-center gap-2 group/cgpa focus:outline-none ${blurEnabled ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-label={blurEnabled ? (cgpaBlurred ? 'Reveal CGPA' : 'Hide CGPA') : undefined}
                  tabIndex={blurEnabled ? 0 : -1}
                >
                  <h3 className={`text-4xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors
                    ${cgpaBlurred ? 'blur-xl select-none' : ''}`}>
                    {loading ? '...' : currentCGPA}
                  </h3>
                  {blurEnabled && !loading && (
                    cgpaBlurred
                      ? <EyeOff className="w-4 h-4 text-slate-400 group-hover/cgpa:text-emerald-500 transition-colors shrink-0" />
                      : <Eye    className="w-4 h-4 text-slate-400 group-hover/cgpa:text-emerald-500 transition-colors shrink-0" />
                  )}
                </button>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Current CGPA</p>
                {carryOverCount > 0 && (
                  <p className="text-xs font-semibold text-red-500 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded inline-block">
                    Carry-over courses: {carryOverCount}
                  </p>
                )}
              </div>
            </div>

            {/* Semesters Card */}
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col justify-between items-start group hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                  {loading ? '...' : semesters.length}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Total Semesters</p>
              </div>
            </div>

            {/* Courses Card */}
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col justify-between items-start group hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors">
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                <BookOpen className="h-6 w-6 text-purple-500 dark:text-purple-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
                  {loading ? '...' : courses.length}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Total Courses</p>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="mt-8 bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 p-6">
            <div className="flex items-center mb-6">
              <TrendingUp className="h-6 w-6 mr-2 text-emerald-500 dark:text-emerald-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">CGPA Trend</h2>
            </div>
            
            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 animate-pulse">Loading chart...</div>
            ) : semesters.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                <TrendingUp className="h-10 w-10 mb-3 text-slate-400 dark:text-slate-500" />
                <p>Add your first semester to see your CGPA trend</p>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-30" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 5]} 
                      stroke="#94a3b8" 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      dx={10}
                      ticks={[0, 1, 2, 3, 4, 5]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', color: '#0f172a' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      formatter={(value) => [`${value.toFixed(2)} CGPA`, 'Performance']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cgpa" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Danger Zone Alert */}
            {!loading && semesters.length > 0 && currentCGPANum < targetCgpa && (
              <div className="mt-6 p-4 rounded-xl flex items-center font-medium border bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                <span className="mr-2 text-xl">⚠️</span>
                <span>
                  Your CGPA is currently {currentCGPANum.toFixed(2)}. You are {(targetCgpa - currentCGPANum).toFixed(2)} below your target of {targetCgpa.toFixed(2)}. 
                  You need strong performance this semester to recover.
                </span>
              </div>
            )}
          </div>

          {/* Semesters List */}
          <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-emerald-500 dark:text-emerald-400" />
              Your Semesters
            </h2>
            
            {loading ? (
              <div className="text-slate-400 animate-pulse">Loading semesters...</div>
            ) : semesters.length === 0 ? (
              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 mb-4">
                  <BookOpen className="h-8 w-8 text-slate-400 dark:text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No semesters yet</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">Start tracking your academic progress by adding your first semester.</p>
                <Link 
                  to="/add-semester"
                  className="inline-flex items-center justify-center px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Add Semester
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {semesters.map((sem, index) => {
                  const semCourses = courses.filter(c => c.semester_id === sem.id);
                  const semGPA = parseFloat(calculateGPA(semCourses));
                  
                  let diff = null;
                  // semesters array is sorted descending (newest first).
                  // semesters[index + 1] is chronologically the previous semester.
                  if (index < semesters.length - 1) {
                    const prevSem = semesters[index + 1];
                    const prevCourses = courses.filter(c => c.semester_id === prevSem.id);
                    const prevGPA = parseFloat(calculateGPA(prevCourses));
                    diff = semGPA - prevGPA;
                  }
                  
                  return (
                    <Link 
                      key={sem.id} 
                      to={`/semesters/${sem.id}`}
                      className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all hover:-translate-y-1 group block"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                            {sem.level} - {sem.semester}
                          </h3>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{sem.academic_year}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
                      </div>
                      
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-slate-600 dark:text-slate-400">{semCourses.length} Courses</span>
                          <span className="text-emerald-500 dark:text-emerald-400">GPA: {semGPA.toFixed(2)}</span>
                        </div>
                        {diff !== null && (
                          <div className={`text-xs font-semibold ${diff >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {diff >= 0 ? '▲' : '▼'} {diff > 0 ? '+' : ''}{diff.toFixed(2)} from last semester
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
