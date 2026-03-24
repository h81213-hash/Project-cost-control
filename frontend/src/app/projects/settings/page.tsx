"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    // Lv.1: 章節標題 (12px 色條 + 陰影)
    container: "bg-white border border-slate-200 border-l-[12px] border-l-slate-800 shadow-lg mb-3",
    header: "bg-white text-slate-900 border-none py-1.5",
    badge: "bg-slate-800 text-white px-3 py-1 text-sm",
    label: "bg-slate-50 text-slate-700 border-none",
    input: "bg-white text-slate-900 border-slate-300 focus:ring-slate-400 font-black text-xl",
    button: "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100 font-bold",
    icon: "text-slate-500"
  },
  { 
    // Lv.2: 子系統 (無邊框 + 極致緊湊)
    container: "bg-transparent border-none shadow-none mt-0",
    header: "bg-transparent text-slate-800 border-none py-0", // 極致緊湊
    badge: "bg-slate-100 text-slate-600 border-none px-1.5 py-0.5 text-[10px]",
    label: "bg-transparent text-slate-600 border-none",
    input: "bg-transparent text-slate-800 border-slate-200 focus:ring-slate-300 text-base font-extrabold",
    button: "text-slate-400 hover:text-blue-600 border-none",
    icon: "text-slate-400"
  },
  { 
    // Lv.3+: 具體項目 (無邊框 + 極致緊湊)
    container: "bg-transparent border-none shadow-none mt-0",
    header: "bg-transparent text-slate-500 border-none py-0", 
    badge: "bg-transparent text-slate-400 border-none font-normal text-[10px]",
    label: "bg-transparent text-slate-400 border-none",
    input: "bg-transparent text-slate-600 border-none focus:ring-0 text-sm",
    button: "text-slate-300 hover:text-slate-500 border-none",
    icon: "text-slate-300"
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
            className={`cursor-grab active:cursor-grabbing px-1 ${style.icon} hover:text-slate-400`}
            title="按住拖動調整順序"
          >
            ⠿
          </div>

          {/* 展開箭頭 */}
          <button onClick={() => setOpen(!open)} className={`w-5 font-bold shrink-0 ${style.icon} hover:text-slate-400`}>
            {childCount > 0 ? (open ? "▼" : "▶") : "─"}
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
            className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all shrink-0 ${
              showKeywords ? "bg-amber-100 text-amber-700 border-amber-200" : `bg-transparent border border-transparent hover:border-slate-200 ${style.button}`
            }`}
          >
            {showKeywords ? "隱藏" : (depth === 0 ? "🔑 關鍵字" : "關鍵字")}
            {searchTerm && node.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-sm" title="關鍵字符合" />
            )}
          </button>
          <button
            onClick={() => { setAddingChild(!addingChild); setOpen(true); }}
            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all shrink-0 shadow-sm ${
              addingChild ? "bg-blue-600 text-white" : `border ${style.button}`
            }`}
          >
            ＋ {depth === 0 ? "新增子層級" : "子層"}
          </button>
          <button
            onClick={() => confirm(`確定刪除「${name}」及其所有子層嗎？`) && onDelete(path)}
            className={`transition-colors text-xs shrink-0 px-1 opacity-0 group-hover:opacity-100 ${depth === 0 ? "text-slate-400 hover:text-red-500" : "text-slate-300 hover:text-red-500"}`}
            title="刪除此節點"
          >
            🗑
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
              <div className={`border border-dashed rounded-lg p-2 ${style.container}`}>
                <p className={`text-[10px] font-bold mb-1.5 opacity-70`}>
                  📁 在「{name}」裡新增子層
                </p>
                <div className="flex gap-1.5">
                  <input
                    value={newChild}
                    onChange={(e) => setNewChild(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmAddChild()}
                    placeholder={`子層名稱`}
                    className={`flex-1 text-xs px-3 py-2 rounded-md border outline-none focus:ring-1 ${style.input}`}
                    autoFocus
                  />
                  <button onClick={confirmAddChild} className="bg-blue-600 text-white px-4 py-2 rounded-md font-bold hover:bg-blue-700 transition-all text-xs text-nowrap">建立</button>
                  <button onClick={() => setAddingChild(false)} className={`px-3 py-2 rounded-md transition-all text-xs text-nowrap ${style.button}`}>取消</button>
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
    fetch("http://localhost:8002/categories", { cache: 'no-store' })
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
      const res = await fetch("http://localhost:8002/categories", {
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
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              ⚙️ 分類架構設定 
              <span className="text-xs font-normal bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                共 {Object.keys(tree).length} 個主項目
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">建立樹狀關鍵字以便自動識別標單項目</p>
          </div>
          <button onClick={() => router.push("/projects")} className="text-xs text-slate-400 hover:text-slate-600 font-medium">← 返回</button>
        </div>


        {/* 新增與搜尋列 */}
        <div className="flex gap-3 mb-6 items-stretch">
          {/* 新增頂層 */}
          <div className="flex-1 bg-white rounded-xl border border-dashed border-blue-200 p-2 flex gap-2 items-center">
            <input
              value={newTop}
              onChange={(e) => setNewTop(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTop()}
              placeholder="輸入頂層類別名稱..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-300 h-full"
            />
            <button
              onClick={addTop}
              disabled={!newTop.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all text-xs h-full whitespace-nowrap"
            >
              ＋ 建立 Lv.1
            </button>
          </div>

          {/* 搜尋框 */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-slate-400 text-sm">🔍</span>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋類別名稱或關鍵字..."
              className="block w-full pl-10 pr-3 py-2 h-full bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                ✕
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
        <div className="sticky bottom-4 mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-xl shadow-blue-100 flex items-center gap-2 text-sm"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            {saving ? "儲存中..." : "✅ 儲存並套用"}
          </button>
        </div>
      </div>
    </div>
  );
}
