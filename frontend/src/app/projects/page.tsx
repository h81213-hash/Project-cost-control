"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../constants";

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
    try {
      const res = await fetch(`${API_BASE_URL}/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("無法連線至後端");
    } finally {
      setLoading(false);
    }
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
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">📋 專案管理中心</h1>
            <p className="text-slate-500 mt-1">建立專案後即可上傳標單進行智慧解析</p>
          </div>
          <div className="flex gap-3">
            <button
                onClick={() => router.push("/projects/settings")}
                className="bg-white text-slate-600 px-5 py-2.5 rounded-lg font-medium border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
                ⚙️ 分類設定
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              ＋ 新建專案
            </button>
          </div>
        </header>

        {/* 新建專案表單 */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">建立新專案</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">專案名稱 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例：○○建設 A7 機電工程"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">業主 / 甲方</label>
                <input
                  type="text"
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                  placeholder="單位名稱"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">工地位置</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="縣市、行政區或地址"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">專案負責人</label>
                <input
                  type="text"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                  placeholder="姓名"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">開始日期</label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">預計結束日期</label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>


              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1">備註說明</label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="其他補充說明..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-6 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!formName.trim()}
                className="bg-blue-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-100"
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
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="text-4xl mb-4">📂</div>
            <p className="text-slate-500 text-lg">目前尚無專案紀錄</p>
            <p className="text-slate-400 text-sm mt-1">請點擊上方按鈕建立您的第一個採購專案</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-6 flex justify-between items-center cursor-pointer group relative overflow-hidden"
                onClick={() => router.push(`/projects/${proj.id}`)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-600 transition-colors"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {proj.name}
                    </h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                      {proj.files?.length || 0} 份標單
                    </span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-1 gap-x-6 mt-3 text-sm text-slate-500">
                    {proj.manager && <div className="flex items-center gap-1">負責人：{proj.manager}</div>}
                    {proj.client && <div className="flex items-center gap-1">業主：{proj.client}</div>}
                    {(proj.start_date || proj.end_date) && (
                      <div className="flex items-center gap-1 lg:col-span-2">
                        時程：{formatDate(proj.start_date)} ~ {formatDate(proj.end_date)}
                      </div>
                    )}
                    {proj.note && (
                      <div className="lg:col-span-4 mt-1 italic text-slate-400 truncate">
                        備註：{proj.note}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={(id) => handleDelete(proj.id, id)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                    title="刪除專案"
                  >
                    🗑️
                  </button>
                  <div className="text-slate-300 group-hover:translate-x-1 group-hover:text-blue-500 transition-all duration-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
