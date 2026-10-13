import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Calendar } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { showFriendlyError } from '../lib/errorHandler';

export default function AddSemester() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    level: '100L',
    semester: 'First',
    academic_year: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from('semesters')
        .insert([{
          user_id: user.id,
          level: formData.level,
          semester: formData.semester,
          academic_year: formData.academic_year
        }])
        .select()
        .single();
        
      if (error) throw error;
      navigate(`/semesters/${data.id}`);
    } catch (error) {
      console.error(error);
      showFriendlyError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md mx-auto animate-fade-in-up">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
            <Calendar className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Add Semester</h1>
        </div>

        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Level</label>
              <select 
                name="level" 
                value={formData.level} 
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                {['100L', '200L', '300L', '400L', '500L', '600L'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
              <select 
                name="semester" 
                value={formData.semester} 
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="First">First</option>
                <option value="Second">Second</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Year</label>
              <input 
                type="text" 
                name="academic_year" 
                placeholder="e.g. 2024/2025"
                required
                value={formData.academic_year} 
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {loading ? 'Saving...' : 'Save Semester'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
