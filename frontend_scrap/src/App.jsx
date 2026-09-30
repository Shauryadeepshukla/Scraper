import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Filter, FileSpreadsheet, Play, RefreshCw,
  MapPin, Globe, Phone, Mail, UserCheck, Clock, History,
  AlertCircle, Sparkles, TrendingUp, Layers, ExternalLink,
  ChevronRight, Database, X, Loader2, LogIn, LogOut,
  UserPlus, User, Shield, CheckCircle2, ArrowRight,
  Edit2, Lock, FileText, Users, Settings, Tag,
  ChevronLeft, ChevronDown, ChevronsLeft, ChevronsRight,
  Square, CheckSquare, ListChecks, Zap
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const STATUS_COLORS = {
  NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CONTACTED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  QUALIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CONVERTED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  LOST: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const EXTRACTION_STATUS_COLORS = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
  RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const FIELD_LABELS = {
  name: 'Full Name', mobile: 'Phone Number', email: 'Email',
  city: 'City', location: 'Location / Address', website: 'Website',
  status: 'Lead Status', notes: 'Notes & Comments',
  next_follow_up: 'Next Follow-Up', assigned_counsellor_id: 'Assigned Counsellor',
  qualification: 'Qualification', programme_interested: 'Programme',
  institution: 'Institution',
};

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/* ─── Pagination Component ───────────────────────────────────────────────── */

function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange, loading }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const API_URL = import.meta.env.VITE_API_URL;
  const pages = useMemo(() => {
    const arr = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push('...');
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1">
      {/* Left: count info */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-400">
          Showing <span className="font-bold text-slate-200">{from}–{to}</span> of{' '}
          <span className="font-bold text-indigo-300">{total.toLocaleString()}</span> leads
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Per page:</span>
          <select
            value={limit}
            onChange={e => { onLimitChange(parseInt(e.target.value)); onPageChange(1); }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)} disabled={page === 1 || loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-700/60"
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)} disabled={page === 1 || loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-700/60"
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="px-1.5 text-slate-500 text-xs">…</span>
            : <button
              key={p}
              onClick={() => onPageChange(p)} disabled={loading}
              className={`min-w-[34px] h-[34px] rounded-xl text-xs font-bold transition-all border ${p === page
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60 hover:text-white'
                }`}
            >{p}</button>
        )}

        <button
          onClick={() => onPageChange(page + 1)} disabled={page >= totalPages || loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-700/60"
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)} disabled={page >= totalPages || loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-700/60"
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>

        {/* Jump-to-page */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-xs text-slate-500">Go to</span>
          <JumpToPage currentPage={page} totalPages={totalPages} onJump={onPageChange} />
        </div>
      </div>
    </div>
  );
}

function JumpToPage({ currentPage, totalPages, onJump }) {
  const [val, setVal] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const n = parseInt(val);
    if (n >= 1 && n <= totalPages) { onJump(n); setVal(''); }
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input
        type="number" min={1} max={totalPages} value={val}
        onChange={e => setVal(e.target.value)} placeholder={currentPage}
        className="w-14 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-200 text-center focus:outline-none focus:border-indigo-500"
      />
      <button type="submit"
        className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold border border-slate-600 transition-all">
        Go
      </button>
    </form>
  );
}

/* ─── App ────────────────────────────────────────────────────────────────── */

