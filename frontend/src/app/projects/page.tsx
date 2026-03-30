"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../constants";
import { safeFetch } from "../utils/api_utils";
import { 
  LayoutDashboard, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Folder, 
  Calendar, 
  User, 
  Briefcase,
  MapPin,
  Pencil,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  manager: string;
  start_date: string;
  end_date: string;
  note: string;
  created_at: string;
  updated_at: string;
  files: any[];
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 表單欄位
  const [formName, setFormName] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formManager, setFormManager] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDepth, setFormDepth] = useState(2);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    const { data, error, ok } = await safeFetch(`${API_BASE_URL}/projects`);
    if (ok) {
      setProjects(data);
    } else {
      setError(error || "連線後端失敗");
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          client: formClient,
          location: formLocation,
          manager: formManager,
          start_date: formStartDate,
          end_date: formEndDate,
          note: formNote,
          classification_depth: formDepth,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setShowForm(false);
        resetForm();
        fetchProjects();
      }
    } catch (err) {
      console.error("建立專案失敗");
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormClient("");
    setFormLocation("");
    setFormManager("");
    setFormStartDate("");
    setFormEndDate("");
    setFormNote("");
    setFormDepth(2);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("確定要刪除此專案嗎？此操作無法復原。")) return;
    try {
      await fetch(`${API_BASE_URL}/projects/${id}`, { method: "DELETE" });
      fetchProjects();
    } catch (err) {
      console.error("刪除失敗");
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-[4%] py-8">
      <div className="w-full">
        <header className="mb-12 flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-[32px] font-semibold text-slate-800 tracking-tight flex items-center gap-3">
              <LayoutDashboard size={32} className="text-blue-500" /> 專案管理中心
            </h1>
            <p className="text-slate-400 font-medium ml-1">建立專案後即可上傳標單進行智慧解析</p>
          </div>
          <div className="flex gap-4">
            <button
                onClick={() => router.push("/projects/settings")}
                className="bg-white/70 backdrop-blur-3xl text-slate-600 px-6 py-3 rounded-full font-semibold border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
                <Settings size={18} /> 分類設定
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-[#007AFF] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#0071E3] transition-all shadow-[0_8px_20px_rgba(0,122,255,0.2)] flex items-center gap-2 active:scale-95"
            >
              <Plus size={20} /> 新建專案
            </button>
          </div>
        </header>

        {/* 新建專案表單 */}
        {showForm && (
          <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                 <Plus size={20} className="text-blue-600" />
               </div>
               <h2 className="text-xl font-semibold text-slate-800 tracking-tight">建立新專案</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">專案名稱 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例：○○建設 A7 機電工程"
                  className="w-full bg-slate-50/50 border border-slate-100/80 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm placeholder:text-slate-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">業主 / 甲方</label>
                <input
                  type="text"
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                  placeholder="單位名稱"
                  className="w-full bg-slate-50/50 border border-slate-100/80 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm placeholder:text-slate-300"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">工地位置</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="縣市、行政區或地址"
                  className="w-full bg-slate-50/50 border border-slate-100/80 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm placeholder:text-slate-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">專案負責人</label>
                <input
                  type="text"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                  placeholder="姓名"
                  className="w-full bg-slate-50/50 border border-slate-100/80 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">開始日期</label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-100/80 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">預計結束日期</label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-100/80 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">備註說明</label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="其他補充說明..."
                  className="w-full bg-slate-50/50 border border-slate-100/80 rounded-[24px] px-5 py-4 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm min-h-[100px] placeholder:text-slate-300"
                />
              </div>
            </div>
            
            <div className="mt-10 flex justify-end gap-4 border-t border-slate-100 pt-8">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-8 py-3 text-slate-400 hover:text-slate-600 font-semibold transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!formName.trim()}
                className="bg-[#007AFF] text-white px-10 py-3 rounded-full font-semibold hover:bg-[#0071E3] disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                確認建立專案
              </button>
            </div>
          </div>
        )}

        {/* 專案列表 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-slate-400">載入中...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-rose-50/50 rounded-[40px] border border-rose-100">
            <AlertCircle size={40} className="text-rose-500" />
            <div className="text-center">
              <p className="text-rose-700 font-bold">{error}</p>
              <p className="text-slate-400 text-xs mt-1">請確認後端服務 (Port 8002) 是否已正確啟動。</p>
            </div>
            <button 
              onClick={fetchProjects}
              className="mt-2 px-6 py-2 bg-rose-500 text-white rounded-full font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} /> 重新連線
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 bg-white/50 backdrop-blur-3xl rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-[28px] bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 text-slate-300">
               <Folder size={40} />
            </div>
            <p className="text-slate-500 text-xl font-semibold tracking-tight">目前尚無專案紀錄</p>
            <p className="text-slate-400 font-medium mt-2 max-w-xs mx-auto leading-relaxed">請點擊右上方「新建專案」按鈕，開啟您的第一個智慧採購專案</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => router.push(`/projects/${proj.id}`)}
                className="group bg-white/80 backdrop-blur-3xl rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-blue-200/50 transition-all duration-500 cursor-pointer flex justify-between items-center relative overflow-hidden"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-[#007AFF] transition-colors duration-300">
                      {proj.name}
                    </h3>
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      <Briefcase size={10} /> {proj.files?.length || 0} 份標單
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-10 text-[13px] text-slate-500">
                    {proj.manager && (
                      <div className="flex items-center gap-2 group-hover:text-slate-700 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <User size={12} />
                        </div>
                        <span className="font-medium">負責人：</span>
                        <span className="text-slate-600 font-semibold">{proj.manager}</span>
                      </div>
                    )}
                    {proj.client && (
                      <div className="flex items-center gap-2 group-hover:text-slate-700 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <Briefcase size={12} />
                        </div>
                        <span className="font-medium">業主：</span>
                        <span className="text-slate-600 font-semibold">{proj.client}</span>
                      </div>
                    )}
                    {(proj.start_date || proj.end_date) && (
                      <div className="flex items-center gap-2 group-hover:text-slate-700 transition-colors lg:col-span-1">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <Calendar size={12} />
                        </div>
                        <span className="font-medium">時程：</span>
                        <span className="text-slate-600 font-semibold">{formatDate(proj.start_date)} ~ {formatDate(proj.end_date)}</span>
                      </div>
                    )}
                    {proj.note && (
                      <div className="lg:col-span-3 mt-1 text-slate-400 italic flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50">
                        <Pencil size={12} className="shrink-0" />
                        <span className="truncate">備註：{proj.note}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <button
                    onClick={(e) => handleDelete(proj.id, e)}
                    className="w-11 h-11 rounded-2xl bg-white text-slate-300 hover:text-rose-500 hover:bg-rose-50 hover:shadow-sm transition-all flex items-center justify-center shadow-sm border border-slate-100"
                    title="刪除專案"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-300 group-hover:bg-[#007AFF] group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 transition-all duration-500 flex items-center justify-center group-hover:scale-110 active:scale-95">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
