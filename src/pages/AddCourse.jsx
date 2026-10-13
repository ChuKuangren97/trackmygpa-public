import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getGradeAndPoint } from '../lib/gpa';
import { BookOpen, ArrowLeft } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { showFriendlyError } from '../lib/errorHandler';

export default function AddCourse() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    credit_units: '',
    score: '',
    is_carryover: false
  });
  const [loading, setLoading] = useState(false);
  const [gradingScale, setGradingScale] = useState('5.0');

  // Fetch user's preferred grading scale once
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('grading_scale')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.grading_scale?.startsWith('4')) setGradingScale('4.0');
      });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");
      
      const score = parseFloat(formData.score);
      if (isNaN(score) || score < 0 || score > 100) {
        throw new Error("Score must be between 0 and 100");
      }
      
      const { grade, point } = getGradeAndPoint(score, gradingScale);
      
      const { error } = await supabase
        .from('courses')
        .insert([{
          user_id: user.id,
          semester_id: id,
          course_code: formData.course_code.toUpperCase(),
          course_name: formData.course_name,
          credit_units: parseInt(formData.credit_units, 10),
          score: score,
          grade: grade,
          grade_point: point,
          is_carryover: formData.is_carryover
        }]);
        
      if (error) throw error;
      navigate(`/semesters/${id}`);
    } catch (error) {
      console.error(error);
      showFriendlyError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({...formData, [e.target.name]: value});
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors duration-200">
      <nav className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={`/semesters/${id}`} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mr-4">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-emerald-500 dark:text-emerald-400" />
              Add Course
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto animate-fade-in-up bg-white dark:bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
              <input 
                type="text" 
                name="course_code" 
                placeholder="e.g. MTH101"
                required
                value={formData.course_code} 
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Name</label>
              <input 
                type="text" 
                name="course_name" 
                placeholder="e.g. General Mathematics I"
                required
                value={formData.course_name} 
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Credit Units</label>
                <input 
                  type="number" 
                  name="credit_units" 
                  min="1"
                  max="12"
                  placeholder="e.g. 3"
                  required
                  value={formData.credit_units} 
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Score (0-100)</label>
                <input 
                  type="number" 
                  name="score" 
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 75"
                  required
                  value={formData.score} 
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 pb-2">
              <input 
                type="checkbox" 
                id="is_carryover"
                name="is_carryover"
                checked={formData.is_carryover}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 outline-none"
              />
              <label htmlFor="is_carryover" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                This is a carry-over course
              </label>
            </div>

            <div className="pt-4 flex space-x-4">
               <button 
                type="button" 
                onClick={() => navigate(`/semesters/${id}`)}
                className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {loading ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
