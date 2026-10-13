import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { calculateGPA, getGradeAndPoint } from '../lib/gpa';
import { ArrowLeft, Calculator, Settings, AlertTriangle, CheckCircle2, TrendingUp, BookOpen, Target } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const BOUNDARIES = [
  { label: 'First Class', value: 4.50 },
  { label: 'Second Class Upper', value: 3.50 },
  { label: 'Second Class Lower', value: 2.40 },
  { label: 'Third Class', value: 1.50 },
];

function interpolateScore(gpa) {
  if (gpa >= 5.0) return 70;
  if (gpa >= 4.0) return 60 + (gpa - 4.0) * 10;
  if (gpa >= 3.0) return 50 + (gpa - 3.0) * 10;
  if (gpa >= 2.0) return 45 + (gpa - 2.0) * 5;
  if (gpa >= 1.0) return 40 + (gpa - 1.0) * 5;
  if (gpa > 0.0) return gpa * 40; // 0 to 40
  return 0;
}

export default function CGPASimulator() {
  const { user } = useAuth();

  // Fetched data
  const [currentCGPA, setCurrentCGPA] = useState(0);
  const [currentTotalUnits, setCurrentTotalUnits] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // Planner inputs
  const [targetCGPA, setTargetCGPA] = useState('');
  const [numCourses, setNumCourses] = useState(1);
  const [courses, setCourses] = useState([{ id: 1, name: '', units: '' }]);
  
  // Results
  const [plannerResult, setPlannerResult] = useState(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const [profileRes, coursesRes] = await Promise.all([
          supabase.from('profiles').select('target_cgpa').eq('id', user.id).maybeSingle(),
          supabase.from('courses').select('credit_units, grade_point').eq('user_id', user.id),
        ]);

        if (profileRes.data?.target_cgpa) {
          setTargetCGPA(profileRes.data.target_cgpa.toString());
        }

        const userCourses = coursesRes.data || [];
        const totalUnits = userCourses.reduce((sum, c) => sum + (parseFloat(c.credit_units) || 0), 0);
        const cgpa = parseFloat(calculateGPA(userCourses)) || 0;

        setCurrentCGPA(cgpa);
        setCurrentTotalUnits(totalUnits);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    }

    load();
  }, [user]);

  const handleNumCoursesChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0 && val <= 10) {
      setNumCourses(val);
      setCourses(prev => {
        const newCourses = [...prev];
        while (newCourses.length < val) {
          newCourses.push({ id: Date.now() + Math.random(), name: '', units: '' });
        }
        return newCourses.slice(0, val);
      });
      setPlannerResult(null); // Reset result on input change
    } else if (e.target.value === '') {
      setNumCourses('');
    }
  };

  const handleCourseChange = (index, field, value) => {
    const newCourses = [...courses];
    newCourses[index][field] = value;
    setCourses(newCourses);
    setPlannerResult(null);
  };

  const handleCalculate = () => {
    const target = parseFloat(targetCGPA);
    if (isNaN(target) || target < 0 || target > 5) {
      alert("Please enter a valid target CGPA between 0 and 5.");
      return;
    }

    let plannedUnits = 0;
    for (const c of courses) {
      const u = parseFloat(c.units);
      if (isNaN(u) || u < 1 || u > 6) {
        alert("Please ensure all courses have credit units between 1 and 6.");
        return;
      }
      plannedUnits += u;
    }

    const currentQualityPoints = currentCGPA * currentTotalUnits;
    const newTotalUnits = currentTotalUnits + plannedUnits;
    const requiredGPA = (target * newTotalUnits - currentQualityPoints) / plannedUnits;

    let status = 'ok';
    let minScore = 0;
    let minGrade = '';

    if (requiredGPA <= 0) {
      status = 'already-met';
    } else if (requiredGPA > 5) {
      status = 'too-high';
    } else {
      status = 'ok';
      minScore = Math.ceil(interpolateScore(requiredGPA));
      minGrade = getGradeAndPoint(minScore, '5.0').grade;
    }

    setPlannerResult({ requiredGPA, status, plannedUnits, minScore, minGrade, target });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Nav */}
      <nav className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/dashboard"
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight flex items-center">
              <Target className="h-5 w-5 mr-2 text-emerald-500 dark:text-emerald-400" />
              Target Grade Planner
            </h1>
          </div>
          <div className="flex items-center">
            <ThemeToggle />
            <Link
              to="/settings"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Planner */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Planner Form */}
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-emerald-500 dark:text-emerald-400" />
                Plan Next Semester
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target CGPA
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    placeholder="e.g. 4.50"
                    value={targetCGPA}
                    onChange={(e) => { setTargetCGPA(e.target.value); setPlannerResult(null); }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Planned Courses (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={numCourses}
                    onChange={handleNumCoursesChange}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-8">Course Name (Optional)</div>
                  <div className="col-span-4">Credit Units</div>
                </div>

                {courses.map((course, index) => (
                  <div key={course.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-8">
                      <span className="sm:hidden block text-xs font-medium text-slate-500 mb-1">Course {index+1} Name</span>
                      <input
                        type="text"
                        placeholder={`Course ${index+1}`}
                        value={course.name}
                        onChange={(e) => handleCourseChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <span className="sm:hidden block text-xs font-medium text-slate-500 mb-1">Units</span>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        placeholder="Units"
                        value={course.units}
                        onChange={(e) => handleCourseChange(index, 'units', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCalculate}
                className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Calculate Minimum Scores
              </button>
            </div>

            {/* Results Section */}
            {plannerResult && (
              <div className="space-y-6 animate-fade-in-up">
                
                {/* Result Status Banner */}
                <div
                  className={`rounded-2xl border shadow-xl p-6 transition-colors ${
                    plannerResult.status === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                      : plannerResult.status === 'already-met'
                      ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
                      : 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'
                  }`}
                >
                  {plannerResult.status === 'already-met' && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-blue-800 dark:text-blue-300 text-lg">You've already secured your target CGPA. Keep it up!</p>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          Your current CGPA of <strong>{currentCGPA.toFixed(2)}</strong> already meets your target.
                        </p>
                      </div>
                    </div>
                  )}

                  {plannerResult.status === 'too-high' && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-500 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-yellow-800 dark:text-yellow-300 text-lg">Target not achievable this semester alone</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                          You would need a GPA above 5.0 (specifically {plannerResult.requiredGPA.toFixed(2)}). Consider adjusting your target.
                        </p>
                      </div>
                    </div>
                  )}

                  {plannerResult.status === 'ok' && (
                    <div className="flex items-start gap-3">
                      <Calculator className="w-6 h-6 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-emerald-900 dark:text-emerald-300 text-lg">
                          You need an overall GPA of <span className="text-2xl ml-1">{plannerResult.requiredGPA.toFixed(2)}</span>
                        </p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                          To hit your target CGPA of {plannerResult.target.toFixed(2)}, you must score the minimums below across your {plannerResult.plannedUnits} units.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Course Output Cards */}
                {plannerResult.status === 'ok' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.map((course, i) => (
                      <div key={course.id} className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">
                          {course.name.trim() || `Course ${i + 1}`}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{course.units || 0} Units</p>
                        
                        <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Min Score</p>
                            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                              {plannerResult.minScore}<span className="text-sm font-medium text-slate-400">/100</span>
                            </p>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Grade</p>
                             <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold">
                               {plannerResult.minGrade}
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Snapshots & Boundaries */}
          <div className="space-y-6">
            
            {/* Snapshot */}
             <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl p-6">
               <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide flex items-center">
                 <BookOpen className="w-4 h-4 mr-2 text-blue-500" />
                 Your Snapshot
               </h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                   <span className="text-slate-500 dark:text-slate-400">Current CGPA</span>
                   <span className="font-black text-slate-900 dark:text-white text-xl">{loadingData ? '—' : currentCGPA.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-slate-500 dark:text-slate-400">Total Units</span>
                   <span className="font-bold text-slate-900 dark:text-white">{loadingData ? '—' : currentTotalUnits}</span>
                 </div>
               </div>
             </div>

            {/* Boundary Tracker widget */}
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                Class Boundaries
              </h3>
              
              <div className="space-y-5">
                {!loadingData && BOUNDARIES.map((boundary, i) => {
                  const isAchieved = currentCGPA >= boundary.value;
                  const pointsAway = (boundary.value - currentCGPA).toFixed(2);
                  
                  return (
                    <div key={i} className="flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-semibold ${isAchieved ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          {boundary.label}
                        </span>
                        <span className="text-sm font-medium text-slate-400">{boundary.value.toFixed(2)}</span>
                      </div>
                      
                      {isAchieved ? (
                        <div className="flex items-center text-xs font-bold text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Achieved!
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded inline-flex w-fit">
                          {pointsAway} points away
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
