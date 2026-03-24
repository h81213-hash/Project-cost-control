"use client";

import { useState, useEffect, useTransition, memo, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "../../constants";

interface ProjectDetail {
  id: string;
  name: string;
  client: string;
  location: string;
  manager: string;
  start_date: string;
  end_date: string;
  note: string;
  classification_depth: number;
  created_at: string;
  files: { file_name: string; uploaded_at: string; data: any }[];
}

function CategorySelectorModal({
  isOpen,
  onClose,
  onSave,
  categoriesTree,
  rowDescription,
  isBatch,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (path: string, addKeyword: boolean, keyword: string, itemName: string) => void;
  categoriesTree: any;
  rowDescription: string;
  isBatch?: boolean;
}) {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [addKeyword, setAddKeyword] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setKeyword(rowDescription);
      setSelectedPath("");
      setSearchTerm("");
      setDropdownOpen(false);
      setAddKeyword(true);
    }
  }, [isOpen, rowDescription]);

  if (!isOpen) return null;

  // Flatten tree for easy selection
  const flatPaths: string[] = [];
  const traverse = (node: any, currentPath: string) => {
    if (!node) return;
    for (const key of Object.keys(node)) {
      if (key === "keywords") continue;
      
      const childNode = node[key]?.children || {};
      const isLeaf = Object.keys(childNode).length === 0;
      const nextPath = currentPath ? `${currentPath} > ${key}` : key;
      flatPaths.push(nextPath);
      if (!isLeaf) {
        traverse(childNode, nextPath);
      }
    }
  };
  traverse(categoriesTree, "");

  const filteredPaths = flatPaths.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
  const exactMatchExists = flatPaths.some(p => p.toLowerCase() === searchTerm.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-[650px] h-[65vh] max-h-[90vh] flex flex-col scale-in-center">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            🏷️ 手動強制分類
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors">✕</button>
        </div>
        <div className="pt-3 px-6 pb-6 flex flex-col gap-3 overflow-y-auto flex-1">
          <div>
            <label className="text-sm font-bold text-slate-600 mb-1 block">工程項目名稱</label>
            <div className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800 text-sm border border-slate-200 leading-relaxed font-medium">
              {rowDescription}
            </div>
          </div>
          <div className="relative">
            <label className="text-sm font-bold text-slate-600 mb-1 block">指定新分類路徑</label>
            <div className="relative">
              <input
                type="text"
                placeholder="輸入關鍵字搜尋，或建立新路徑（如：章節 > 子系統）..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setDropdownOpen(true);
                  if (e.target.value !== selectedPath) setSelectedPath("");
                }}
                onFocus={() => setDropdownOpen(true)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm h-[44px] transition-all outline-none"
              />
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setDropdownOpen(false)}></div>
                  <div className="absolute z-[70] top-full mt-2 w-full max-h-[350px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl outline-none py-1 scrollbar-thin">
                    {searchTerm.trim() && !exactMatchExists && (
                      <div
                        onClick={() => {
                          setSelectedPath(searchTerm.trim());
                          setSearchTerm(searchTerm.trim());
                          setDropdownOpen(false);
                        }}
                        className="mx-1 px-3 py-3 text-sm cursor-pointer rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-between group mb-1"
                      >
                        <span className="font-bold">➕ 建立新分類: <span className="text-slate-900 ml-1 italic font-normal">{searchTerm.trim()}</span></span>
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100">建立並選取</span>
                      </div>
                    )}
                    
                    {filteredPaths.length > 0 ? (
                      filteredPaths.map((p) => (
                        <div
                          key={p}
                          onClick={() => {
                            setSelectedPath(p);
                            setSearchTerm(p);
                            setDropdownOpen(false);
                          }}
                          className={`mx-1 px-3 py-3 text-sm cursor-pointer rounded-lg transition-colors border-b border-slate-50 last:border-b-0 ${
                            selectedPath === p ? "bg-blue-600 text-white font-bold shadow-md" : "hover:bg-slate-100 text-slate-700 hover:pl-5"
                          }`}
                        >
                          {p}
                        </div>
                      ))
                    ) : (
                      !searchTerm.trim() && <div className="px-3 py-8 text-sm text-slate-400 text-center italic">輸入關鍵字開始搜尋分類...</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {!isBatch && (
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col gap-4">
              <label className="flex items-start gap-4 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={addKeyword}
                  onChange={(e) => setAddKeyword(e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-600 rounded-lg border-amber-300 focus:ring-amber-500 cursor-pointer transition-all" 
                />
                <div className="flex-1">
                  <span className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    💡 同時加入關鍵字學習
                  </span>
                  <span className="text-xs text-amber-700/70 mt-1 leading-relaxed block">
                    勾選後，系統會將此名稱存為該分類的關鍵字，並自動將標單中相似度高的項目歸類。
                  </span>
                </div>
              </label>
              
              {addKeyword && (
                <div className="pl-9 animate-in slide-in-from-top-1 duration-200">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="請輸入欲學習的關鍵字（建議保留核心詞）"
                    className="w-full px-4 py-2 rounded-xl border border-amber-200 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all shadow-inner bg-white/80"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
          <button 
            onClick={() => onSave("未分類", false, "", rowDescription)}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition-colors"
          >
            ❌ 設為未分類
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              取消
            </button>
            <button 
              disabled={!selectedPath}
              onClick={() => onSave(selectedPath, addKeyword, keyword, rowDescription)}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              確認儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ProjectTableRow = memo(({ 
  row, 
  index, 
  isCompareMode, 
  isRemovedRow = false, 
  isKept = false, 
  onKeep, 
  project, 
  getCategoryColor, 
  formatCurrency,
  onEdit,
  isSelected,
  onToggleSelect,
  isReverted,
  onRevert,
  onIgnore,
  displayCategory
}: any) => {
  const isAdded = row.diff_status === "added";
  const isModified = row.diff_status === "modified";
  
  if (isRemovedRow) {
    return (
      <tr className="bg-rose-50/50 text-rose-400 group">
        <td className="px-4 py-3 text-center sticky left-0 bg-inherit font-black text-[10px]">刪除項目</td>
        <td className="px-4 py-3 sticky left-[120px] bg-inherit opacity-50 line-through">
          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${getCategoryColor(row.system_category)}`}>
            {row.system_category || "未分類"}
          </span>
        </td>
        <td className="px-4 py-3 text-center opacity-50 font-mono italic">{row.item_no}</td>
        <td className="px-4 py-3 line-through italic whitespace-normal break-words font-medium">{row.description}</td>
        <td className="px-4 py-3 text-center opacity-50">{row.unit}</td>
        <td className="px-4 py-3 text-right opacity-50 font-mono italic">{row.quantity}</td>
        <td className="px-4 py-3 text-right opacity-50 font-mono italic">{formatCurrency(parseFloat(String(row.unit_price).replace(/,/g, "")) || 0)}</td>
        <td className="px-4 py-3 text-right opacity-50 font-mono italic">{formatCurrency(parseFloat(String(row.total_price).replace(/,/g, "")) || 0)}</td>
        <td className="px-4 py-3 opacity-30 italic">{row.note}</td>
        <td className="px-4 py-3 text-center">
          {isKept ? (
            <span className="text-emerald-500 font-bold text-xs">已保留</span>
          ) : (
            <button 
              onClick={onKeep}
              title="保留此項" 
              className="hover:scale-125 transition-transform"
            >
              ⬅️
            </button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${isAdded ? 'bg-emerald-50/30' : ''}`}>
      {isCompareMode ? (
        <>
          <td className="px-4 py-3 text-center sticky left-0 bg-inherit font-black text-[10px]">
            {isAdded ? (
              <span className="text-emerald-600">新增項目</span>
            ) : isModified ? (
              <span className="text-amber-600 flex flex-col items-center gap-0.5">
                內容變更
                <span className="text-[9px] opacity-70">
                  ({(row.quantity > (row.old_values?.quantity ?? 0)) ? '量增' : (row.quantity < (row.old_values?.quantity ?? 0)) ? '量減' : '規格變更'})
                </span>
              </span>
            ) : (
              <span className="text-slate-300">未變動</span>
            )}
          </td>
          <td className="px-4 py-3 sticky left-[120px] bg-inherit">
            <div className="flex items-center gap-2 group/cat">
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold font-mono ${getCategoryColor(row.system_category)}`}>
                {displayCategory}
              </span>
              <button onClick={onEdit} className="opacity-0 group-hover/cat:opacity-100 text-slate-300 hover:text-blue-600">✏️</button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-3 sticky left-0 bg-inherit text-center">
            <input type="checkbox" checked={isSelected} onChange={(e)=>onToggleSelect(e.target.checked)} className="rounded" />
          </td>
          <td className="px-4 py-3 sticky left-10 bg-inherit">
            <div className="flex items-center gap-2 group/cat">
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold font-mono ${getCategoryColor(row.system_category)}`}>
                {displayCategory}
              </span>
              <button onClick={onEdit} className="opacity-0 group-hover/cat:opacity-100 text-slate-300 hover:text-blue-600">✏️</button>
            </div>
          </td>
        </>
      )}
      <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{row.item_no || "-"}</td>
      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-normal break-words leading-relaxed">{row.description}</td>
      <td className="px-4 py-3 text-center text-slate-500 text-xs">{row.unit}</td>
      <td className={`px-4 py-3 text-right font-mono transition-all ${isModified && row.old_values?.quantity !== row.quantity ? 'bg-amber-50/50' : ''}`}>
        {isModified && row.old_values?.quantity !== row.quantity ? (
          <div className="flex flex-col items-end gap-0.5 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-[10px] text-slate-400 line-through font-normal">
              {row.old_values.quantity}
            </span>
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-black ring-1 ring-amber-200 flex items-center gap-1 text-sm shadow-sm">
              {row.quantity}
              <span className={row.quantity > row.old_values.quantity ? 'text-emerald-600' : 'text-rose-600'}>
                {row.quantity > row.old_values.quantity ? '↑' : '↓'}
              </span>
            </span>
          </div>
        ) : (
          <span className="font-bold text-slate-700">{row.quantity}</span>
        )}
      </td>
      <td className={`px-4 py-3 text-right font-mono transition-all ${isModified && row.old_values?.unit_price !== row.unit_price ? 'bg-amber-50/50' : ''}`}>
        {isModified && row.old_values?.unit_price !== row.unit_price ? (
          <div className="flex flex-col items-end gap-0.5 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-[10px] text-slate-400 line-through font-normal">
              {formatCurrency(parseFloat(String(row.old_values.unit_price).replace(/,/g, "")) || 0)}
            </span>
            <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md font-black ring-1 ring-amber-300 flex items-center gap-1 text-sm shadow-sm">
              {formatCurrency(parseFloat(String(row.unit_price).replace(/,/g, "")) || 0)}
              <span className={(parseFloat(String(row.unit_price).replace(/,/g, "")) || 0) > (parseFloat(String(row.old_values.unit_price).replace(/,/g, "")) || 0) ? 'text-emerald-700' : 'text-rose-700'}>
                {(parseFloat(String(row.unit_price).replace(/,/g, "")) || 0) > (parseFloat(String(row.old_values.unit_price).replace(/,/g, "")) || 0) ? '↑' : '↓'}
              </span>
            </span>
          </div>
        ) : (
          <span className="font-bold text-slate-700">{formatCurrency(parseFloat(String(row.unit_price).replace(/,/g, "")) || 0)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-black font-mono text-blue-600">{formatCurrency(parseFloat(String(row.total_price).replace(/,/g, "")) || 0)}</td>
      <td className="px-4 py-3 text-slate-400 text-xs whitespace-normal break-words max-w-[200px]">{row.note}</td>
      {isCompareMode && (
        <td className="px-4 py-3 text-center">
          {isAdded ? (
            <button 
              onClick={onIgnore}
              title="不接受此新增 (忽略)" 
              className="text-slate-300 hover:text-red-500 scale-125 transition-all"
            >
              ❌
            </button>
          ) : isModified ? (
            isReverted ? (
              <span className="text-slate-400 font-bold text-xs italic">已還原</span>
            ) : (
              <button 
                onClick={onRevert}
                title="還原為舊版數值 (Reject Change)" 
                className="text-slate-300 hover:text-blue-500 scale-125 transition-all"
              >
                ↩️
              </button>
            )
          ) : null}
        </td>
      )}
    </tr>
  );
});

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showUnclassified, setShowUnclassified] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [diffResult, setDiffResult] = useState<any>(null);
  const [baseVersionIdx, setBaseVersionIdx] = useState(0);
  const [targetVersionIdx, setTargetVersionIdx] = useState(-1);
  const [categoriesTree, setCategoriesTree] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ignoredItemIndices, setIgnoredItemIndices] = useState<number[]>([]);
  const [keptRemovedRows, setKeptRemovedRows] = useState<any[]>([]);
  const [revertedItemIndices, setRevertedItemIndices] = useState<number[]>([]);

  const tabs = [
    { id: "home", label: "首頁", icon: "🏠" },
    { id: "inquiry", label: "詢價單", icon: "📄" },
    { id: "report", label: "報表", icon: "📊" },
    { id: "analysis", label: "成本分析", icon: "💰" },
  ];

  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategoriesTree(data))
      .catch(e => console.error("無法載入分類樹", e));

    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.id) {
        setProject(data);
        // Force default depth to 2 if it's currently something else or not set
        if (data.classification_depth !== 2) {
          handleDepthChange(2);
        }
        if (data.files && data.files.length > 0) {
          const savedData = data.files[data.files.length - 1].data;
          setResult(savedData);
        }
      }
    } catch (err) {
      console.error("無法載入專案", err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        setResult(data.data);
        await fetchProject();
        alert("上傳成功！");
        setFile(null);
      } else {
        alert("解析失敗: " + (data.message || "未知原因"));
      }
    } catch (err) {
      console.error("上傳失敗", err);
      alert("上傳發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = async (path: string, addKeyword: boolean, keyword: string, itemName: string) => {
    const isBatch = editingRowIndex === null && selectedIndices.length > 0;
    if (editingRowIndex === null && !isBatch) return;
    
    setLoading(true);
    setModalOpen(false);
    
    try {
      const endpoint = isBatch 
        ? `${API_BASE_URL}/projects/${projectId}/batch_classify`
        : `${API_BASE_URL}/projects/${projectId}/manual_classify`;
        
      const body = isBatch
        ? {
            row_indices: selectedIndices,
            new_category_path: path,
            add_keyword: addKeyword,
            keyword: keyword,
            classification_depth: project?.classification_depth || 4
          }
        : {
            row_index: editingRowIndex,
            new_category_path: path,
            add_keyword: addKeyword,
            keyword: keyword,
            item_name: itemName,
            classification_depth: project?.classification_depth || 4
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      const resData = await res.json();
      if (resData.status === "success") {
        setResult(resData.data);
        if (isBatch) setSelectedIndices([]);
        
        // Refresh categories
        fetch(`${API_BASE_URL}/categories`, { cache: 'no-store' })
          .then(res => res.json())
          .then(data => setCategoriesTree(data));
      } else {
        alert("儲存失敗: " + resData.message);
      }
    } catch (e) {
      console.error(e);
      alert("儲存分類發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!project) return;
    // 使用直接跳轉觸發下載，避免 fetch 的 Blob 處理與 CORS 限制問題
    window.location.href = `${API_BASE_URL}/projects/${project.id}/export?version_idx=${baseVersionIdx}`;
  };


  const handleCompare = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const targetIdx = targetVersionIdx === -1 ? project.files.length - 1 : targetVersionIdx;
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          base_index: baseVersionIdx, 
          target_index: targetIdx
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setDiffResult(data.data);
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("比對失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiff = async () => {
    if (!diffResult || !project) return;
    setLoading(true);
    try {
      const targetIdx = targetVersionIdx === -1 ? project.files.length - 1 : targetVersionIdx;
      const targetFileName = project.files[targetIdx].file_name;
      
      // Merge kept rows and filter out ignored rows or apply reverted values
      const finalRows = (diffResult.diff.rows as any[]).map((row, idx) => {
        if (revertedItemIndices.includes(idx) && row.old_values) {
          return {
            ...row,
            quantity: row.old_values.quantity,
            unit_price: row.old_values.unit_price,
            total_price: row.old_values.total_price,
            diff_status: "unchanged"
          };
        }
        return row;
      }).filter((_: any, idx: number) => !ignoredItemIndices.includes(idx));

      const mergedRows = [...finalRows, ...keptRemovedRows];

      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/apply_diff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rows: mergedRows,
          file_name: targetFileName
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("已成功套用舊版分類並建立新版本！");
        setIsCompareMode(false);
        setDiffResult(null);
        fetchProject();
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("套用失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVersion = async (index: number) => {
    if (!project || !window.confirm("確定要刪除此標單版本嗎？此操作無法恢復。")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/files/${index}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status === "success") {
        await fetchProject();
        setDiffResult(null);
        setBaseVersionIdx(0);
        setTargetVersionIdx(-1);
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("刪除失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleDepthChange = async (newDepth: number) => {
    if (!project) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classification_depth: newDepth }),
      });
      if (!res.ok) throw new Error("更新失敗");
      const updateData = await res.json();
      setProject(updateData.project);
      
      if (result && result.rows) {
        setLoading(true);
        const anaRes = await fetch(`${API_BASE_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: result.rows, max_depth: newDepth }),
        });
        const anaData = await anaRes.json();
        if (anaData.status === "success") {
          setResult({ ...result, analysis: anaData.analysis, rows: anaData.rows });
        }
      }
    } catch (err) {
      console.error("切換深度失敗", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(num);
  };

  const COLOR_PALETTE = [
    "bg-blue-50 text-blue-600",
    "bg-indigo-50 text-indigo-600",
    "bg-teal-50 text-teal-600",
    "bg-cyan-50 text-cyan-600",
    "bg-red-50 text-red-600",
    "bg-amber-50 text-amber-600",
    "bg-emerald-50 text-emerald-600",
    "bg-violet-50 text-violet-600",
    "bg-rose-50 text-rose-600",
    "bg-sky-50 text-sky-600",
    "bg-lime-50 text-lime-600",
    "bg-fuchsia-50 text-fuchsia-600",
  ];

  const getCategoryColor = (cat: string) => {
    if (!cat || cat === "未分類") return "bg-slate-100 text-slate-400";
    const lv1 = cat.split(" > ")[0];
    let hash = 0;
    for (let i = 0; i < lv1.length; i++) {
      hash = lv1.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
  };

  if (!project) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">載入中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-[4%] py-8">
      <div className="w-full">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
          <button onClick={() => router.push("/projects")} className="hover:text-blue-600 transition-colors">專案列表</button>
          <span>/</span>
          <span className="text-slate-600 font-medium">{project.name}</span>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-8 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-bold transition-all relative ${
                activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </span>
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>}
            </button>
          ))}
        </div>

        {/* Home Tab Content */}
        {activeTab === "home" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Project Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-800">{project.name}</h1>
                    <p className="text-slate-400 text-sm mt-1">專案編號：{project.id}</p>
                  </div>
                </div>
                

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">{isCompareMode ? "基準版本 (Base)" : "檢視版本"}</span>
                      <div className="flex items-center gap-2">
                        <select 
                          value={baseVersionIdx}
                          onChange={(e) => {
                            const idx = parseInt(e.target.value);
                            setBaseVersionIdx(idx);
                            if (!isCompareMode) setResult(project.files[idx].data);
                          }}
                          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none hover:bg-white transition-all"
                        >
                          {project.files.map((f, i) => (
                            <option key={i} value={i}>V{i+1}: {f.file_name}</option>
                          ))}
                        </select>
                        {!isCompareMode && (
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteVersion(baseVersionIdx)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-colors">🗑️</button>
                            <button 
                              onClick={handleExport}
                              disabled={loading}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                              📊 匯出 Excel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isCompareMode && (
                      <>
                        <div className="text-slate-300 pt-5">➡️</div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">比對目標 (Target)</span>
                          <select 
                            value={targetVersionIdx}
                            onChange={(e) => setTargetVersionIdx(parseInt(e.target.value))}
                            className="bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none hover:bg-white transition-all"
                          >
                            <option value={-1}>最新版本</option>
                            {project.files.map((f, i) => (
                              <option key={i} value={i}>V{i+1}: {f.file_name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="h-10 w-px bg-slate-100 hidden md:block"></div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={isCompareMode}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const checked = e.target.checked;
                            startTransition(() => {
                              setIsCompareMode(checked);
                              if (!checked) {
                                setDiffResult(null);
                                setResult(project.files[baseVersionIdx].data);
                              }
                            });
                          }}
                        />
                        <div className={`w-12 h-6 rounded-full transition-colors ${isCompareMode ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isCompareMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </div>
                      <span className={`text-sm font-bold ${isCompareMode ? 'text-blue-600' : 'text-slate-400'}`}>比對模式</span>
                    </label>

                    {isCompareMode && (
                      <button
                        onClick={handleCompare}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? '比對中...' : '🎯 執行比對'}
                      </button>
                    )}
                  </div>

                  {!isCompareMode && (
                    <div className="ml-auto flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">上傳新標單</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          id="quick-upload"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                        />
                        <label htmlFor="quick-upload" className="text-xs font-bold text-blue-600 cursor-pointer hover:underline">
                          {file ? file.name : "選擇 Excel 檔案"}
                        </label>
                      </div>
                      <button
                        onClick={handleUpload}
                        disabled={loading || !file}
                        className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-200 transition-all font-bold"
                      >
                        {loading ? "..." : "📤"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Diff Summary Stats */}
            {isCompareMode && diffResult && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase block mb-1">新增項目</span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-emerald-700">{diffResult.diff.summary.added}</span>
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
                  <span className="text-[10px] text-rose-600 font-bold uppercase block mb-1">刪除項目</span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-rose-700">{diffResult.diff.summary.removed}</span>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
                  <span className="text-[10px] text-amber-600 font-bold uppercase block mb-1">內容變更</span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-amber-700">{diffResult.diff.summary.modified}</span>
                  </div>
                </div>
                <div className="bg-blue-600 p-5 rounded-2xl shadow-lg flex flex-col justify-center gap-1">
                  <span className="text-[10px] text-blue-100 font-bold uppercase block">操作確認</span>
                  <button onClick={handleApplyDiff} className="bg-white text-blue-600 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">🚀 套用繼承並存檔</button>
                </div>
              </div>
            )}

            {/* Table Header and Settings */}
            {(result || (isCompareMode && diffResult)) && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-8">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">🎯 類別層級</span>
                      <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                        {[1, 2].map((d) => (
                          <button
                            key={d}
                            onClick={() => handleDepthChange(d)}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                              project.classification_depth === d ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            }`}
                          >Lv.{d}</button>
                        ))}
                      </div>
                    </div>
                    <div className="w-px h-10 bg-slate-100"></div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">📊 項目統計</span>
                      <span className="text-xl font-black text-slate-800">
                        {isCompareMode && diffResult ? diffResult.diff.rows.length : result?.rows?.length || 0} 
                        <small className="text-xs ml-1 font-bold text-slate-400">筆</small>
                        {isPending && <small className="text-[10px] ml-2 text-blue-400 animate-pulse">更新中...</small>}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => startTransition(() => setShowUnclassified(!showUnclassified))}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                      showUnclassified ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {showUnclassified ? "🎯 顯示全部" : "🚨 僅看未分類"}
                  </button>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                        <tr>
                          {isCompareMode ? (
                            <>
                              <th className="px-4 py-3 w-[120px] text-center sticky left-0 bg-slate-50 z-10">狀態</th>
                              <th className="px-4 py-3 w-[250px] sticky left-[120px] bg-slate-50 z-10">繼承分類</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-3 w-10 sticky left-0 bg-slate-50 z-10">
                                <input 
                                  type="checkbox" 
                                  checked={selectedIndices.length === result?.rows.length} 
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedIndices(e.target.checked ? result.rows.map((_:any,i:number)=>i) : [])} 
                                  className="rounded" 
                                />
                              </th>
                              <th className="px-4 py-3 w-[250px] sticky left-10 bg-slate-50 z-10">系統分類</th>
                            </>
                          )}
                          <th className="px-4 py-3 w-[80px] text-center">項次</th>
                          <th className="px-4 py-3 min-w-[300px]">項目描述</th>
                          <th className="px-4 py-3 w-[60px] text-center">單位</th>
                          <th className="px-4 py-3 w-[100px] text-right">數量</th>
                          <th className="px-4 py-3 w-[120px] text-right">單價</th>
                          <th className="px-4 py-3 w-[120px] text-right">總價</th>
                          <th className="px-4 py-3 min-w-[150px]">備註</th>
                          {isCompareMode && <th className="px-4 py-3 w-10">互動</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Removed Rows in Compare Mode */}
                        {isCompareMode && diffResult?.diff.removed_rows.map((row: any, i: number) => {
                           const isKept = keptRemovedRows.some(r => r.description === row.description && r.item_no === row.item_no);
                           return (
                             <ProjectTableRow 
                               key={`rem-${i}`}
                               row={row}
                               index={i}
                               isCompareMode={true}
                               isRemovedRow={true}
                               isKept={isKept}
                               onKeep={() => setKeptRemovedRows([...keptRemovedRows, {...row, diff_status: "unchanged"}])}
                               project={project}
                               getCategoryColor={getCategoryColor}
                               formatCurrency={formatCurrency}
                             />
                           );
                        })}

                        {/* Standard/Diff Rows */}
                        {(isCompareMode ? (diffResult?.diff.rows || []) : (result?.rows || [])).map((row: any, i: number) => {
                          if (isCompareMode && ignoredItemIndices.includes(i)) return null;
                          
                          const displayCategory = (row.system_category === "未分類" || !row.system_category) 
                            ? "未分類" 
                            : (row.system_category.split(">")[project.classification_depth - 1]?.trim() || "-");
                          
                          if (showUnclassified && displayCategory !== "未分類") return null;

                          return (
                            <ProjectTableRow 
                              key={i}
                              row={row}
                              index={i}
                              isCompareMode={isCompareMode}
                              project={project}
                              getCategoryColor={getCategoryColor}
                              formatCurrency={formatCurrency}
                              onEdit={() => {setEditingRowIndex(i); setModalOpen(true);}}
                              isSelected={selectedIndices.includes(i)}
                              onToggleSelect={(checked: boolean) => setSelectedIndices(checked ? [...selectedIndices, i] : selectedIndices.filter(x=>x!==i))}
                              isReverted={revertedItemIndices.includes(i)}
                              onRevert={() => setRevertedItemIndices([...revertedItemIndices, i])}
                              onIgnore={() => setIgnoredItemIndices([...ignoredItemIndices, i])}
                              displayCategory={displayCategory}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


            {/* Batch Action Floating Bar */}
            {!isCompareMode && selectedIndices.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-10 backdrop-blur-md animate-in slide-in-from-bottom-10">
                <div className="flex items-center gap-4">
                  <span className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg">{selectedIndices.length}</span>
                  <span className="font-bold text-lg tracking-tight">項目已選取</span>
                </div>
                <div className="h-10 w-px bg-slate-700"></div>
                <button onClick={() => {setEditingRowIndex(null); setModalOpen(true);}} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"><span>🏷️</span> 批次修改分類</button>
                <button onClick={() => setSelectedIndices([])} className="text-slate-400 hover:text-white font-bold transition-colors">取消</button>
              </div>
            )}
          </div>
        )}

        {/* Other Tabs Placeholders */}
        {activeTab === "inquiry" && (
          <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-32 text-center animate-in fade-in slide-in-from-bottom-8">
            <div className="text-6xl mb-6">🛠️</div>
            <h3 className="text-2xl font-black text-slate-800">詢價單功能開發中</h3>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto">未來在此可以直接針對選中的項目生成詢價單並發送給供應商，簡化採購流程。</p>
          </div>
        )}

        {activeTab === "report" && (
          <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-32 text-center animate-in fade-in slide-in-from-bottom-8">
            <div className="text-6xl mb-6">📊</div>
            <h3 className="text-2xl font-black text-slate-800">專案報表生成中</h3>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto">我們正在為您準備詳細的數據圖表，將提供預算比較、利潤預估等分析。</p>
          </div>
        )}
        
        {activeTab === "analysis" && (
           <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-32 text-center animate-in fade-in slide-in-from-bottom-8">
            <div className="text-6xl mb-6">💰</div>
            <h3 className="text-2xl font-black text-slate-800">成本分析模組</h3>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto">自動化分析各工種的分佈情形，協助您找出標單中的潛在風險與優勢項目。</p>
          </div>
        )}
      </div>

      <CategorySelectorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleManualSave}
        categoriesTree={categoriesTree}
        rowDescription={editingRowIndex !== null ? (isCompareMode ? diffResult?.diff.rows[editingRowIndex]?.description : result?.rows[editingRowIndex]?.description) : `已選取 ${selectedIndices.length} 個項目`}
        isBatch={editingRowIndex === null}
      />
    </div>
  );
}
