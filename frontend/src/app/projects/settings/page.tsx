"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Key, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  GripVertical, 
  FolderPlus,
  ArrowUpCircle,
  AlertCircle
} from "lucide-react";
import { API_BASE_URL } from "../../constants";

interface CategoryNode {
  keywords: string[];
  children: Record<string, CategoryNode>;
}
type CategoryTree = Record<string, CategoryNode>;

// ── 樹操作輔助函式 ──────────────────────────────
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ── 層級色彩 ───────────────────────────────────
const LEVEL_STYLES = [
  { 
    // Lv.1: 章節標題 (精緻的白色卡片 + 圓角 + 柔和陰影)
    container: "bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-4",
    header: "bg-white/50 text-slate-900 border-none py-2.5",
    badge: "bg-[#007AFF] text-white px-3 py-1 text-[10px] font-bold tracking-widest uppercase",
    label: "bg-slate-50/50 text-slate-700 border-none",
    input: "bg-white text-slate-800 border-slate-100 focus:ring-blue-500/20 font-bold text-lg",
    button: "bg-blue-50/50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100/50 font-bold",
    icon: "text-slate-400 group-hover:text-blue-500"
  },
  { 
    // Lv.2: 子系統 (淺色半透明底色)
    container: "bg-slate-50/30 rounded-2xl border-none shadow-none mt-1",
    header: "bg-transparent text-slate-700 border-none py-1.5",
    badge: "bg-white text-slate-400 border border-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest",
    label: "bg-transparent text-slate-600 border-none",
    input: "bg-transparent text-slate-700 border-slate-200 focus:ring-blue-500/10 text-base font-bold",
    button: "text-slate-400 hover:text-blue-600 border-none",
    icon: "text-slate-300 group-hover:text-blue-400"
  },
  { 
    // Lv.3+: 具體項目
    container: "bg-transparent border-none shadow-none mt-0",
    header: "bg-transparent text-slate-500 border-none py-1", 
    badge: "bg-transparent text-slate-300 border-none font-bold text-[8px] uppercase tracking-widest",
    label: "bg-transparent text-slate-400 border-none",
    input: "bg-transparent text-slate-500 border-none focus:ring-0 text-sm",
    button: "text-slate-300 hover:text-slate-500 border-none",
    icon: "text-slate-200"
  }
];

const getStyle = (depth: number) => {
  if (depth === 0) return LEVEL_STYLES[0];
  if (depth === 1) return LEVEL_STYLES[1];
  return LEVEL_STYLES[2];
};

// ── 遞迴節點元件 ──────────────────────────────
interface NodeProps {
  name: string;
  node: CategoryNode;
  path: string[];   // 從根到此節點的 key 路徑
  depth: number;
  onUpdate: (path: string[], updated: CategoryNode) => void;
  onDelete: (path: string[]) => void;
  onRename: (path: string[], newName: string) => void;
  searchTerm?: string;
  checkMatch: (name: string, node: CategoryNode, term: string) => boolean;
}

