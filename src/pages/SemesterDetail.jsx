import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getGradeAndPoint, calculateGPA } from '../lib/gpa';
import { BookOpen, Plus, ArrowLeft, Settings, Pencil, Check, X } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { showFriendlyError } from '../lib/errorHandler';

// ── Inline edit form for a single course row ──────────────────────────────────
function CourseEditRow({ course, scale = '5.0', onSave, onCancel }) {
  const [fields, setFields] = useState({
    course_code: course.course_code,
    course_name: course.course_name,
    credit_units: course.credit_units,
    score: course.score,
    is_carryover: course.is_carryover || false,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFields({ ...fields, [e.target.name]: value });
  };

  const handleSave = async () => {
    const confirmed = window.confirm(
      'You can only edit this course once. Are you sure?'
    );
    if (!confirmed) return;

    const score = parseFloat(fields.score);
    if (isNaN(score) || score < 0 || score > 100) {
      alert('Score must be between 0 and 100.');
      return;
    }

    const { grade, point: grade_point } = getGradeAndPoint(score, scale);

    setSaving(true);
    const { error } = await supabase
      .from('courses')
      .update({
        course_code: fields.course_code.toUpperCase().trim(),
        course_name: fields.course_name.trim(),
        credit_units: parseInt(fields.credit_units, 10),
        score,
        grade,
        grade_point,
        is_carryover: fields.is_carryover,
        edited: true,
      })
      .eq('id', course.id);
    setSaving(false);

    if (error) {
      showFriendlyError(error);
      return;
    }

    onSave({ ...course, course_code: fields.course_code.toUpperCase().trim(), course_name: fields.course_name.trim(), credit_units: parseInt(fields.credit_units, 10), score, grade, grade_point, is_carryover: fields.is_carryover, edited: true });
  };

  const inputCls =
    'w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border-2 border-emerald-400 dark:border-emerald-500 p-5 flex flex-col gap-3">
      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
        Editing — one time only
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Course Code</label>
          <input
            className={`${inputCls} uppercase`}
            name="course_code"
            value={fields.course_code}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Credit Units</label>
          <input
            className={inputCls}
            type="number"
            name="credit_units"
            min="1"
            max="12"
            value={fields.credit_units}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Course Name</label>
        <input
          className={inputCls}
          name="course_name"
          value={fields.course_name}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Score (0 – 100)</label>
        <input
          className={inputCls}
          type="number"
          name="score"
          min="0"
          max="100"
          step="0.1"
          value={fields.score}
          onChange={handleChange}
        />
      </div>

      <div className="flex items-center space-x-2 pt-1 pb-2">
        <input 
          type="checkbox" 
          id={`carryover-${course.id}`}
          name="is_carryover"
          checked={fields.is_carryover}
          onChange={handleChange}
          className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 outline-none"
        />
        <label htmlFor={`carryover-${course.id}`} className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          This is a carry-over course
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow shadow-emerald-500/20 transition-all active:scale-[0.97] disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SemesterDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [semester, setSemester] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  // Track which course (by id) is currently open for editing
  const [editingId, setEditingId] = useState(null);
  const [gradingScale, setGradingScale] = useState('5.0');

  useEffect(() => {
    if (!user) return;
    
    async function loadData() {
      try {
        const [semRes, coursesRes, profileRes] = await Promise.all([
          supabase.from('semesters').select('*').eq('id', id).eq('user_id', user.id).single(),
          supabase.from('courses').select('*').eq('semester_id', id).eq('user_id', user.id).order('created_at', { ascending: true }),
          supabase.from('profiles').select('grading_scale').eq('id', user.id).maybeSingle()
        ]);
        
        if (semRes.error) throw semRes.error;
        if (coursesRes.error) throw coursesRes.error;

        if (profileRes.data?.grading_scale?.startsWith('4')) setGradingScale('4.0');
        
        setSemester(semRes.data);
        setCourses(coursesRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id, user]);

  const handleSaved = (updated) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setEditingId(null);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white flex items-center justify-center">Loading...</div>;
  if (!semester) return <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white flex items-center justify-center">Semester not found.</div>;

  const currentGPA = calculateGPA(courses);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors duration-200">
      <nav className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mr-4">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {semester.level} - {semester.semester} Semester ({semester.academic_year})
            </h1>
          </div>
          <div className="flex items-center">
             <ThemeToggle />
             <Link to="/settings" className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <Settings className="w-5 h-5" />
             </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        {/* GPA Summary Card */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row gap-4 justify-between sm:items-center hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors">
          <div>
            <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-1">Semester GPA</p>
            <h2 className="text-4xl font-extrabold text-emerald-900 dark:text-white">{currentGPA} <span className="text-lg text-emerald-700/50 dark:text-slate-400 font-medium">/ 5.0</span></h2>
          </div>
          <Link 
            to={`/semesters/${id}/add-course`}
            className="flex items-center justify-center px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Course
          </Link>
        </div>

        {/* Courses List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-300 mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-slate-500 dark:text-slate-400" />
            Courses
          </h3>
          
          {courses.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center text-slate-500 dark:text-slate-400">
              No courses added yet. Click 'Add Course' to start tracking.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course =>
                editingId === course.id ? (
                  <CourseEditRow
                    key={course.id}
                    course={course}
                    scale={gradingScale}
                    onSave={handleSaved}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div key={course.id} className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors group">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">{course.course_code}</h4>
                          {course.is_carryover && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 uppercase tracking-wider">
                              Carry-over
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                          {course.grade} ({course.grade_point})
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-1 truncate" title={course.course_name}>{course.course_name}</p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-between items-center text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <span>{course.credit_units} Units</span>
                      <span>Score: {course.score}%</span>
                    </div>

                    {/* Edit button — only shown if not yet edited */}
                    {!course.edited && (
                      <button
                        onClick={() => setEditingId(course.id)}
                        className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400 text-xs font-medium transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
