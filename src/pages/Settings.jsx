import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Settings as SettingsIcon, ArrowLeft, ChevronRight, ChevronLeft,
  User, BookOpen, Eye, Shield,
  CheckCircle2, AlertCircle, KeyRound, Trash2, Target
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

// ─── Shared helpers ──────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm';

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

const LEVELS = ['100L', '200L', '300L', '400L', '500L', '600L'];

function Banner({ status, msg }) {
  if (!status) return null;
  const styles = {
    success: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    unchanged: 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400',
    error: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400',
  };
  const Icon = status === 'error' ? AlertCircle : CheckCircle2;
  const text = status === 'success' ? 'Saved successfully!' : status === 'unchanged' ? 'No changes to save.' : msg;
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium ${styles[status]}`}>
      <Icon className="w-4 h-4 shrink-0" />{text}
    </div>
  );
}

function SubViewShell({ title, onBack, children }) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors focus:outline-none"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      {children}
    </div>
  );
}

// ─── Sub-view 1: Edit Profile ────────────────────────────────────────────────

function EditProfile({ profileData, onSaved, onCancel }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const original = useRef({});

  const [form, setForm] = useState({
    full_name: '', university: '', department: '', current_level: '', target_cgpa: '',
  });
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileData) return;
    const loaded = {
      full_name: profileData.full_name || '',
      university: profileData.university || '',
      department: profileData.department || '',
      current_level: profileData.current_level || '',
      target_cgpa: profileData.target_cgpa ?? '',
    };
    original.current = loaded;
    setForm(loaded);
  }, [profileData]);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setStatus(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus(null); setErrorMsg('');
    const changes = {};
    const orig = original.current;
    if (form.full_name.trim() !== orig.full_name) changes.full_name = form.full_name.trim();
    if (form.university.trim() !== orig.university) changes.university = form.university.trim();
    if (form.department.trim() !== orig.department) changes.department = form.department.trim();
    if (form.current_level !== orig.current_level) changes.current_level = form.current_level;
    if (form.target_cgpa !== '') {
      const cgpa = parseFloat(form.target_cgpa);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 5) { setErrorMsg('Target CGPA must be 0–5.'); setStatus('error'); return; }
      if (cgpa !== parseFloat(orig.target_cgpa)) changes.target_cgpa = cgpa;
    }
    if (Object.keys(changes).length === 0) { setStatus('unchanged'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update(changes).eq('id', user.id);
      if (error) throw error;
      original.current = { ...orig, ...changes };
      setStatus('success');
      onSaved?.({ ...profileData, ...changes });
    } catch (err) { setErrorMsg(err.message); setStatus('error'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className={labelCls}>Full Name</label>
        <input name="full_name" type="text" placeholder="e.g. Chidi Okonkwo"
          value={form.full_name} onChange={handleChange} className={inputCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>University</label>
          <input name="university" type="text" placeholder="e.g. UNILAG"
            value={form.university} onChange={handleChange} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <input name="department" type="text" placeholder="e.g. Computer Science"
            value={form.department} onChange={handleChange} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Current Level</label>
          <select name="current_level" value={form.current_level} onChange={handleChange} className={inputCls}>
            <option value="">— Select —</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Target CGPA</label>
          <input name="target_cgpa" type="number" min="0" max="5" step="0.01" placeholder="e.g. 4.50"
            value={form.target_cgpa} onChange={handleChange} className={inputCls} />
        </div>
      </div>
      <Banner status={status} msg={errorMsg} />
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-view 2: Academic Preferences ───────────────────────────────────────

function AcademicPreferences({ profileData, onSaved }) {
  const { user } = useAuth();
  const [scale, setScale] = useState(profileData?.grading_scale || '5.0 (Nigerian)');
  const [scaleStatus, setScaleStatus] = useState(null);
  const [scaleErr, setScaleErr] = useState('');
  const [scaleLoading, setScaleLoading] = useState(false);

  const [target, setTarget] = useState(profileData?.target_cgpa ?? '');
  const [targetStatus, setTargetStatus] = useState(null);
  const [targetErr, setTargetErr] = useState('');
  const [targetLoading, setTargetLoading] = useState(false);

  const saveScale = async () => {
    setScaleStatus(null); setScaleErr(''); setScaleLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ grading_scale: scale }).eq('id', user.id);
      if (error) throw error;
      setScaleStatus('success');
      onSaved?.({ ...profileData, grading_scale: scale });
    } catch (err) { setScaleErr(err.message); setScaleStatus('error'); }
    finally { setScaleLoading(false); }
  };

  const saveTarget = async () => {
    setTargetStatus(null); setTargetErr('');
    const val = parseFloat(target);
    if (isNaN(val) || val < 0 || val > 5) { setTargetErr('Must be 0–5.'); setTargetStatus('error'); return; }
    setTargetLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ target_cgpa: val }).eq('id', user.id);
      if (error) throw error;
      setTargetStatus('success');
      onSaved?.({ ...profileData, target_cgpa: val });
    } catch (err) { setTargetErr(err.message); setTargetStatus('error'); }
    finally { setTargetLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Grading scale */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Grading Scale</label>
          <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600">
            {['5.0 (Nigerian)', '4.0 (International)'].map(opt => (
              <button key={opt} type="button"
                onClick={() => { setScale(opt); setScaleStatus(null); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors focus:outline-none
                  ${scale === opt
                    ? 'bg-emerald-500 text-white'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        <Banner status={scaleStatus} msg={scaleErr} />
        <button onClick={saveScale} disabled={scaleLoading}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {scaleLoading ? 'Saving…' : 'Save Grading Scale'}
        </button>
      </div>

      <hr className="border-slate-200 dark:border-slate-700/60" />

      {/* Target CGPA */}
      <div className="space-y-3">
        <div>
          <label className={`${labelCls} flex items-center gap-1.5`}>
            <Target className="w-4 h-4 text-emerald-500" /> Target CGPA
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Drives the warning banner on your Dashboard.
          </p>
          <div className="flex gap-2">
            <input type="number" min="0" max="5" step="0.01" placeholder="e.g. 4.50"
              value={target} onChange={e => { setTarget(e.target.value); setTargetStatus(null); }}
              className={`${inputCls} flex-1`} />
            <button onClick={saveTarget} disabled={targetLoading}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow shadow-emerald-500/20 transition-all active:scale-[0.97] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-nowrap">
              {targetLoading ? '…' : 'Set Target'}
            </button>
          </div>
        </div>
        <Banner status={targetStatus} msg={targetErr} />
      </div>
    </div>
  );
}

// ─── Sub-view 3: Privacy ─────────────────────────────────────────────────────

function Privacy({ profileData, onSaved }) {
  const { user } = useAuth();
  const [blurOnLoad, setBlurOnLoad] = useState(!!profileData?.blur_cgpa);
  const [blurStatus, setBlurStatus] = useState(null);
  const [blurErr, setBlurErr] = useState('');
  const [blurLoading, setBlurLoading] = useState(false);

  // "Blur Now" — driven by localStorage key 'cgpa_blurred'
  const [blurNow, setBlurNow] = useState(() => localStorage.getItem('cgpa_blurred') === 'true');

  const handleBlurOnLoad = async (val) => {
    setBlurOnLoad(val); setBlurStatus(null); setBlurErr(''); setBlurLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ blur_cgpa: val }).eq('id', user.id);
      if (error) throw error;
      setBlurStatus('success');
      onSaved?.({ ...profileData, blur_cgpa: val });
    } catch (err) { setBlurOnLoad(!val); setBlurErr(err.message); setBlurStatus('error'); }
    finally { setBlurLoading(false); }
  };

  const handleBlurNow = () => {
    const next = !blurNow;
    setBlurNow(next);
    localStorage.setItem('cgpa_blurred', String(next));
  };

  return (
    <div className="space-y-6">
      {/* Blur on load */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Blur CGPA on load</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Blur your CGPA when the site first opens. Click the CGPA to reveal it.
          </p>
          {blurStatus && <div className="mt-2"><Banner status={blurStatus} msg={blurErr} /></div>}
        </div>
        <button type="button" onClick={() => handleBlurOnLoad(!blurOnLoad)} disabled={blurLoading}
          aria-pressed={blurOnLoad}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50
            ${blurOnLoad ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
          <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 absolute top-1
            ${blurOnLoad ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <hr className="border-slate-200 dark:border-slate-700/60" />

      {/* Blur now */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Blur CGPA on page</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Instantly hide or reveal your CGPA on the Dashboard right now.
          </p>
        </div>
        <button type="button" onClick={handleBlurNow}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500
            ${blurNow
              ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400'}`}>
          {blurNow ? 'Unblur' : 'Blur Now'}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-view 4: Account ─────────────────────────────────────────────────────