function CategoryNodeCard({ name, node, path, depth, onUpdate, onDelete, onRename, searchTerm, checkMatch }: NodeProps) {
  const [open, setOpen]           = useState(false);
  const [newKw, setNewKw]         = useState("");
  const [newChild, setNewChild]   = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(name);

  const style = getStyle(depth);
  const childCount = Object.keys(node.children || {}).length;

  /* ── 關鍵字 ── */
  const addKw = () => {
    const kw = newKw.trim();
    if (!kw || node.keywords.includes(kw)) return;
    onUpdate(path, { ...node, keywords: [...node.keywords, kw] });
    setNewKw("");
  };
  const removeKw = (kw: string) =>
    onUpdate(path, { ...node, keywords: node.keywords.filter((k) => k !== kw) });

  /* ── 子層 ── */
  const confirmAddChild = () => {
    const cn = newChild.trim();
    if (!cn || (node.children || {})[cn]) return;
    onUpdate(path, {
      ...node,
      children: { ...(node.children || {}), [cn]: { keywords: [], children: {} } },
    });
    setNewChild("");
    setAddingChild(false);
    setOpen(true);
  };

  const highlight = (text: string) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() 
        ? <span key={i} className="bg-yellow-200 text-slate-900 px-0.5 rounded shadow-sm">{part}</span> 
        : part
    );
  };

  const [wasSearching, setWasSearching] = useState(false);

  useEffect(() => {
    if (searchTerm) {
      setWasSearching(true);
      const checkChildMatch = (n: CategoryNode): boolean => {
        return Object.entries(n.children || {}).some(([cn, cv]) => 
          cn.toLowerCase().includes(searchTerm.toLowerCase()) || 
          cv.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
          checkChildMatch(cv)
        );
      };
      if (checkChildMatch(node)) setOpen(true);
      if (node.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))) setShowKeywords(true);
    } else if (wasSearching) {
      setOpen(false);
      setShowKeywords(false);
      setWasSearching(false);
    }
  }, [searchTerm, node, wasSearching]);

  return (
    <div className={`${depth === 0 ? "mt-4" : "mt-0"}`} style={{ marginLeft: depth === 0 ? 0 : 24 }}>
      {/* ── 節點標題列 ── */}
      <div className={`rounded-xl overflow-hidden transition-all duration-200 ${style.container} relative group/node`}>
        {/* 樹狀導引線 (僅 Level > 0 顯示) */}
        {depth > 0 && (
          <div className="absolute -left-[16px] top-0 bottom-0 w-[1px] border-l border-dashed border-slate-300 group-last/node:h-[20px]" />
        )}
        {depth > 0 && (
          <div className="absolute -left-[16px] top-[20px] w-[12px] h-[1px] border-t border-dashed border-slate-300" />
        )}

        <div className={`flex items-center gap-2 px-3 ${style.header} group transition-colors hover:bg-amber-50/30`}>
          {/* 拖動手把 */}
          <div 
            draggable 
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", name);
              e.dataTransfer.setData("path", JSON.stringify(path));
            }}
            className={`cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${style.icon}`}
            title="按住拖動調整順序"
          >
            <GripVertical size={14} />
          </div>

          {/* 展開箭頭 */}
          <button onClick={() => setOpen(!open)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${style.icon} hover:bg-slate-100`}>
            {childCount > 0 ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div className="w-1 h-1 bg-slate-200 rounded-full" />}
          </button>

          {/* 層級標示 */}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
            Lv.{depth + 1}
          </span>

          {/* 名稱編輯 */}
          {isEditingName ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => {
                if (editName.trim() && editName !== name) onRename(path, editName.trim());
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (editName.trim() && editName !== name) onRename(path, editName.trim());
                  setIsEditingName(false);
                }
                if (e.key === "Escape") {
                  setEditName(name);
                  setIsEditingName(false);
                }
              }}
              className={`font-bold flex-1 px-1 py-0.5 rounded outline-none ${style.input}`}
              autoFocus
            />
          ) : (
            <span 
               className={`font-bold flex-1 truncate cursor-pointer transition-colors ${depth === 0 ? "text-xl text-slate-900" : (depth === 1 ? "text-base text-slate-700 font-extrabold" : "text-sm text-slate-500")} hover:text-blue-600`}
              onClick={() => setIsEditingName(true)}
              title="點擊編輯名稱"
            >
              {highlight(name)}
            </span>
          )}

          {/* 子層統計 */}
          {childCount > 0 && (
            <span className={`text-[10px] shrink-0 ${depth === 0 ? "text-slate-400" : "text-slate-400"}`}>{childCount} 個子層</span>
          )}

          {/* 操作按鈕 */}
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all shrink-0 flex items-center gap-1.5 ${
              showKeywords ? "bg-amber-100 text-amber-600 border-amber-200/50 shadow-sm" : `bg-transparent border border-transparent hover:bg-slate-100/50 ${style.button}`
            }`}
          >
            <Key size={10} /> {showKeywords ? "隱藏" : "關鍵字"}
            {searchTerm && node.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) && (
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-sm" />
            )}
          </button>
          <button
            onClick={() => { setAddingChild(!addingChild); setOpen(true); }}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all shrink-0 shadow-sm flex items-center gap-1 ${
              addingChild ? "bg-[#007AFF] text-white" : `bg-white border ${style.button}`
            }`}
          >
            <Plus size={10} /> {depth === 0 ? "新增層級" : "子層"}
          </button>
          <button
            onClick={() => confirm(`確定刪除「${name}」及其所有子層嗎？`) && onDelete(path)}
            className={`transition-all p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100`}
            title="刪除此節點"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* ── 節點內容 ── */}
        {(open || showKeywords) && (
          <div className="bg-white/30 px-2 pb-2 space-y-0.5 ml-6 border-l border-dashed border-slate-200">
            {/* === 區塊 A：識別關鍵字 === */}
            {showKeywords && (
              <div className={`rounded-xl p-2 mb-2 ${style.label} border-none bg-slate-50/80`}>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[20px]">
                  {node.keywords.length > 0 ? node.keywords.map((kw) => (
                    <span key={kw} className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${style.badge}`}>
                      {highlight(kw)}
                      <button onClick={() => removeKw(kw)} className="opacity-50 hover:opacity-100 text-[10px]">✕</button>
                    </span>
                  )) : (
                    <span className="text-[10px] opacity-50 italic">尚無關鍵字</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={newKw}
                    onChange={(e) => setNewKw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKw()}
                    placeholder="輸入關鍵字..."
                    className={`flex-1 text-xs px-2.5 py-1.5 rounded-md border outline-none focus:ring-1 ${style.input}`}
                  />
                  <button onClick={addKw} className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-all ${style.button}`}>
                    新增
                  </button>
                </div>
              </div>
            )}

            {/* === 區塊 B：新增子層輸入框 === */}
            {addingChild && (
              <div className={`rounded-2xl p-4 border border-dashed border-blue-200 bg-blue-50/20 mb-2 animate-in fade-in slide-in-from-top-2`}>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <FolderPlus size={12} /> 在「{name}」裡新增子層
                </p>
                <div className="flex gap-2">
                  <input
                    value={newChild}
                    onChange={(e) => setNewChild(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmAddChild()}
                    placeholder="輸入類別名稱..."
                    className="flex-1 text-sm bg-white border border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                    autoFocus
                  />
                  <button onClick={confirmAddChild} className="bg-[#007AFF] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#0071E3] shadow-md shadow-blue-500/10 active:scale-95 transition-all text-xs">建立</button>
                  <button onClick={() => setAddingChild(false)} className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors">取消</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 子節點（遞迴渲染） ── */}
      {open && Object.entries(node.children || {}).map(([childName, childNode]) => (
        <div 
          key={childName}
          onDragOver={(e) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLDivElement;
            target.style.borderTop = "2px solid #3b82f6";
          }}
          onDragLeave={(e) => {
            const target = e.currentTarget as HTMLDivElement;
            target.style.borderTop = "none";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLDivElement;
            target.style.borderTop = "none";
            
            const draggedName = e.dataTransfer.getData("text/plain");
            const draggedPath = JSON.parse(e.dataTransfer.getData("path")) as string[];
            
            // 檢查是否為同層級
            const isSameLevel = JSON.stringify(draggedPath.slice(0, -1)) === JSON.stringify(path.concat("children"));
            if (!isSameLevel || draggedName === childName) return;

            // 重新編輯 children 物件順序
            const entries = Object.entries(node.children);
            const fromIdx = entries.findIndex(([k]) => k === draggedName);
            const toIdx = entries.findIndex(([k]) => k === childName);
            
            const newEntries = [...entries];
            const [moved] = newEntries.splice(fromIdx, 1);
            newEntries.splice(toIdx, 0, moved);
            
            onUpdate(path, {
              ...node,
              children: Object.fromEntries(newEntries),
            });
          }}
        >
          {(!searchTerm || checkMatch(childName, childNode, searchTerm)) && (
            <CategoryNodeCard
              name={childName}
              node={childNode}
              path={[...path, "children", childName]}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onRename={onRename}
              searchTerm={searchTerm}
              checkMatch={checkMatch}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── 主頁面 ─────────────────────────────────────
export default function CategorySettingsPage() {
  const router = useRouter();
  const [tree, setTree]         = useState<CategoryTree>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [newTop, setNewTop]     = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 過濾邏輯：檢查節點或其子孫是否符合搜尋詞
  const checkMatch = (name: string, node: CategoryNode, term: string): boolean => {
    if (!term) return true;
    const t = term.toLowerCase();
    const nameMatch = name.toLowerCase().includes(t);
    const keywordMatch = node.keywords.some(k => k.toLowerCase().includes(t));
    if (nameMatch || keywordMatch) return true;
    
    return Object.entries(node.children || {}).some(([childName, childNode]) => 
      checkMatch(childName, childNode, term)
    );
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const normalize = (n: Record<string, unknown>): CategoryNode => ({
          keywords: Array.isArray(n.keywords) ? (n.keywords as string[]) : [],
          children: Object.fromEntries(
            Object.entries((n.children as Record<string, unknown>) || {}).map(([k, v]) => [
              k, normalize(v as Record<string, unknown>),
            ])
          ),
        });
        const normalized: CategoryTree = {};
        for (const [k, v] of Object.entries(data)) normalized[k] = normalize(v as Record<string, unknown>);
        setTree(normalized);
      })
      .catch(() => alert("無法連線後端，請確認後端已啟動"))
      .finally(() => setLoading(false));
  }, []);

  /* 更新任意位置的節點 */
  const handleUpdate = (path: string[], updated: CategoryNode) => {
    const next = deepClone(tree) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = next;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
    cur[path[path.length - 1]] = updated;
    setTree(next as CategoryTree);
  };

  /* 刪除任意節點 */
  const handleDelete = (path: string[]) => {
    const next = deepClone(tree) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = next;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
    delete cur[path[path.length - 1]];
    setTree(next as CategoryTree);
  };

  /* 重新命名節點 (Key 變動) */
  const handleRename = (path: string[], newName: string) => {
    if (!newName) return;
    const next = deepClone(tree) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = next;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
    
    const oldName = path[path.length - 1];
    if (cur[newName]) {
      alert("名稱已存在！");
      return;
    }
    
    // 建立新 Key 並保留原有的資料 (keywords, children)
    cur[newName] = cur[oldName];
    delete cur[oldName];
    
    setTree(next as CategoryTree);
  };

  /* 新增頂層 */
  const addTop = () => {
    const name = newTop.trim();
    if (!name || tree[name]) return;
    setTree({ ...tree, [name]: { keywords: [], children: {} } });
    setNewTop("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tree),
      });
      if (res.ok) { 
        alert("儲存成功！"); 
        router.push("/projects"); 
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`儲存失敗：${err.message || "伺服器錯誤"}`);
      }
    } catch (e) { 
      alert(`無法連線後端：${e instanceof Error ? e.message : "未知錯誤"}`); 
    }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">載入中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 px-[4%] py-8">
      <div className="w-full max-w-4xl mx-auto">

        {/* 標題 */}
        <div className="flex justify-between items-end mb-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-800 tracking-tight flex items-center gap-3">
              <Settings size={32} className="text-blue-500" /> 分類架構設定 
              <span className="text-[11px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider">
                共 {Object.keys(tree).length} 個主項目
              </span>
            </h1>
            <p className="text-slate-400 font-medium ml-1">建立樹狀關鍵字以便自動識別標單項目</p>
          </div>
          <button 
            onClick={() => router.push("/projects")} 
            className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full text-sm font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={16} /> 返回專案列表
          </button>
        </div>


        {/* 新增與搜尋列 */}
        <div className="flex gap-4 mb-10 items-stretch">
          {/* 新增頂層 */}
          <div className="flex-[1.5] bg-white/70 backdrop-blur-3xl rounded-[24px] border border-slate-100 p-2 flex gap-2 items-center shadow-[0_8px_30px_rgb(0,0,0,0.03)] focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 ml-1">
              <ArrowUpCircle size={20} className="text-blue-600" />
            </div>
            <input
              value={newTop}
              onChange={(e) => setNewTop(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTop()}
              placeholder="建立頂層類別 (例如：A. 勞務費)"
              className="flex-1 bg-transparent px-2 py-3 text-sm font-semibold outline-none placeholder:text-slate-300"
            />
            <button
              onClick={addTop}
              disabled={!newTop.trim()}
              className="bg-[#007AFF] text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-[#0071E3] disabled:bg-slate-100 disabled:text-slate-300 transition-all text-xs h-full whitespace-nowrap shadow-md shadow-blue-500/10 active:scale-95"
            >
              建立 Lv.1
            </button>
          </div>

          {/* 搜尋框 */}
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500">
              <Search size={18} className="text-slate-300" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋關鍵字或分類..."
              className="block w-full pl-13 pr-10 py-4 h-full bg-white/70 backdrop-blur-3xl border border-slate-100 rounded-[24px] text-sm font-medium placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-4 flex items-center text-slate-300 hover:text-slate-600 transition-colors"
                title="清除搜尋"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 分類樹 */}
        {Object.keys(tree).length === 0 ? (
          <div className="text-center py-16 text-slate-400">尚無分類，請從上方建立第一個 Lv.1 頂層類別</div>
        ) : (
          <div className="space-y-1">
            {Object.entries(tree).map(([name, node]) => {
              if (searchTerm && !checkMatch(name, node, searchTerm)) return null;
              return (
                <div 
                  key={name}
                onDragOver={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget as HTMLDivElement;
                  target.style.borderTop = "2px solid #3b82f6";
                }}
                onDragLeave={(e) => {
                  const target = e.currentTarget as HTMLDivElement;
                  target.style.borderTop = "none";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget as HTMLDivElement;
                  target.style.borderTop = "none";
                  
                  const draggedName = e.dataTransfer.getData("text/plain");
                  const draggedPath = JSON.parse(e.dataTransfer.getData("path")) as string[];
                  
                  // 頂層路徑長度為 1
                  if (draggedPath.length !== 1 || draggedName === name) return;

                  const entries = Object.entries(tree);
                  const fromIdx = entries.findIndex(([k]) => k === draggedName);
                  const toIdx = entries.findIndex(([k]) => k === name);
                  
                  const newEntries = [...entries];
                  const [moved] = newEntries.splice(fromIdx, 1);
                  newEntries.splice(toIdx, 0, moved);
                  
                  setTree(Object.fromEntries(newEntries));
                }}
              >
                <CategoryNodeCard
                  name={name}
                  node={node}
                  path={[name]}
                  depth={0}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  searchTerm={searchTerm}
                  checkMatch={checkMatch}
                />
              </div>
                );
              })}
          </div>
        )}

        {/* 儲存按鈕 */}
        <div className="sticky bottom-8 mt-12 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="group bg-[#007AFF] text-white px-10 py-4 rounded-full font-bold hover:bg-[#0071E3] disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-[0_12px_30px_rgba(0,122,255,0.3)] flex items-center gap-3 active:scale-95"
          >
            {saving ? (
              <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={20} className="transition-transform group-hover:scale-110" />
            )}
            <span className="text-base">{saving ? "儲存中..." : "儲存並套用分類設定"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