export default function App() {
  /* Auth */
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('lead_iq_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const s = localStorage.getItem('lead_iq_user');
    return s ? JSON.parse(s) : null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login | register_admin | register_counsellor
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  /* Navigation */
  const [activeTab, setActiveTab] = useState('leads');

  /* Leads */
  const [leadsData, setLeadsData] = useState({ items: [], total: 0, page: 1, limit: 20, total_pages: 1 });
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [counsellorFilter, setCounsellorFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  /* Bulk select */
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkCounsellorId, setBulkCounsellorId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  /* Counsellors list (Admin only) */
  const [counsellors, setCounsellors] = useState([]);

  /* Audit history modal (Admin only) */
  const [selectedLeadHistory, setSelectedLeadHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historySearch, setHistorySearch] = useState('');

  /* Status history modal */
  const [selectedStatusLead, setSelectedStatusLead] = useState(null);
  const [statusHistoryLoading, setStatusHistoryLoading] = useState(false);
  const [statusHistoryData, setStatusHistoryData] = useState([]);

  /* Edit modal */
  const [editingLead, setEditingLead] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  /* Assign modal (Admin only) */
  const [assigningLead, setAssigningLead] = useState(null);
  const [assignCounsellorId, setAssignCounsellorId] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  /* Extractions */
  const [extractions, setExtractions] = useState([]);
  const [loadingExtractions, setLoadingExtractions] = useState(false);
  const [sources, setSources] = useState([]);
  const [extractionForm, setExtractionForm] = useState({ source_id: '', url: '', duration_minutes: 1 });
  const [startingExtraction, setStartingExtraction] = useState(false);
  const [formError, setFormError] = useState('');

  /* Toast */
  const [toast, setToast] = useState(null);

  /* Health */
  const [isHealthy, setIsHealthy] = useState(true);

  /* Debounce for search */
  const searchTimer = useRef(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isCounsellor = currentUser?.role === 'COUNSELLOR';
  const leads = leadsData.items;

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const headers = useCallback(() => {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  }, [authToken]);

  /* ── Mount ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    fetch('/health').then(r => setIsHealthy(r.ok)).catch(() => setIsHealthy(false));
    if (authToken) fetchCurrentUser(authToken);
  }, []);

  useEffect(() => {
    if (currentUser && activeTab === 'leads') fetchLeads();
  }, [statusFilter, cityFilter, sourceFilter, counsellorFilter, page, limit, activeTab, currentUser]);

  /* Debounced search: reset to page 1 */
  useEffect(() => {
    if (!currentUser || activeTab !== 'leads') return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchLeads();
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    if (currentUser && activeTab === 'extractions') {
      fetchExtractions();
      const t = setInterval(fetchExtractions, 300000);
      return () => clearInterval(t);
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (isAdmin && currentUser) {
      fetchCounsellors();
      fetchSources();
    }
  }, [currentUser]);

  /* Clear selection when page/filters change */
  useEffect(() => { setSelectedIds(new Set()); }, [page, search, statusFilter, cityFilter, counsellorFilter]);

  /* ── Auth ────────────────────────────────────────────────────────────── */

  const fetchCurrentUser = async (token) => {
    const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const u = await r.json();
      setCurrentUser(u);
      localStorage.setItem('lead_iq_user', JSON.stringify(u));
    } else { handleLogout(); }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      let endpoint, fetchHeaders;
      if (authMode === 'login') {
        endpoint = '/api/auth/login';
        fetchHeaders = { 'Content-Type': 'application/json' };
      } else if (authMode === 'register_admin') {
        endpoint = '/api/auth/register';
        fetchHeaders = { 'Content-Type': 'application/json' };
      } else {
        endpoint = '/api/auth/register-counsellor';
        fetchHeaders = headers();
      }

      const body = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, password: authForm.password };

      const res = await fetch(endpoint, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(body) });
      const data = await res.json();

      if (res.ok) {
        if (authMode !== 'register_counsellor') {
          setAuthToken(data.access_token);
          setCurrentUser(data.user);
          localStorage.setItem('lead_iq_token', data.access_token);
          localStorage.setItem('lead_iq_user', JSON.stringify(data.user));
          showToast(`Welcome, ${data.user.name}! (${data.user.role})`);
        } else {
          showToast(`Counsellor "${data.user.name}" registered!`);
          fetchCounsellors();
        }
        setShowAuthModal(false);
        setAuthForm({ name: '', email: '', password: '' });
      } else {
        setAuthError(typeof data.detail === 'string' ? data.detail : 'Authentication failed');
      }
    } catch { setAuthError('Network error.'); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    setAuthToken(''); setCurrentUser(null);
    localStorage.removeItem('lead_iq_token');
    localStorage.removeItem('lead_iq_user');
    showToast('Signed out', 'info');
  };

  /* ── Data Fetching ───────────────────────────────────────────────────── */

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.append('search', search);
      if (statusFilter) p.append('status', statusFilter);
      if (cityFilter) p.append('city', cityFilter);
      if (sourceFilter) p.append('source_id', sourceFilter);
      if (isAdmin && counsellorFilter) p.append('assigned_counsellor_id', counsellorFilter);
      const r = await fetch(`/api/leads?${p}`, { headers: headers() });
      if (r.ok) {
        const data = await r.json();
        setLeadsData(data);
      }
    } catch { } finally { setLoadingLeads(false); }
  };

  const fetchCounsellors = async () => {
    try {
      const r = await fetch('/api/auth/counsellors', { headers: headers() });
      if (r.ok) setCounsellors(await r.json());
    } catch { }
  };

  const fetchSources = async () => {
    try {
      const r = await fetch('/api/sources', { headers: headers() });
      if (r.ok) {
        const data = await r.json();
        setSources(data);
        if (data.length > 0 && !extractionForm.source_id) {
          const gm = data.find(s => s.source_type === 'GOOGLE_MAPS') || data[0];
          setExtractionForm(f => ({ ...f, source_id: gm.id }));
        }
      }
    } catch { }
  };

  const fetchExtractions = async () => {
    setLoadingExtractions(true);
    try {
      const r = await fetch('/api/extractions', { headers: headers() });
      if (r.ok) setExtractions(await r.json());
    } catch { } finally { setLoadingExtractions(false); }
  };

  /* ── Bulk Select ─────────────────────────────────────────────────────── */

  const allCurrentIds = leads.map(l => l.id);
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every(id => selectedIds.has(id));
  const someSelected = allCurrentIds.some(id => selectedIds.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) { allCurrentIds.forEach(id => next.delete(id)); }
      else { allCurrentIds.forEach(id => next.add(id)); }
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* ── Bulk Assign ─────────────────────────────────────────────────────── */

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) return;
    setBulkAssigning(true);
    setBulkResult(null);
    try {
      const res = await fetch('/api/leads/bulk-assign', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          lead_ids: [...selectedIds],
          counsellor_id: bulkCounsellorId ? parseInt(bulkCounsellorId) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkResult({ success: true, msg: data.message });
        showToast(data.message);
        setSelectedIds(new Set());
        fetchLeads();
        setTimeout(() => { setShowBulkAssign(false); setBulkResult(null); }, 1800);
      } else {
        setBulkResult({ success: false, msg: data.detail || 'Bulk assign failed' });
      }
    } catch { setBulkResult({ success: false, msg: 'Network error' }); }
    finally { setBulkAssigning(false); }
  };

  /* ── Single Lead Actions ─────────────────────────────────────────────── */

  const handleUpdateStatus = async (lead, newStatus) => {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { showToast(`Status → ${newStatus}`); fetchLeads(); }
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    setEditFormData({
      name: lead.name || '', mobile: lead.mobile || '', email: lead.email || '',
      city: lead.city || '', location: lead.location || '', website: lead.website || '',
      status: lead.status || 'NEW', notes: lead.notes || '',
      next_follow_up: lead.next_follow_up ? lead.next_follow_up.substring(0, 16) : '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const payload = isCounsellor
        ? { notes: editFormData.notes, status: editFormData.status, next_follow_up: editFormData.next_follow_up || null }
        : { ...editFormData, next_follow_up: editFormData.next_follow_up || null };

      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingLead(null);
        showToast(isCounsellor ? 'Notes & status saved!' : 'Lead updated & audit logged!');
        fetchLeads();
      }
    } catch { } finally { setSavingEdit(false); }
  };

  const openAuditModal = async (lead) => {
    setSelectedLeadHistory(lead);
    setHistoryLoading(true); setHistorySearch('');
    try {
      const r = await fetch(`/api/leads/${lead.id}/history`, { headers: headers() });
      if (r.ok) setHistoryData(await r.json());
    } catch { } finally { setHistoryLoading(false); }
  };

  const openStatusHistoryModal = async (lead) => {
    setSelectedStatusLead(lead);
    setStatusHistoryLoading(true);
    try {
      const r = await fetch(`/api/leads/${lead.id}/status-history`, { headers: headers() });
      if (r.ok) setStatusHistoryData(await r.json());
    } catch { } finally { setStatusHistoryLoading(false); }
  };

  const openAssignModal = (lead) => {
    setAssigningLead(lead);
    setAssignCounsellorId(lead.assigned_counsellor_id ? String(lead.assigned_counsellor_id) : '');
  };

  const handleSaveAssign = async () => {
    setSavingAssign(true);
    try {
      const q = assignCounsellorId ? `?counsellor_id=${assignCounsellorId}` : '';
      const res = await fetch(`/api/leads/${assigningLead.id}/assign${q}`, {
        method: 'PUT', headers: headers(),
      });
      if (res.ok) {
        setAssigningLead(null);
        showToast('Lead assignment updated!');
        fetchLeads();
      }
    } catch { } finally { setSavingAssign(false); }
  };

  const handleStartExtraction = async (e) => {
    e.preventDefault(); setFormError('');
    if (!extractionForm.url) { setFormError('URL is required'); return; }
    setStartingExtraction(true);
    try {
      const res = await fetch('/api/extractions', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          source_id: parseInt(extractionForm.source_id),
          url: extractionForm.url,
          duration_minutes: parseFloat(extractionForm.duration_minutes),
        }),
      });
      if (res.ok) { setExtractionForm(f => ({ ...f, url: '' })); setActiveTab('extractions'); showToast('Extraction started!'); }
      else { const d = await res.json(); setFormError(d.detail || 'Failed'); }
    } catch { setFormError('Network error'); }
    finally { setStartingExtraction(false); }
  };

  const filteredHistory = useMemo(() => {
    if (!historySearch) return historyData;
    const t = historySearch.toLowerCase();
    return historyData.filter(h =>
      (h.field_name || '').toLowerCase().includes(t) ||
      (h.changed_by_name || '').toLowerCase().includes(t) ||
      (h.old_value || '').toLowerCase().includes(t) ||
      (h.new_value || '').toLowerCase().includes(t)
    );
  }, [historyData, historySearch]);
  const [assignmentFilter, setAssignmentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const filteredLeads = leads.filter((lead) => {
    // Assignment filter
    if (assignmentFilter === "unassigned" && lead.assigned_counsellor_id) {
      return false;
    }

    if (assignmentFilter === "assigned" && !lead.assigned_counsellor_id) {
      return false;
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();

      const createdAt = lead.created_at
        ? new Date(lead.created_at)
        : null;

      const updatedAt = lead.updated_at
        ? new Date(lead.updated_at)
        : null;

      if (dateFilter === "today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        if (!createdAt || createdAt < startOfToday) {
          return false;
        }
      }

      if (dateFilter === "last_7_days") {
        const date = new Date();
        date.setDate(date.getDate() - 7);

        if (!createdAt || createdAt < date) {
          return false;
        }
      }

      if (dateFilter === "last_30_days") {
        const date = new Date();
        date.setDate(date.getDate() - 30);

        if (!createdAt || createdAt < date) {
          return false;
        }
      }

      if (dateFilter === "updated_today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        if (!updatedAt || updatedAt < startOfToday) {
          return false;
        }
      }

      if (dateFilter === "updated_7_days") {
        const date = new Date();
        date.setDate(date.getDate() - 7);

        if (!updatedAt || updatedAt < date) {
          return false;
        }
      }
    }

    return true;
  });
  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 text-white shadow-2xl border border-indigo-400/30 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" /><span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">LeadIQ</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Pro</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Lead Management & Audit Engine</p>
            </div>
          </div>

          {currentUser && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80">
              {[
                { id: 'leads', label: 'Leads', icon: Database },
                ...(isAdmin ? [{ id: 'new_extraction', label: 'New Extraction', icon: Play }] : []),
                ...(isAdmin ? [{ id: 'extractions', label: 'Job History', icon: Layers }] : []),
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-xs border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-medium">{isHealthy ? 'API Active' : 'Offline'}</span>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => { setAuthMode('register_counsellor'); setAuthError(''); setAuthForm({ name: '', email: '', password: '' }); setShowAuthModal(true); }}
                    className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all">
                    <UserPlus className="w-3.5 h-3.5" /> + Counsellor
                  </button>
                )}
                <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 pr-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {currentUser.name}
                      <span className={`text-[10px] px-1.5 rounded font-semibold border ${isAdmin ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[130px]">{currentUser.email}</div>
                  </div>
                  <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all ml-1" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all">
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {!currentUser ? (
          <div className="max-w-lg mx-auto py-20 text-center">
            <div className="glass-panel p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Authentication Required</h2>
                <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
                  Sign in to view leads, manage data, and track changes. Counsellor accounts must be created by an Administrator.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Sign In
                </button>

              </div>
              <p className="text-[11px] text-slate-500 border-t border-slate-800 pt-4">
                🔒 Counsellors can only be registered by an Admin.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── LEADS TAB ─────────────────────────────────────────── */}
            {activeTab === 'leads' && (
              <div className="space-y-5">

                {isCounsellor && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300">
                    <UserCheck className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>You are viewing leads <strong>assigned to you</strong>. You can update status, notes, and schedule follow-ups.</span>
                  </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Leads', value: leadsData.total, icon: Database, color: 'indigo', sub: `Across ${leadsData.total_pages} pages` },
                    { label: 'New', value: leads.filter(l => l.status === 'NEW').length, icon: Sparkles, color: 'blue', sub: 'This page' },
                    { label: 'Active Pipeline', value: leads.filter(l => ['CONTACTED', 'QUALIFIED', 'CONVERTED'].includes(l.status)).length, icon: TrendingUp, color: 'emerald', sub: 'This page' },
                    { label: 'Lost', value: leads.filter(l => l.status === 'LOST').length, icon: AlertCircle, color: 'rose', sub: 'This page' },
                  ].map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} className="glass-card p-5 rounded-3xl border border-slate-800/80 hover:border-slate-700 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                        <div className={`p-2.5 rounded-2xl bg-${color}-500/10 text-${color}-400`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-3xl font-extrabold text-white">{value}</div>
                      <div className={`mt-1 text-xs text-${color}-400/90 font-medium`}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Filter Bar */}
                <div className="glass-panel p-4 rounded-3xl flex flex-wrap items-center gap-3 border border-slate-800/80 shadow-xl">
                  <div className="flex-1 min-w-[240px] relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search name, phone, email, institution…"
                      value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                      className="bg-slate-900/80 border border-slate-700/80 rounded-2xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                      <option value="">All Statuses</option>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <input type="text" placeholder="City" value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(1); }}
                      className="bg-slate-900/80 border border-slate-700/80 rounded-2xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-28" />
                    {isAdmin && counsellors.length > 0 && (
                      <select value={counsellorFilter} onChange={e => { setCounsellorFilter(e.target.value); setPage(1); }}
                        className="bg-slate-900/80 border border-slate-700/80 rounded-2xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                        <option value="">All Counsellors</option>
                        {counsellors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    <select
                      value={assignmentFilter}
                      onChange={e => {
                        setAssignmentFilter(e.target.value);
                        setPage(1);
                      }}
                      className="bg-slate-900/80 border border-slate-700/80 rounded-2xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">All Leads</option>
                      <option value="unassigned">Unassigned</option>
                      <option value="assigned">Assigned</option>
                    </select>

                    <select
                      value={dateFilter}
                      onChange={e => {
                        setDateFilter(e.target.value);
                        setPage(1);
                      }}
                      className="bg-slate-900/80 border border-slate-700/80 rounded-2xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">All Dates</option>
                      <option value="today">Created Today</option>
                      <option value="last_7_days">Created Last 7 Days</option>
                      <option value="last_30_days">Created Last 30 Days</option>
                      <option value="updated_today">Updated Today</option>
                      <option value="updated_7_days">Updated Last 7 Days</option>
                    </select>
                    {isAdmin && (
                      <button onClick={() => { const p = new URLSearchParams(); if (search) p.append('search', search); if (statusFilter) p.append('status', statusFilter); if (cityFilter) p.append('city', cityFilter); if (counsellorFilter) p.append('assigned_counsellor_id', counsellorFilter); window.open(`/api/leads/export?${p}`, '_blank'); }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all">
                        <FileSpreadsheet className="w-4 h-4" /> Export
                      </button>
                    )}
                    <button onClick={fetchLeads} className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/60" title="Refresh">
                      <RefreshCw className={`w-4 h-4 ${loadingLeads ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Bulk Action Bar — appears when items selected */}
                {isAdmin && selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600/15 to-purple-600/10 border border-indigo-500/30 shadow-lg shadow-indigo-600/10 animate-fade-in">
                    <div className="flex items-center gap-2 flex-1">
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-bold text-white">{selectedIds.size}</span>
                      <span className="text-sm text-slate-300">lead{selectedIds.size > 1 ? 's' : ''} selected</span>
                      <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2">Clear</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setBulkCounsellorId(''); setBulkResult(null); setShowBulkAssign(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" /> Bulk Assign
                      </button>
                    </div>
                  </div>
                )}

                {/* Leads Table */}
                <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          {isAdmin && (
                            <th className="py-4 pl-5 pr-2 w-10">
                              <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white transition-colors">
                                {allSelected
                                  ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                                  : someSelected
                                    ? <div className="w-4 h-4 rounded border-2 border-indigo-400 bg-indigo-400/20" />
                                    : <Square className="w-4 h-4" />}
                              </button>
                            </th>
                          )}
                          <th className="py-4 px-4">Lead</th>
                          <th className="py-4 px-4">Contact</th>
                          <th className="py-4 px-4">Location</th>
                          <th className="py-4 px-4">Status</th>
                          {isAdmin && <th className="py-4 px-4">Counsellor</th>}
                          <th className="py-4 px-4">Follow Up</th>
                          <th className="py-4 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {loadingLeads ? (
                          <tr><td colSpan={isAdmin ? 8 : 6} className="py-16 text-center text-slate-500">
                            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-indigo-400" /> Loading leads…
                          </td></tr>
                        ) : filteredLeads.length === 0 ? (
                          <tr><td colSpan={isAdmin ? 8 : 6} className="py-16 text-center text-slate-500">
                            {isCounsellor ? 'No leads assigned to you yet.' : 'No leads found matching filters.'}
                          </td></tr>
                        ) : filteredLeads.map(lead => {
                          const isSelected = selectedIds.has(lead.id);
                          return (
                            <tr key={lead.id}
                              className={`transition-colors ${isSelected ? 'bg-indigo-600/5 border-l-2 border-l-indigo-500' : 'hover:bg-slate-800/40'}`}>
                              {isAdmin && (
                                <td className="py-4 pl-5 pr-2">
                                  <button onClick={() => toggleSelect(lead.id)} className="text-slate-400 hover:text-indigo-400 transition-colors">
                                    {isSelected
                                      ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                                      : <Square className="w-4 h-4" />}
                                  </button>
                                </td>
                              )}

                              <td className="py-4 px-4">
                                <div className="font-bold text-white">{lead.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">{lead.lead_id}</span>
                                  {lead.google_maps_url && (
                                    <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-rose-400" /> Maps <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </td>

                              <td className="py-4 px-4 space-y-1">
                                {lead.mobile
                                  ? <div className="flex items-center gap-2 text-slate-200"><Phone className="w-3.5 h-3.5 text-emerald-400" />{lead.mobile}</div>
                                  : <div className="text-xs text-slate-500 italic">No Phone</div>}
                                {lead.email
                                  ? <div className="flex items-center gap-2 text-slate-400 text-xs"><Mail className="w-3.5 h-3.5 text-blue-400" />{lead.email}</div>
                                  : <div className="text-xs text-slate-500 italic">No Email</div>}
                                {lead.website && (
                                  <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                                    <Globe className="w-3 h-3" />
                                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="truncate max-w-[140px]">{lead.website}</a>
                                  </div>
                                )}
                              </td>

                              <td className="py-4 px-4 max-w-[180px]">
                                <p className="text-xs text-slate-300 line-clamp-2" title={lead.location}>
                                  {lead.location || lead.city || <span className="text-slate-500 italic">—</span>}
                                </p>
                              </td>

                              <td className="py-4 px-4">
                                <select value={lead.status} onChange={e => handleUpdateStatus(lead, e.target.value)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer transition-all ${STATUS_COLORS[lead.status] || STATUS_COLORS.NEW}`}>
                                  {STATUSES.map(s => <option key={s} value={s} className="bg-slate-900 text-slate-200">{s}</option>)}
                                </select>
                              </td>

                              {isAdmin && (
                                <td className="py-4 px-4 text-xs">
                                  {lead.assigned_counsellor_id
                                    ? <span className="text-emerald-300 font-medium flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {counsellors.find(c => c.id === lead.assigned_counsellor_id)?.name || `#${lead.assigned_counsellor_id}`}
                                    </span>
                                    : <span className="text-slate-500 italic">Unassigned</span>}
                                </td>
                              )}

                              <td className="py-4 px-4 text-xs">
                                {lead.next_follow_up
                                  ? <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 font-medium w-fit">
                                    <Clock className="w-3 h-3" />{new Date(lead.next_follow_up).toLocaleDateString()}
                                  </span>
                                  : <span className="text-slate-500 italic">—</span>}
                              </td>

                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <button onClick={() => openEditModal(lead)}
                                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-all inline-flex items-center gap-1">
                                    {isCounsellor ? <><FileText className="w-3 h-3" /> Notes</> : <><Edit2 className="w-3 h-3" /> Edit</>}
                                  </button>
                                  <button onClick={() => openStatusHistoryModal(lead)}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all inline-flex items-center gap-1">
                                    <History className="w-3.5 h-3.5 text-amber-400" /> History
                                  </button>
                                  {isAdmin && (
                                    <>
                                      <button onClick={() => openAuditModal(lead)}
                                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all inline-flex items-center gap-1">
                                        <Shield className="w-3 h-3 text-purple-400" /> Audit
                                      </button>
                                      <button onClick={() => openAssignModal(lead)}
                                        className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all inline-flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Assign
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Pagination ──────────────────────────────────── */}
                  {leadsData.total > 0 && (
                    <div className="px-5 py-4 border-t border-slate-800/80 bg-slate-900/40">
                      <Pagination
                        page={page}
                        totalPages={leadsData.total_pages}
                        total={leadsData.total}
                        limit={limit}
                        loading={loadingLeads}
                        onPageChange={(p) => setPage(p)}
                        onLimitChange={(l) => setLimit(l)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── NEW EXTRACTION ────────────────────────────────────── */}
            {activeTab === 'new_extraction' && isAdmin && (
              <div className="max-w-2xl mx-auto">
                <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400"><Play className="w-6 h-6" /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Extract Leads from Google Maps</h2>
                      <p className="text-xs text-slate-400">Background scraper job to discover new business leads.</p>
                    </div>
                  </div>
                  {formError && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />{formError}
                    </div>
                  )}
                  <form onSubmit={handleStartExtraction} className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Lead Source</label>
                      <select value={extractionForm.source_id} onChange={e => setExtractionForm(f => ({ ...f, source_id: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" required>
                        {sources.map(s => <option key={s.id} value={s.id}>{s.name} ({s.source_type})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Google Maps Search URL</label>
                      <input type="url" placeholder="https://www.google.com/maps/search/coaching+institutes+in+delhi"
                        value={extractionForm.url} onChange={e => setExtractionForm(f => ({ ...f, url: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Duration</label>
                      <div className="grid grid-cols-4 gap-3">
                        {[0.5, 1, 2, 5].map(m => (
                          <button key={m} type="button" onClick={() => setExtractionForm(f => ({ ...f, duration_minutes: m }))}
                            className={`py-2.5 rounded-2xl text-xs font-bold border transition-all ${extractionForm.duration_minutes === m ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'}`}>
                            {m} min{m > 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="submit" disabled={startingExtraction}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2">
                      {startingExtraction ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting…</> : <><Play className="w-5 h-5 fill-current" /> Start Extraction Job</>}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── JOB HISTORY ───────────────────────────────────────── */}
            {activeTab === 'extractions' && isAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Extraction Job History</h2>
                    <p className="text-xs text-slate-400">Live monitoring of background scraping jobs.</p>
                  </div>
                  <button onClick={fetchExtractions} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700">
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingExtractions ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {extractions.length === 0
                    ? <div className="col-span-2 glass-panel p-12 text-center text-slate-500 rounded-3xl">No extraction runs yet.</div>
                    : extractions.map(job => (
                      <div key={job.id} className="glass-card p-6 rounded-3xl space-y-4 border border-slate-800/80 hover:border-slate-700 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">Job #{job.id}</span>
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${EXTRACTION_STATUS_COLORS[job.status] || 'bg-slate-800'}`}>{job.status}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 truncate max-w-sm" title={job.url}>{job.url}</p>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <div>{job.duration_minutes} min</div>
                            <div className="mt-1 text-[11px] text-slate-500">{new Date(job.started_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-center">
                          <div><div className="text-xs text-slate-400">Found</div><div className="text-lg font-bold text-indigo-400">{job.records_found}</div></div>
                          <div><div className="text-xs text-slate-400">Added</div><div className="text-lg font-bold text-emerald-400">{job.records_added}</div></div>
                          <div><div className="text-xs text-slate-400">Dupes</div><div className="text-lg font-bold text-amber-400">{job.duplicates_found}</div></div>
                        </div>
                        {job.error_message && <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"><strong>Error:</strong> {job.error_message}</div>}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ══════════════════ MODALS ════════════════════════════════════ */}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl border border-slate-800 p-8 space-y-6 relative shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-2xl bg-slate-800/60"><X className="w-4 h-4" /></button>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                {authMode === 'login' ? 'Sign In' : authMode === 'register_counsellor' ? 'Register Counsellor' : 'Register Admin'}
              </h3>
              <p className="text-xs text-slate-400">
                {authMode === 'login' ? 'Access your LeadIQ workspace' : authMode === 'register_counsellor' ? 'Admin is creating a Counsellor account' : 'Create an Administrator account (public)'}
              </p>
            </div>
            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{authError}
              </div>
            )}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode !== 'login' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                  <input type="text" placeholder="e.g. Priya Sharma" required
                    value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
                <input type="email" placeholder="name@company.com" required
                  value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
                <input type="password" placeholder="••••••••" required
                  value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              </div>
              {authMode !== 'login' && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-bold text-white flex items-center justify-between">
                  <span>Account Role</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${authMode === 'register_counsellor' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}`}>
                    {authMode === 'register_counsellor' ? 'COUNSELLOR' : 'ADMINISTRATOR'}
                  </span>
                </div>
              )}
              <button type="submit" disabled={authLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 mt-2">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : authMode === 'login' ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> {authMode === 'register_counsellor' ? 'Create Counsellor' : 'Register Admin'}</>}
              </button>
            </form>
            {authMode !== 'register_counsellor' && (
              <div className="text-center pt-2 border-t border-slate-800">
                <button onClick={() => { setAuthMode(authMode === 'login' ? 'register_admin' : 'login'); setAuthError(''); }}
                  className="text-xs text-indigo-400 hover:underline font-semibold">
                  {authMode === 'login' ? "Need an Admin account? Register here" : "Already registered? Sign in"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BULK ASSIGN MODAL */}
      {showBulkAssign && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl border border-slate-800 p-7 space-y-5 relative shadow-2xl">
            <button onClick={() => setShowBulkAssign(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-2xl bg-slate-800/60"><X className="w-4 h-4" /></button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 text-indigo-400 border border-indigo-500/20">
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Bulk Assign Leads</h3>
                <p className="text-xs text-slate-400">
                  Assigning <span className="font-bold text-indigo-300">{selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''}</span> to a counsellor
                </p>
              </div>
            </div>

            {/* Selected lead IDs preview */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 max-h-28 overflow-y-auto">
              <div className="text-[10px] text-slate-500 font-semibold uppercase mb-2">Selected Leads</div>
              <div className="flex flex-wrap gap-1.5">
                {leads.filter(l => selectedIds.has(l.id)).map(l => (
                  <span key={l.id} className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg px-2 py-0.5 font-mono">{l.lead_id}</span>
                ))}
                {[...selectedIds].filter(id => !leads.find(l => l.id === id)).length > 0 && (
                  <span className="text-xs text-slate-400 italic">+ {[...selectedIds].filter(id => !leads.find(l => l.id === id)).length} from other pages</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Assign To</label>
              <select value={bulkCounsellorId} onChange={e => setBulkCounsellorId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                <option value="">— Unassign (no counsellor) —</option>
                {counsellors.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                ))}
              </select>
            </div>

            {bulkResult && (
              <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${bulkResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                {bulkResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {bulkResult.msg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowBulkAssign(false)} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700">Cancel</button>
              <button onClick={handleBulkAssign} disabled={bulkAssigning}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-60">
                {bulkAssigning
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</>
                  : <><Zap className="w-4 h-4 text-amber-300" /> Assign {selectedIds.size} Lead{selectedIds.size > 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT LEAD MODAL */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-xl w-full rounded-3xl border border-slate-800 p-6 space-y-4 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditingLead(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-2xl bg-slate-800/60"><X className="w-4 h-4" /></button>
            <h3 className="text-xl font-bold text-white">{isCounsellor ? `Notes & Status: ${editingLead.name}` : `Edit Lead: ${editingLead.name}`}</h3>
            {isCounsellor && <p className="text-xs text-slate-400">You can update status, notes, and follow-up date. Other fields are read-only.</p>}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {isCounsellor ? (
                <div className="grid grid-cols-2 gap-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300">
                  {[['Name', editingLead.name], ['Mobile', editingLead.mobile || '—'], ['Email', editingLead.email || '—'], ['City', editingLead.city || '—']].map(([l, v]) => (
                    <div key={l}><span className="text-slate-500 font-semibold block text-[10px] uppercase">{l}</span>{v}</div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-slate-400 mb-1 font-medium">Name *</label>
                      <input type="text" value={editFormData.name} required onChange={e => setEditFormData(f => ({ ...f, name: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500" /></div>
                    <div><label className="block text-slate-400 mb-1 font-medium">Mobile</label>
                      <input type="text" value={editFormData.mobile} onChange={e => setEditFormData(f => ({ ...f, mobile: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-slate-400 mb-1 font-medium">Email</label>
                      <input type="email" value={editFormData.email} onChange={e => setEditFormData(f => ({ ...f, email: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500" /></div>
                    <div><label className="block text-slate-400 mb-1 font-medium">City</label>
                      <input type="text" value={editFormData.city} onChange={e => setEditFormData(f => ({ ...f, city: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500" /></div>
                  </div>
                  <div><label className="block text-slate-400 mb-1 font-medium">Location / Address</label>
                    <input type="text" value={editFormData.location} onChange={e => setEditFormData(f => ({ ...f, location: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500" /></div>
                  <div><label className="block text-slate-400 mb-1 font-medium">Website</label>
                    <input type="text" value={editFormData.website} onChange={e => setEditFormData(f => ({ ...f, website: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500" /></div>
                </>
              )}

              <div><label className="block text-slate-400 mb-1 font-medium">Status</label>
                <select value={editFormData.status} onChange={e => setEditFormData(f => ({ ...f, status: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="block text-slate-400 mb-1 font-medium">Next Follow-Up Date</label>
                <input type="datetime-local" value={editFormData.next_follow_up} onChange={e => setEditFormData(f => ({ ...f, next_follow_up: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500" />
              </div>
              <div><label className="block font-bold text-slate-200 mb-1">Notes & Comments</label>
                <textarea rows="3" placeholder="Add follow-up notes, call summary, feedback…"
                  value={editFormData.notes} onChange={e => setEditFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingLead(null)} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">Cancel</button>
                <button type="submit" disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg flex items-center gap-2">
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isCounsellor ? 'Save Notes & Status' : 'Save & Log Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE ASSIGN MODAL */}
      {assigningLead && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full rounded-3xl border border-slate-800 p-6 space-y-5 relative shadow-2xl">
            <button onClick={() => setAssigningLead(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-2xl bg-slate-800/60"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400"><Users className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-white">Assign / Transfer Lead</h3>
                <p className="text-xs text-slate-400">{assigningLead.name} ({assigningLead.lead_id})</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Assign To Counsellor</label>
              <select value={assignCounsellorId} onChange={e => setAssignCounsellorId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                <option value="">— Unassigned —</option>
                {counsellors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setAssigningLead(null)} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm">Cancel</button>
              <button onClick={handleSaveAssign} disabled={savingAssign}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg flex items-center gap-2">
                {savingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS HISTORY MODAL */}
      {selectedStatusLead && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-xl w-full rounded-3xl border border-slate-800 p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setSelectedStatusLead(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-2xl bg-slate-800/60"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400"><History className="w-5 h-5" /></div>
              <div>
                <h3 className="text-xl font-bold text-white">Status Change History</h3>
                <p className="text-xs text-slate-400">{selectedStatusLead.name} ({selectedStatusLead.lead_id})</p>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {statusHistoryLoading
                ? <div className="text-center py-8 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" /> Loading…</div>
                : statusHistoryData.length === 0
                  ? <div className="text-center py-8 text-slate-500 text-sm">No status changes recorded.</div>
                  : statusHistoryData.map(h => (
                    <div key={h.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 line-through font-mono">{h.old_value || '—'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-emerald-400 font-bold">{h.new_value}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="flex items-center gap-1"><User className="w-3 h-3 text-purple-400" />{h.changed_by_name}</span>
                        <span className="font-mono">{h.changed_at ? new Date(h.changed_at).toLocaleString() : ''}</span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      {/* FULL AUDIT LOG MODAL */}
      {selectedLeadHistory && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full rounded-3xl border border-slate-800 p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setSelectedLeadHistory(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-2xl bg-slate-800/60"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400"><Shield className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-bold text-white">Full Field Audit Log</h3>
                <p className="text-xs text-slate-400"><strong className="text-slate-200">{selectedLeadHistory.name}</strong> ({selectedLeadHistory.lead_id}) — Admin view only</p>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Filter by field, user, value…"
                value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {historyLoading
                ? <div className="text-center py-10 text-slate-500 text-sm"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" /> Fetching audit trail…</div>
                : filteredHistory.length === 0
                  ? <div className="text-center py-10 text-slate-500 text-sm">No field changes recorded for this lead.</div>
                  : filteredHistory.map(h => (
                    <div key={h.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs hover:border-slate-700 transition-all">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20 uppercase text-[11px]">
                            {FIELD_LABELS[h.field_name] || h.field_name}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-purple-400" />
                            <strong className="text-white">{h.changed_by_name || 'System'}</strong>
                            {h.changed_by_email && <span className="text-slate-500">({h.changed_by_email})</span>}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[11px] font-mono">{h.changed_at ? new Date(h.changed_at).toLocaleString() : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                        <div className="flex-1 truncate">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">Old</span>
                          <span className="text-rose-400 line-through font-mono">{h.old_value || '— (empty)'}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <div className="flex-1 truncate">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">New</span>
                          <span className="text-emerald-400 font-bold font-mono">{h.new_value || '— (empty)'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