function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Change password
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwStatus, setPwStatus] = useState(null);
  const [pwErr, setPwErr] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [deleteErr, setDeleteErr] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwStatus(null); setPwErr('');
    if (!newPw || newPw !== confirmPw) { setPwErr('Passwords do not match.'); setPwStatus('error'); return; }
    if (newPw.length < 8) { setPwErr('Password must be at least 8 characters.'); setPwStatus('error'); return; }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwStatus('success');
      setNewPw(''); setConfirmPw('');
      setTimeout(() => { setShowPwForm(false); setPwStatus(null); }, 1500);
    } catch (err) { setPwErr(err.message); setPwStatus('error'); }
    finally { setPwLoading(false); }
  };

  const handleDelete = async () => {
    if (deleteWord !== 'DELETE') { setDeleteErr('Type DELETE exactly.'); setDeleteStatus('error'); return; }
    setDeleteLoading(true); setDeleteStatus(null); setDeleteErr('');
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      setDeleteErr('Contact support to complete deletion. (' + (err.message || 'RPC not found') + ')');
      setDeleteStatus('error');
    } finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Change password */}
      {!showPwForm ? (
        <button onClick={() => setShowPwForm(true)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <KeyRound className="w-4 h-4 text-slate-500" /> Change Password
        </button>
      ) : (
        <form onSubmit={handlePasswordSave} className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-slate-500" /> Change Password
          </p>
          <div>
            <label className={labelCls}>New Password</label>
            <input type="password" placeholder="min 8 characters" value={newPw}
              onChange={e => { setNewPw(e.target.value); setPwStatus(null); }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Confirm Password</label>
            <input type="password" placeholder="••••••••" value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setPwStatus(null); }} className={inputCls} />
          </div>
          <Banner status={pwStatus} msg={pwErr} />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setShowPwForm(false); setPwStatus(null); setNewPw(''); setConfirmPw(''); }}
              className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={pwLoading}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow shadow-emerald-500/20 transition-all active:scale-[0.97] disabled:opacity-50">
              {pwLoading ? 'Saving…' : 'Save Password'}
            </button>
          </div>
        </form>
      )}

      {/* Delete account */}
      {!showDelete ? (
        <button onClick={() => setShowDelete(true)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400">
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      ) : (
        <div className="space-y-3 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-500/5">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> Delete Account
          </p>
          <p className="text-xs text-red-600 dark:text-red-400/80">
            This will permanently delete your account and all your data. Type <strong>DELETE</strong> to confirm.
          </p>
          <input type="text" placeholder="Type DELETE" value={deleteWord}
            onChange={e => { setDeleteWord(e.target.value); setDeleteStatus(null); }}
            className={`${inputCls} border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-400`} />
          <Banner status={deleteStatus} msg={deleteErr} />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowDelete(false); setDeleteWord(''); setDeleteStatus(null); }}
              className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} disabled={deleteLoading || deleteWord !== 'DELETE'}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40">
              {deleteLoading ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings hub ─────────────────────────────────────────────────────────────

const MENU = [
  { id: 'profile',     icon: User,    label: 'Edit Profile',          sub: 'Name, university, department, level' },
  { id: 'academic',    icon: BookOpen, label: 'Academic Preferences',  sub: 'Grading scale and target CGPA' },
  { id: 'privacy',     icon: Eye,     label: 'Privacy',               sub: 'CGPA visibility' },
  { id: 'account',     icon: Shield,  label: 'Account',               sub: 'Password and account management' },
];

export default function Settings() {
  const navigate = useNavigate();

  const [view, setView] = useState('hub'); // 'hub' | 'profile' | 'academic' | 'privacy' | 'account'
  const [profileData, setProfileData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles')
      .select('full_name, university, department, current_level, target_cgpa, grading_scale, blur_cgpa')
      .eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfileData(data); });
  }, [user]);

  const handleSaved = (updated) => setProfileData(updated);

  const currentTitle = MENU.find(m => m.id === view)?.label ?? 'Settings';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Nav */}
      <nav className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            {view === 'hub' ? (
              <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
            ) : (
              <button onClick={() => setView('hub')} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mr-4">
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
            <h1 className="text-xl font-bold tracking-tight flex items-center">
              <SettingsIcon className="h-5 w-5 mr-2 text-emerald-500 dark:text-emerald-400" />
              {view === 'hub' ? 'Settings' : currentTitle}
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto animate-fade-in-up bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 p-6 sm:p-8">

          {/* Hub list */}
          {view === 'hub' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {MENU.map(({ id, icon: Icon, label, sub }) => (
                <button key={id} onClick={() => setView(id)}
                  className="flex items-center gap-4 w-full py-4 text-left group hover:bg-slate-50 dark:hover:bg-slate-700/30 -mx-2 px-2 rounded-xl transition-colors first:pt-2 last:pb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 shrink-0">
                    <Icon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Sub-views */}
          {view === 'profile' && (
            <SubViewShell title="Edit Profile" onBack={() => setView('hub')}>
              <EditProfile profileData={profileData} onSaved={handleSaved} onCancel={() => navigate('/dashboard')} />
            </SubViewShell>
          )}
          {view === 'academic' && (
            <SubViewShell title="Academic Preferences" onBack={() => setView('hub')}>
              <AcademicPreferences profileData={profileData} onSaved={handleSaved} />
            </SubViewShell>
          )}
          {view === 'privacy' && (
            <SubViewShell title="Privacy" onBack={() => setView('hub')}>
              <Privacy profileData={profileData} onSaved={handleSaved} />
            </SubViewShell>
          )}
          {view === 'account' && (
            <SubViewShell title="Account" onBack={() => setView('hub')}>
              <Account />
            </SubViewShell>
          )}

        </div>
      </main>
    </div>
  );
}
