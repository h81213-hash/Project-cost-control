"use client";

import { useState, useEffect, useTransition, memo, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "../../constants";
import { 
  Home, 
  FileText, 
  BarChart3, 
  PieChart, 
  Layers, 
  Trash2, 
  Save, 
  Download, 
  Upload, 
  GripVertical,
  Check,
  X,
  Target,
  ArrowLeft,
  Search,
  Plus,
  Zap,
  RotateCcw,
  ChevronRight,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  Settings as SettingsIcon,
  Phone,
  Printer,
  Mail,
  UserCheck,
  MapPinned,
  Clock
} from "lucide-react";

interface InquiryTemplate {
  company_name: string;
  phone: string;
  fax: string;
  address: string;
  mail: string;
  contact_person: string;
  project_name: string;
  project_location: string;
  deadline: string;
}

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
  floor_area?: string;
  report_config?: any;
}

export const formatCurrency = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat('zh-TW').format(Math.round(num));
};

export const formatQuantity = (val: any) => {
  if (val === null || val === undefined || val === '') return "-";
  const parsed = Number(String(val).replace(/,/g, ''));
  if (isNaN(parsed)) return val;
  return Math.round(parsed).toString();
};

function InquiryTemplateModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: InquiryTemplate) => void;
  initialData?: Partial<InquiryTemplate>;
}) {
  const [data, setData] = useState<InquiryTemplate>({
    company_name: initialData?.company_name || "聖暉工程科技股份有限公司",
    phone: initialData?.phone || "02-2655-8067",
    fax: initialData?.fax || "02-2655-8073",
    address: initialData?.address || "115台北市南港區園區街3-2號5樓之2(軟體園區H棟)",
    mail: initialData?.mail || "yiyi_yang@acter.com.tw",
    contact_person: initialData?.contact_person || "楊尚嬑 小姐  分機:609",
    project_name: initialData?.project_name || "",
    project_location: initialData?.project_location || "",
    deadline: initialData?.deadline || ""
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-[700px] max-w-full overflow-hidden flex flex-col scale-in-center">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <SettingsIcon className="text-blue-500" /> 詢價單模板設定
            </h3>
            <p className="text-slate-400 text-sm mt-1">設定匯出 Excel 時顯示的頁首與聯絡資訊</p>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 transition-all">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto max-h-[60vh] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">公司名稱</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.company_name}
                  onChange={e => setData({...data, company_name: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">收件 Mail</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.mail}
                  onChange={e => setData({...data, mail: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">電話</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.phone}
                  onChange={e => setData({...data, phone: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">傳真</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.fax}
                  onChange={e => setData({...data, fax: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <Printer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">工程名稱</label>
            <div className="relative">
              <input 
                type="text" 
                value={data.project_name}
                onChange={e => setData({...data, project_name: e.target.value})}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">工程地點</label>
            <div className="relative">
              <input 
                type="text" 
                value={data.project_location}
                onChange={e => setData({...data, project_location: e.target.value})}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
              <MapPinned className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">聯絡人</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.contact_person}
                  onChange={e => setData({...data, contact_person: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">報價回傳截止日</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="例如: 2023年12月25日"
                  value={data.deadline}
                  onChange={e => setData({...data, deadline: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">地址</label>
            <textarea 
              rows={2}
              value={data.address}
              onChange={e => setData({...data, address: e.target.value})}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600 transition-all">取消</button>
          <button 
            onClick={() => onSave(data)}
            className="flex-[2] py-4 bg-[#007AFF] text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all"
          >儲存模板設定</button>
        </div>
      </div>
    </div>
  );
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
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
            <Layers size={20} className="text-blue-500" /> 手動強制分類
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
            <X size={20} />
          </button>
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
                        <span className="font-semibold flex items-center gap-2">
                          <Plus size={14} /> 建立新分類: <span className="text-slate-900 ml-1 italic font-normal">{searchTerm.trim()}</span>
                        </span>
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
                  <span className="font-semibold text-amber-900 text-sm flex items-center gap-2">
                    <Zap size={16} className="text-amber-500 fill-amber-500" /> 同時加入關鍵字學習
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
            className="px-4 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all flex items-center gap-2"
          >
            <Trash2 size={16} /> 設為未分類
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
        <td className="px-4 py-3 text-center opacity-50 font-mono italic text-[11px] w-12">{row.item_no}</td>
        <td className="px-4 py-3 line-through italic whitespace-normal break-words font-medium max-w-[400px] text-xs leading-relaxed">{row.description}</td>
        <td className="px-4 py-3 text-center opacity-50 w-14">{row.unit}</td>
        <td className="px-4 py-3 text-right opacity-50 font-mono italic w-16">{formatQuantity(row.quantity)}</td>
        <td className="px-4 py-3 text-right opacity-50 font-mono italic w-24">{formatCurrency(parseFloat(String(row.unit_price).replace(/,/g, "")) || 0)}</td>
        <td className="px-4 py-3 text-right opacity-50 font-mono italic w-28">{formatCurrency(parseFloat(String(row.total_price).replace(/,/g, "")) || 0)}</td>
        <td className="px-4 py-3 opacity-30 italic text-xs min-w-[120px]">{row.note}</td>
        <td className="px-4 py-3 text-center">
          {isKept ? (
            <div className="flex items-center justify-center text-emerald-500">
               <Check size={18} strokeWidth={3} />
            </div>
          ) : (
            <button 
              onClick={onKeep}
              title="保留此項" 
              className="p-1.5 rounded-full hover:bg-emerald-100 text-emerald-600 transition-all hover:scale-110"
            >
              <RotateCcw size={16} />
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
              <button onClick={onEdit} className="opacity-0 group-hover/cat:opacity-100 text-slate-300 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-all">
                <GripVertical size={14} />
              </button>
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
              <button onClick={onEdit} className="opacity-0 group-hover/cat:opacity-100 text-slate-300 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-all">
                <GripVertical size={14} />
              </button>
            </div>
          </td>
        </>
      )}
      <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px] w-12">{row.item_no || "-"}</td>
      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-normal break-words leading-relaxed max-w-[400px] text-xs">{row.description}</td>
      <td className="px-4 py-3 text-center text-slate-500 text-xs w-14">{row.unit}</td>
      <td className={`px-4 py-3 text-right font-mono transition-all ${isModified && row.old_values?.quantity !== row.quantity ? 'bg-amber-50/50' : ''}`}>
        {isModified && row.old_values?.quantity !== row.quantity ? (
          <div className="flex flex-col items-end gap-0.5 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-[10px] text-slate-400 line-through font-normal">
              {formatQuantity(row.old_values.quantity)}
            </span>
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-black ring-1 ring-amber-200 flex items-center gap-1 text-sm shadow-sm">
              {formatQuantity(row.quantity)}
              <span className={row.quantity > row.old_values.quantity ? 'text-emerald-600' : 'text-rose-600'}>
                {row.quantity > row.old_values.quantity ? '↑' : '↓'}
              </span>
            </span>
          </div>
        ) : (
          <span className="font-bold text-slate-700">{formatQuantity(row.quantity)}</span>
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
      <td className="px-4 py-3 text-right font-black font-mono text-blue-600 w-28 text-xs">{formatCurrency(parseFloat(String(row.total_price).replace(/,/g, "")) || 0)}</td>
      <td className="px-4 py-3 text-slate-400 text-[10px] whitespace-normal break-words max-w-[200px] leading-snug">{row.note}</td>
      {isCompareMode && (
        <td className="px-4 py-3 text-center">
          {isAdded ? (
            <button 
              onClick={onIgnore}
              title="不接受此新增 (忽略)" 
              className="p-1.5 rounded-full hover:bg-rose-100 text-rose-400 transition-all hover:scale-110"
            >
              <X size={16} />
            </button>
          ) : isModified ? (
            isReverted ? (
              <span className="text-slate-400 font-medium text-xs italic">已還原</span>
            ) : (
              <button 
                onClick={onRevert}
                title="還原為舊版數值 (Reject Change)" 
                className="p-1.5 rounded-full hover:bg-blue-100 text-blue-500 transition-all hover:scale-110"
              >
                <RotateCcw size={16} />
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
  const [activeInquiryCategory, setActiveInquiryCategory] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<any[]>([]);
  const [displayedCategoryItemsCount, setDisplayedCategoryItemsCount] = useState(100);
  const [isFetchingCategoryItems, setIsFetchingCategoryItems] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [diffResult, setDiffResult] = useState<any>(null);
  const [baseVersionIdx, setBaseVersionIdx] = useState(0);
  const [targetVersionIdx, setTargetVersionIdx] = useState(-1);
  const [categoriesTree, setCategoriesTree] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // 報表相關狀態
  const [reportData, setReportData] = useState<any>(null);
  const [reportDepth, setReportDepth] = useState(1);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [reportConfigEdits, setReportConfigEdits] = useState<any>({
    floor_area: "",
    categories: {},
    summary: { profit_rate: 0.18, tax_rate: 0.05 },
    categoryOrder: []
  });
  // Custom rows: subtotal dividers and deduction items
  const [customRows, setCustomRows] = useState<Array<{id: string, type: 'subtotal'|'deduction', label: string, afterIndex: number, amount?: number}>>([]);
  // Drag state for reordering
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragCustomId, setDragCustomId] = useState<string | null>(null);
  const [dragCatIndex, setDragCatIndex] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ignoredItemIndices, setIgnoredItemIndices] = useState<number[]>([]);
  const [keptRemovedRows, setKeptRemovedRows] = useState<any[]>([]);
  const [revertedItemIndices, setRevertedItemIndices] = useState<number[]>([]);
  
  // 詢價單編輯暫存
  const [inquiryEdits, setInquiryEdits] = useState<Record<string, { unit_price: number, discount_rate: number }>>({});
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  
  // 當選中詢價類別時，從後端抓取該類別的所有項目 (不受主表格分頁限制)
  useEffect(() => {
    if (activeInquiryCategory && projectId) {
      const fetchItems = async () => {
        setIsFetchingCategoryItems(true);
        try {
          // 專用極輕量化端點，只抓取 rows，避開專案 metadata 序列化成本
          const response = await fetch(`${API_BASE_URL}/projects/${projectId}/inquiry_rows?system_category=${encodeURIComponent(activeInquiryCategory)}`);
          const rows = await response.json();
          setCategoryItems(rows || []);
          setDisplayedCategoryItemsCount(100); // 初始只顯示 100 筆，避免 DOM 渲染過重導致凍結
        } catch (error) {
          console.error("Failed to fetch category items:", error);
        } finally {
          setIsFetchingCategoryItems(false);
        }
      };
      fetchItems();
      setInquiryEdits({}); // 切換類別時清空暫存
    } else {
      setCategoryItems([]);
    }
  }, [activeInquiryCategory, projectId]);

  const fetchReport = useCallback(async (depth: number) => {
    setIsFetchingReport(true);
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/reports?depth=${depth}`);
      const data = await res.json();
      setReportData(data);
      if (data.config) {
        setReportConfigEdits({
          floor_area: data.floor_area || "",
          categories: data.config.categories || {},
          summary: data.config.summary || { profit_rate: 0.18, tax_rate: 0.05 }
        });
        setCustomRows(data.config.custom_rows || []);
      }
    } catch (e) {
      console.error("報表載入失敗", e);
    } finally {
      setIsFetchingReport(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "report") {
      fetchReport(reportDepth);
    }
  }, [activeTab, reportDepth, fetchReport]);

  const saveReportConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/reports/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reportConfigEdits, custom_rows: customRows })
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchReport(reportDepth);
        alert("報表設定已儲存");
      }
    } catch (e) {
      alert("儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  const saveInquiryChanges = async () => {
    if (!activeInquiryCategory || Object.keys(inquiryEdits).length === 0) return;
    
    setIsSavingInquiry(true);
    try {
      const updates = Object.entries(inquiryEdits).map(([key, val]) => {
        const [item_no, description] = key.split("|SEP|");
        return { item_no, description, ...val };
      });

      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/inquiry_rows/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_category: activeInquiryCategory, updates })
      });
      
      const data = await res.json();
      if (data.status === "success") {
        // 重新抓取資料以同步
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/inquiry_rows?system_category=${encodeURIComponent(activeInquiryCategory)}`);
        const rows = await response.json();
        setCategoryItems(rows || []);
        setInquiryEdits({});
        alert("詢價修改已儲存");
      }
    } catch (e) {
      alert("儲存失敗");
    } finally {
      setIsSavingInquiry(false);
    }
  };
  
  // 無限下滑相關狀態
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  const fetchProject = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1 && !append) {
        const cacheKey = `project_${projectId}`;
        if (typeof window !== "undefined") {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    setProject(parsed);
                    if (parsed.files && parsed.files.length > 0) {
                        setResult(parsed.files[parsed.files.length - 1].data);
                    }
                } catch (e) {
                    console.error("快取解析失敗", e);
                }
            }
        }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}?page=${pageNum}&page_size=50`);
      const data = await res.json();
      if (data.id) {
        setProject(data);
        if (data.files && data.files.length > 0) {
          const latestFile = data.files[data.files.length - 1];
          const newData = latestFile.data;
          const pagination = newData.pagination;

          if (append) {
            setResult((prev: any) => ({
              ...prev,
              rows: [...(prev?.rows || []), ...(newData.rows || [])]
            }));
          } else {
            setResult(newData);
            const cacheKey = `project_${projectId}`;
            if (typeof window !== "undefined") {
              localStorage.setItem(cacheKey, JSON.stringify(data));
            }
          }

          if (pagination) {
            setTotalRows(pagination.total);
            setHasMore(pagination.has_more);
            setPage(pagination.page);
          } else {
            setHasMore(false);
          }
        }
        
        if (data.report_config) {
          setReportConfigEdits({
            floor_area: data.floor_area || "",
            categories: data.report_config.categories || {},
            summary: data.report_config.summary || { profit_rate: 0.18, tax_rate: 0.05 },
            categoryOrder: data.report_config.categoryOrder || [],
            inquiry_template: data.report_config.inquiry_template || {}
          });
        }
      }
    } catch (err) {
      console.error("無法載入專案", err);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, [projectId]);

  const loadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || loading) return;
    setIsFetchingMore(true);
    await fetchProject(page + 1, true);
  }, [isFetchingMore, hasMore, loading, page, fetchProject]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastRowElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, { rootMargin: '800px' });
    if (node) observer.current.observe(node);
  }, [loading, isFetchingMore, hasMore, loadMore]);


  const tabs = [
    { id: "home", label: "分類", icon: <Home size={18} /> },
    { id: "inquiry", label: "詢價", icon: <FileText size={18} /> },
    { id: "report", label: "報表", icon: <BarChart3 size={18} /> },
    { id: "analysis", label: "成本分析", icon: <PieChart size={18} /> },
  ];

  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategoriesTree(data))
      .catch(e => console.error("無法載入分類樹", e));

    fetchProject();
  }, [projectId, fetchProject]);

  const handleUpload = async () => {
    if (!file) return;
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

  const handleSaveInquiryTemplate = async (newTemplate: InquiryTemplate) => {
    if (!project) return;
    setLoading(true);
    try {
      const newConfig = {
        ...reportConfigEdits,
        inquiry_template: newTemplate
      };
      
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_config: newConfig }),
      });
      
      if (!res.ok) throw new Error("儲存模板失敗");
      const updateData = await res.json();
      setProject(updateData.project);
      setReportConfigEdits(updateData.project.report_config || {});
      setTemplateModalOpen(false);
      alert("詢價模板儲存成功！");
    } catch (e) {
      console.error(e);
      alert("儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleInquiryExport = () => {
    if (!project || !activeInquiryCategory) return;
    const url = `${API_BASE_URL}/projects/${projectId}/inquiry_export?category=${encodeURIComponent(activeInquiryCategory)}`;
    window.location.href = url;
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

  const _formatCurrency = (num: number) => {
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
    if (!cat || cat === "未分類" || cat === "無類別") return "bg-slate-100 text-slate-400";
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

                {/* Report Tab */}
                {activeTab === "report" && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {isFetchingReport && !reportData ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-3xl border border-slate-100">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-bold">正在生成專案報表數據...</p>
                      </div>
                    ) : ( 
                      <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-3 tracking-tight">
                               <BarChart3 size={24} className="text-blue-500" /> 專案成本報表分析
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">📍 {project?.location || "未設定地點"}</span>
                              <span className="flex items-center gap-1">👤 {project?.manager || "未設定負責人"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                            <button 
                              onClick={() => setReportDepth(1)}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${reportDepth === 1 ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              大分類 (LV.1)
                            </button>
                            <button 
                              onClick={() => setReportDepth(2)}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${reportDepth === 2 ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              成本管制 (LV.2)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-y border-slate-100">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">樓地板面積</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                value={reportConfigEdits.floor_area}
                                onChange={(e) => setReportConfigEdits({...reportConfigEdits, floor_area: e.target.value})}
                                placeholder="例如: 25700.84 M2"
                                className="bg-slate-50 border border-slate-100/80 rounded-2xl px-5 py-3 w-full font-medium text-slate-700 hover:bg-white focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-wider">利潤管理費率 (%)</label>
                            <input 
                              type="number"
                              step="0.1"
                              value={
                                // If it ends with a dot or doesn't have decimals, we need a smarter approach for controlled inputs
                                // The simplest fix is just to multiply by 100 without forcing toFixed(1) constantly
                                reportConfigEdits.summary?.profit_rate !== undefined 
                                  ? reportConfigEdits.summary.profit_rate * 100 
                                  : 18
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setReportConfigEdits({
                                  ...reportConfigEdits, 
                                  summary: { ...reportConfigEdits.summary, profit_rate: val === "" ? 0 : parseFloat(val) / 100 }
                                });
                              }}
                              className="bg-slate-50 border border-slate-100/80 rounded-2xl px-5 py-3 w-full font-medium text-slate-700 hover:bg-white focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm"
                            />
                          </div>
                          <div className="flex items-end">
                             <button 
                               onClick={saveReportConfig}
                               disabled={loading}
                               className="w-full bg-[#007AFF] text-white font-semibold py-3.5 rounded-2xl hover:bg-blue-600 shadow-[0_8px_16px_rgba(0,122,255,0.2)] hover:shadow-[0_4px_12px_rgba(0,122,255,0.15)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                             >
                               {loading ? "儲存中..." : "儲存設定"}
                             </button>
                          </div>
                        </div>

                        {/* Toolbar: Add custom rows */}
                        {reportData && (
                          <div className="flex items-center gap-3 pb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">插入自訂列</span>
                            <button
                              onClick={() => setCustomRows(prev => [...prev, {
                                id: Date.now().toString(),
                                type: 'subtotal',
                                label: `小計 ${String.fromCharCode(65 + prev.filter(r => r.type === 'subtotal').length)}`,
                                afterIndex: (reportData?.categories.filter((c: any) => !reportConfigEdits.categories[c.path]?.hidden).length ?? 1) - 1
                              }])}
                              className="flex items-center gap-1.5 px-5 py-2 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-200 transition-all"
                            >
                              新增小計行
                            </button>
                            <button
                              onClick={() => setCustomRows(prev => [...prev, {
                                id: Date.now().toString(),
                                type: 'deduction',
                                label: '扣除項目',
                                afterIndex: (reportData?.categories.filter((c: any) => !reportConfigEdits.categories[c.path]?.hidden).length ?? 1) - 1,
                                amount: 0
                              }])}
                              className="flex items-center gap-1.5 px-5 py-2 bg-orange-50/80 text-orange-600 rounded-full text-xs font-semibold hover:bg-orange-100 transition-all cursor-pointer"
                            >
                              新增減項
                            </button>
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full border-separate border-spacing-0">
                            <thead>
                              <tr className="bg-transparent">
                                <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 w-8"></th>
                                <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">項次</th>
                                <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">分類名稱</th>
                                <th className="px-6 py-4 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">廠商報價 (元)</th>
                                <th className="px-6 py-4 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">佔比</th>
                                <th className="px-6 py-4 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">公司成本 (元)</th>
                                <th className="px-6 py-4 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">佔比</th>
                                <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">備註說明</th>
                                <th className="px-6 py-4 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                let visibleCats = reportData?.categories.filter((cat: any) => !reportConfigEdits.categories[cat.path]?.hidden) || [];
                                
                                // Sort by custom order if available
                                if (reportConfigEdits.categoryOrder && reportConfigEdits.categoryOrder.length > 0) {
                                  visibleCats = visibleCats.sort((a: any, b: any) => {
                                    const indexA = reportConfigEdits.categoryOrder.indexOf(a.path);
                                    const indexB = reportConfigEdits.categoryOrder.indexOf(b.path);
                                    if (indexA === -1 && indexB === -1) return 0;
                                    if (indexA === -1) return 1; // Unordered items go to the bottom
                                    if (indexB === -1) return -1;
                                    return indexA - indexB;
                                  });
                                }

                                const rows: React.ReactNode[] = [];
                                let segSupplier = 0;
                                let segInternal = 0;
                                let catDisplayIdx = 0;

                                visibleCats.forEach((cat: any, i: number) => {
                                  const edit = reportConfigEdits.categories[cat.path] || {};
                                  const currentRemark = edit.remark !== undefined ? edit.remark : cat.remark;
                                  segSupplier += cat.supplier_total;
                                  segInternal += cat.internal_total;

                                  // Drag drop classes
                                  const isDragOver = dragOverIndex === i && dragCatIndex !== null;

                                  rows.push(
                                    <tr
                                      key={`cat-${cat.path}`}
                                      draggable
                                      onDragStart={() => { setDragCatIndex(i); setDragCustomId(null); }}
                                      onDragEnd={() => { setDragCatIndex(null); setDragOverIndex(null); }}
                                      onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (dragCustomId !== null) {
                                          // Move custom row to after this cat index
                                          setCustomRows(prev => prev.map(r => r.id === dragCustomId ? { ...r, afterIndex: i } : r));
                                        } else if (dragCatIndex !== null && dragCatIndex !== i) {
                                          // Reorder category
                                          const currentOrder = reportConfigEdits.categoryOrder?.length > 0 
                                            ? [...reportConfigEdits.categoryOrder] 
                                            : visibleCats.map((c: any) => c.path);
                                          
                                          const draggedPath = visibleCats[dragCatIndex].path;
                                          // Remove dragged item from its original position
                                          const newOrder = currentOrder.filter((path: string) => path !== draggedPath);
                                          
                                          // Find the target path
                                          const targetPath = visibleCats[i].path;
                                          const targetIndexInOrder = newOrder.indexOf(targetPath);
                                          
                                          if (targetIndexInOrder !== -1) {
                                            // Insert dragged item after the target item
                                            newOrder.splice(targetIndexInOrder + 1, 0, draggedPath);
                                          } else {
                                            newOrder.push(draggedPath);
                                          }
                                          
                                          setReportConfigEdits((prev: any) => ({
                                            ...prev,
                                            categoryOrder: newOrder
                                          }));
                                        }
                                        setDragCatIndex(null);
                                        setDragCustomId(null);
                                        setDragOverIndex(null);
                                      }}
                                      className={`hover:bg-slate-50 transition-colors border-b border-slate-100/50 cursor-grab ${
                                        isDragOver ? 'border-t-2 border-t-blue-400' : ''
                                      }`}
                                    >
                                      <td className="px-6 py-5 text-center text-slate-300 text-lg select-none">⠿</td>
                                      <td className="px-6 py-5 text-[13px] font-medium text-slate-400">{++catDisplayIdx}</td>
                                      <td className="px-6 py-5 text-[13px] font-semibold text-slate-700">{cat.name}</td>
                                      <td className="px-6 py-5 text-[13px] font-medium text-right text-slate-600">{formatCurrency(cat.supplier_total)}</td>
                                      <td className="px-6 py-5 text-[11px] font-semibold text-right text-slate-400">{cat.supplier_ratio.toFixed(2)}%</td>
                                      <td className="px-6 py-5 text-[13px] font-semibold text-right text-slate-800">{formatCurrency(cat.internal_total)}</td>
                                      <td className="px-6 py-5 text-[11px] font-semibold text-right text-slate-400">{((cat.internal_total / (reportData?.summary.direct_internal || 1)) * 100).toFixed(2)}%</td>
                                      <td className="px-6 py-5">
                                        <input
                                          type="text"
                                          value={currentRemark}
                                          placeholder="輸入備註..."
                                          onChange={(e) => setReportConfigEdits((prev: any) => ({
                                            ...prev,
                                            categories: { ...prev.categories, [cat.path]: { ...(prev.categories?.[cat.path] || {}), remark: e.target.value } }
                                          }))}
                                          className="w-full bg-transparent border border-transparent focus:border-blue-500/30 px-3 py-1.5 text-[13px] text-slate-500 outline-none transition-all focus:bg-white focus:shadow-sm rounded-lg"
                                        />
                                      </td>
                                      <td className="px-6 py-5 text-center">
                                        <button
                                          onClick={() => setReportConfigEdits((prev: any) => ({
                                            ...prev,
                                            categories: {
                                              ...prev.categories,
                                              [cat.path]: { ...prev.categories?.[cat.path], hidden: true }
                                            }
                                          }))}
                                          className="text-slate-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-50"
                                          title="隱藏此分類"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  );

                                  // Render any custom rows that should appear after this category index
                                  const customHere = customRows.filter(r => r.afterIndex === i);
                                  customHere.forEach((cr) => {
                                    if (cr.type === 'subtotal') {
                                      rows.push(
                                        <tr
                                          key={`cr-${cr.id}`}
                                          draggable
                                          onDragStart={() => { setDragCustomId(cr.id); setDragCatIndex(null); }}
                                          onDragEnd={() => { setDragCustomId(null); setDragOverIndex(null); }}
                                          className="bg-slate-50/80 cursor-grab group"
                                        >
                                          <td className="px-6 py-4 text-center text-slate-300 text-lg select-none group-hover:text-slate-400">⠿</td>
                                          <td colSpan={2} className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                              <BarChart3 size={14} className="text-slate-400" />
                                              <input
                                                type="text"
                                                value={cr.label}
                                                onChange={(e) => setCustomRows(prev => prev.map(r => r.id === cr.id ? { ...r, label: e.target.value } : r))}
                                                className="bg-transparent font-bold text-[13px] text-slate-700 outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500 px-1 min-w-0 flex-1 transition-all"
                                              />
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 text-[13px] font-bold text-right text-slate-800">{formatCurrency(segSupplier)}</td>
                                          <td className="px-6 py-4 text-right text-[11px] font-semibold text-slate-400">小計</td>
                                          <td className="px-6 py-4 text-[13px] font-bold text-right text-blue-700">{formatCurrency(segInternal)}</td>
                                          <td className="px-6 py-4"></td>
                                          <td className="px-6 py-4 text-[11px] text-slate-400 italic">自動加總以上各項</td>
                                          <td className="px-6 py-4 text-center">
                                            <button onClick={() => setCustomRows(prev => prev.filter(r => r.id !== cr.id))} className="text-slate-300 hover:text-red-500 p-1 rounded transition-all">✕</button>
                                          </td>
                                        </tr>
                                      );
                                      // Reset segment accumulators after a subtotal row
                                      segSupplier = 0;
                                      segInternal = 0;
                                    } else if (cr.type === 'deduction') {
                                      rows.push(
                                        <tr
                                          key={`cr-${cr.id}`}
                                          draggable
                                          onDragStart={() => { setDragCustomId(cr.id); setDragCatIndex(null); }}
                                          onDragEnd={() => { setDragCustomId(null); setDragOverIndex(null); }}
                                          className="bg-orange-50/40 cursor-grab group"
                                        >
                                          <td className="px-6 py-4 text-center text-orange-200 text-lg select-none group-hover:text-orange-300">⠿</td>
                                          <td colSpan={2} className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                              <TrendingUp size={14} className="text-orange-400" />
                                              <input
                                                type="text"
                                                value={cr.label}
                                                onChange={(e) => setCustomRows(prev => prev.map(r => r.id === cr.id ? { ...r, label: e.target.value } : r))}
                                                className="bg-transparent font-bold text-[13px] text-orange-700 outline-none border-b border-transparent hover:border-orange-300 focus:border-orange-500 px-1 min-w-0 flex-1 transition-all"
                                              />
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                            <input
                                              type="number"
                                              value={cr.amount || 0}
                                              onChange={(e) => setCustomRows(prev => prev.map(r => r.id === cr.id ? { ...r, amount: parseFloat(e.target.value) || 0 } : r))}
                                              className="w-36 bg-white border border-orange-200/50 rounded-xl px-3 py-1.5 text-right text-[13px] font-bold text-orange-600 outline-none focus:ring-4 focus:ring-orange-400/10 focus:border-orange-400/50 transition-all shadow-sm"
                                            />
                                          </td>
                                          <td className="px-6 py-4 text-right text-[11px] font-semibold text-orange-400">減項</td>
                                          <td className="px-6 py-4 text-[13px] font-bold text-right text-orange-600">-{formatCurrency(cr.amount || 0)}</td>
                                          <td className="px-6 py-4"></td>
                                          <td className="px-6 py-4 text-[11px] text-orange-400 italic">手動輸入金額</td>
                                          <td className="px-6 py-4 text-center">
                                            <button onClick={() => setCustomRows(prev => prev.filter(r => r.id !== cr.id))} className="text-slate-300 hover:text-red-500 p-1 rounded transition-all">✕</button>
                                          </td>
                                        </tr>
                                      );
                                    }
                                  });
                                });

                                return rows;
                              })()}

                              {/* Summary Rows */}
                              {reportData && (() => {
                                const totalDeductions = customRows.reduce((sum, r) => r.type === 'deduction' ? sum + (r.amount || 0) : sum, 0);
                                return (
                                  <>
                                    <tr className="bg-slate-50 border-t border-slate-100 font-semibold">
                                      <td className="px-6 py-5"></td>
                                      <td colSpan={2} className="px-6 py-5 text-[13px] text-slate-700">小計 (直接成本)</td>
                                      <td className="px-6 py-5 text-[13px] font-medium text-right text-slate-800">{formatCurrency(reportData.summary.direct_supplier)}</td>
                                      <td className="px-6 py-5 text-right"></td>
                                      <td className="px-6 py-5 text-[13px] font-medium text-right text-blue-700">{formatCurrency(reportData.summary.direct_internal)}</td>
                                      <td className="px-6 py-5 text-right"></td>
                                      <td className="px-6 py-5 text-[11px] text-slate-400 italic font-normal">依標單明細匯總</td>
                                      <td className="px-6 py-5"></td>
                                    </tr>
                                    {totalDeductions > 0 && (
                                      <tr className="bg-orange-50/40 font-semibold border-t border-orange-100/50">
                                        <td className="px-6 py-4"></td>
                                        <td colSpan={2} className="px-6 py-4 text-[13px] text-orange-700">合計減項</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-right text-orange-600">-{formatCurrency(totalDeductions)}</td>
                                        <td className="px-6 py-4"></td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-right text-orange-600">-{formatCurrency(totalDeductions)}</td>
                                        <td className="px-6 py-4"></td>
                                        <td colSpan={2} className="px-6 py-4 text-[11px] text-orange-400 italic font-normal">所有減項加總</td>
                                      </tr>
                                    )}
                                    <tr className="bg-white font-semibold border-t border-slate-100">
                                      <td className="px-6 py-5"></td>
                                      <td colSpan={2} className="px-6 py-5 text-[13px] text-slate-500">利潤及管理費 ({(reportConfigEdits.summary?.profit_rate * 100).toFixed(1)}%)</td>
                                      <td className="px-6 py-5 text-[13px] font-medium text-right text-slate-600">{formatCurrency(reportData.summary.indirect_supplier)}</td>
                                      <td className="px-6 py-5 text-right text-[11px] font-semibold text-slate-400">{(reportData.summary.indirect_supplier / reportData.summary.total_supplier * 100).toFixed(2)}%</td>
                                      <td className="px-6 py-5 text-[13px] font-medium text-right text-blue-600">{formatCurrency(reportData.summary.indirect_internal)}</td>
                                      <td className="px-6 py-5 text-right text-[11px] font-semibold text-blue-400">{(reportData.summary.indirect_internal / reportData.summary.total_internal * 100).toFixed(2)}%</td>
                                      <td colSpan={2} className="px-6 py-5 text-[11px] text-slate-400 italic font-normal text-center">利潤自動計算</td>
                                    </tr>
                                    <tr className="bg-white border-t-2 border-slate-100 text-slate-900 font-bold">
                                      <td className="px-6 py-6 border-t-2 border-slate-100"></td>
                                      <td colSpan={2} className="px-6 py-6 text-[15px] border-t-2 border-slate-100">合計總攬 (含稅預估)</td>
                                      <td className="px-6 py-6 text-lg font-semibold text-right border-t-2 border-slate-100">{formatCurrency(reportData.summary.total_supplier - totalDeductions)}</td>
                                      <td className="px-6 py-6 text-right font-bold text-slate-400 uppercase text-[10px] tracking-widest border-t-2 border-slate-100">100.00%</td>
                                      <td className="px-6 py-6 text-xl font-semibold text-right text-blue-600 border-t-2 border-slate-100">{formatCurrency(reportData.summary.total_internal - totalDeductions)}</td>
                                      <td className="px-6 py-6 text-right font-bold text-blue-400 uppercase text-[10px] tracking-widest border-t-2 border-slate-100">100.00%</td>
                                      <td colSpan={2} className="px-6 py-6 text-[13px] text-slate-400 text-center border-t-2 border-slate-100">預估毛利：<span className="text-slate-700 font-semibold">{formatCurrency((reportData.summary.total_supplier - totalDeductions) - (reportData.summary.total_internal - totalDeductions))}</span></td>
                                    </tr>
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Info Alert */}
                        <div className="bg-blue-50/50 border border-blue-100/50 p-6 rounded-3xl flex gap-4 items-start shadow-sm">
                          <AlertCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-700 leading-relaxed font-medium">
                            <strong>使用說明：</strong><br/>
                            - 拖曳列左側的 <strong>⠿</strong> 圖示可重新排序，將「小計行」或「減項」拖到任意分類後方。<br/>
                            - 點擊「新增小計行」插入自定義小計，自動加總其所覆蓋的分類。<br/>
                            - 點擊「新增減項」新增一筆扣除金額（如業主直發材料費），最終合計將自動扣除。<br/>
                            - 點擊 🗑️ 可從報表中隱藏特定分類。儲存後下次開啟仍保留所有設定。
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

        {/* Home Tab Content */}
        {activeTab === "home" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Project Info Card */}
            <div className="bg-white/70 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 relative overflow-hidden">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">{project.name}</h2>
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                    </div>
                    <p className="text-slate-400 text-sm flex items-center gap-1.5">
                      <AlertCircle size={14} /> 專案編號：{project.id}
                    </p>
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
                          className="bg-slate-50/50 border border-slate-100 text-slate-700 text-sm rounded-xl px-4 py-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none hover:bg-white transition-all min-w-[280px] appearance-none cursor-pointer"
                        >
                          {project.files.map((f, i) => (
                            <option key={i} value={i}>V{i+1}: {f.file_name} ({new Date(f.uploaded_at).toLocaleDateString()})</option>
                          ))}
                        </select>
                        {!isCompareMode && (
                          <div className="flex gap-2 items-center">
                            <button 
                              onClick={() => handleDeleteVersion(baseVersionIdx)} 
                              className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              title="刪除此版本"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button 
                              onClick={handleExport}
                              disabled={loading}
                              className="bg-[#007AFF] hover:bg-[#0071E3] text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ml-2"
                            >
                              <Download size={18} /> 匯出 Excel
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
                        className="bg-[#007AFF] hover:bg-[#0071E3] text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading ? <RotateCcw size={16} className="animate-spin" /> : <Target size={16} />}
                        {loading ? '比對中...' : '執行比對'}
                      </button>
                    )}
                  </div>

                  {!isCompareMode && (
                    <div className="ml-auto flex items-center gap-4 bg-slate-50/50 p-2 pl-4 rounded-2xl border border-slate-100">
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">上傳新版本</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          id="quick-upload"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                        />
                        <label htmlFor="quick-upload" className="text-xs font-semibold text-blue-600 cursor-pointer hover:text-blue-700">
                          {file ? file.name : "選擇 Excel 檔案..."}
                        </label>
                      </div>
                      <button
                        onClick={handleUpload}
                        disabled={loading || !file}
                        className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-sm border border-slate-100"
                      >
                        {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Upload size={18} />}
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
                <div className="flex justify-between items-center bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-sm">
                  <div className="flex items-center gap-8">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest block mb-2 px-1 flex items-center gap-1.5">
                        <Target size={12} className="text-slate-400" /> 類別層級
                      </span>
                      <div className="flex bg-slate-100/50 p-1 rounded-xl w-fit">
                        {[1, 2].map((d) => (
                          <button
                            key={d}
                            onClick={() => handleDepthChange(d)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              project.classification_depth === d ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            }`}
                          >Lv.{d}</button>
                        ))}
                      </div>
                    </div>
                    <div className="w-px h-10 bg-slate-200/50"></div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest block mb-1 px-1 flex items-center gap-1.5">
                        <BarChart3 size={12} className="text-slate-400" /> 項目統計
                      </span>
                      <div className="flex items-baseline gap-1.5 px-1">
                        <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                          {isCompareMode && diffResult ? diffResult.diff.rows.length : totalRows} 
                        </span>
                        <span className="text-xs font-medium text-slate-400">筆</span>
                        {isPending && <div className="ml-2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => startTransition(() => setShowUnclassified(!showUnclassified))}
                    className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all border ${
                      showUnclassified 
                        ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm"
                    } ${isPending ? 'opacity-50 cursor-wait' : ''} flex items-center gap-2`}
                  >
                    {showUnclassified ? <AlertCircle size={16} /> : <Search size={16} />}
                    {showUnclassified ? "顯示全部項目" : "僅看未分類項目"}
                  </button>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest bg-slate-50/50 sticky top-0 z-10 border-b border-slate-100/50">
                        <tr>
                          {isCompareMode ? (
                            <th className="px-6 py-4 text-center sticky left-0 bg-inherit shadow-[1px_0_0_0_rgba(0,0,0,0.05)] min-w-[100px]">差異狀態</th>
                          ) : (
                            <th className="px-6 py-4 text-center sticky left-0 bg-inherit shadow-[1px_0_0_0_rgba(0,0,0,0.05)] min-w-[40px] w-10">
                              <input 
                                type="checkbox" 
                                onChange={(e)=>setSelectedIndices(e.target.checked ? (result?.rows || []).map((_:any, i:number)=>i) : [])} 
                                className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" 
                              />
                            </th>
                          )}
                          <th className={`px-6 py-4 sticky z-20 bg-inherit shadow-[1px_0_0_0_rgba(0,0,0,0.05)] ${isCompareMode ? 'left-[100px]' : 'left-10'} max-w-[120px]`}>主控分類 (Lv.{project.classification_depth})</th>
                          <th className="px-6 py-4 text-center w-12 text-[9px]">項次</th>
                          <th className="px-6 py-4 min-w-[200px] max-w-[400px]">項目名稱 (Description)</th>
                          <th className="px-6 py-4 text-center w-14">單位</th>
                          <th className="px-6 py-4 text-right w-16">數量</th>
                          <th className="px-6 py-4 text-right w-24">單價</th>
                          <th className="px-6 py-4 text-right w-28">複價</th>
                          <th className="px-6 py-4 min-w-[120px]">備註</th>
                          {isCompareMode && <th className="px-6 py-4 text-center w-16">決策</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {/* 這裡合併顯示已被刪除的舊項目 (僅比對模式) */}
                        {isCompareMode && diffResult?.removed_rows.map((row: any, i: number) => {
                          const isKept = keptRemovedRows.some(kr => kr.item_no === row.item_no && kr.description === row.description);
                          return (
                            <ProjectTableRow 
                               key={`removed-${i}`} 
                               row={row} 
                               isRemovedRow={true} 
                               isKept={isKept}
                               onKeep={() => setKeptRemovedRows([...keptRemovedRows, row])}
                               formatCurrency={formatCurrency}
                               getCategoryColor={getCategoryColor}
                            />
                          );
                        })}

                        {(isCompareMode ? (diffResult?.diff.rows || []) : (result?.rows || [])).map((row: any, i: number) => {
                          if (isCompareMode && ignoredItemIndices.includes(i)) return null;
                          
                          const displayCategory = (row.system_category === "未分類" || row.system_category === "無類別" || !row.system_category) 
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
                    
                    {/* 無限下滑偵測點 */}
                    {hasMore && !isCompareMode && (
                        <div 
                          ref={lastRowElementRef} 
                          className="py-8 flex justify-center items-center gap-2 text-slate-400 bg-white border-t border-slate-50"
                        >
                            {isFetchingMore ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs font-medium">載入更多項目中...</span>
                                </>
                            ) : (
                                <span className="text-xs">下滑載入更多項目 ({result?.rows?.length || 0} / {totalRows})</span>
                            )}
                        </div>
                    )}
                    
                    {!hasMore && !isCompareMode && (result?.rows?.length || 0) > 0 && (
                        <div className="py-8 text-center text-slate-300 text-xs bg-slate-50/50 italic">
                            已顯示所有項目 (共 {totalRows} 筆)
                        </div>
                    )}
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
                <button onClick={() => {setEditingRowIndex(null); setModalOpen(true);}} className="bg-white text-slate-900 px-8 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2">
                   <Target size={18} className="text-blue-500" /> 批次修改分類
                </button>
                <button onClick={() => setSelectedIndices([])} className="text-slate-400 hover:text-white font-bold transition-colors">取消</button>
              </div>
            )}
          </div>
        )}

        {/* Other Tabs Placeholders */}
        {activeTab === "inquiry" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
            {!activeInquiryCategory ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-800 flex items-center gap-3 tracking-tight">
                      詢價中心
                      <div className="text-[11px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold shadow-sm flex items-center gap-1.5 uppercase tracking-wide">
                        <BarChart3 size={12} /> {totalRows} Items
                      </div>
                    </h3>
                    <p className="text-slate-400 mt-2 text-sm">系統已根據 LV.2 大類別自動彙整項目，您可以點擊類別查看細節並準備詢價。</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const analysisSystems = result?.analysis?.systems || {};
                    const groups: Record<string, { count: number, total: number, items: any[] }> = {};
                    
                    // 從後端的全量分析摘要中提取資料（這涵盖了整份標單，而不僅是前 50 筆）
                    Object.entries(analysisSystems).forEach(([fullPath, info]: [string, any]) => {
                      const parts = fullPath.split(" > ") || ["未分類"];
                      // 以「二級顯示名稱」作為彙整基準
                      const groupKey = parts.length >= 2 ? parts[1].trim() : parts[0].trim();
                      
                      if (!groups[groupKey]) groups[groupKey] = { count: 0, total: 0, items: [] };
                      groups[groupKey].count += info.count || 0;
                      groups[groupKey].total += info.total_amount || 0;
                    });

                    return Object.entries(groups).map(([groupKey, info]) => {
                      const colorClass = getCategoryColor(groupKey);

                      return (
                        <div 
                          key={groupKey} 
                          onClick={() => setActiveInquiryCategory(groupKey)}
                          className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden"
                        >
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${colorClass.split(" ")[0]}`}></div>
                          
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-lg font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">{groupKey}</h4>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">項目</span>
                              <span className="text-xl font-semibold text-slate-900">{info.count} <small className="text-[10px] font-medium text-slate-400 ml-0.5">筆</small></span>
                            </div>
                            <div className="w-px h-6 bg-slate-100 mx-1"></div>
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">預估總額</span>
                              <span className="text-xl font-semibold text-blue-600">{formatCurrency(info.total)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-8 fade-in">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveInquiryCategory(null)}
                    className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm text-slate-400 hover:text-blue-600"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-800 tracking-tight">
                      {activeInquiryCategory} - 項目清單
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">檢視並確認要加入詢價的項目細節。</p>
                  </div>
                </div>

                    <div className="flex items-center gap-4">
                       {Object.keys(inquiryEdits).length > 0 && (
                         <button 
                           onClick={saveInquiryChanges}
                           disabled={isSavingInquiry}
                           className="px-6 py-2.5 bg-[#007AFF] text-white rounded-full font-semibold text-sm shadow-lg shadow-blue-500/20 hover:bg-[#0071E3] transition-all flex items-center gap-2 animate-in zoom-in"
                         >
                           {isSavingInquiry ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
                           {isSavingInquiry ? "儲存中..." : `儲存 ${Object.keys(inquiryEdits).length} 筆變更`}
                         </button>
                       )}
                    </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100/50">
                      <tr>
                        <th className="px-6 py-4 w-14">項次</th>
                        <th className="px-6 py-4 min-w-[200px]">項目名稱 (Description)</th>
                        <th className="px-6 py-4 text-center w-16">單位</th>
                        <th className="px-6 py-4 text-right w-20">數量</th>
                        <th className="px-6 py-4 text-center w-32 bg-amber-50/20">廠商報價</th>
                        <th className="px-6 py-4 text-center w-32">廠商複價</th>
                        <th className="px-6 py-4 text-center w-24 bg-blue-50/20">折數 (%)</th>
                        <th className="px-6 py-4 text-right w-32 bg-[#007AFF] text-white">公司成本</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {isFetchingCategoryItems ? (
                        <>
                          {[...Array(5)].map((_, i) => (
                            <tr key={i} className="border-b border-slate-50 animate-pulse">
                              <td className="px-6 py-4"><div className="h-3 bg-slate-100 rounded-full w-12"></div></td>
                              <td className="px-6 py-4"><div className={`h-3 bg-slate-100 rounded-full ${i % 2 === 0 ? 'w-4/5' : 'w-3/5'}`}></div></td>
                              <td className="px-6 py-4 text-center"><div className="h-3 bg-slate-100 rounded-full w-8 mx-auto"></div></td>
                              <td className="px-6 py-4 text-right"><div className="h-3 bg-slate-100 rounded-full w-10 ml-auto"></div></td>
                              <td className="px-6 py-4 text-right"><div className="h-3 bg-blue-50 rounded-full w-20 ml-auto"></div></td>
                              <td className="px-6 py-4 text-right"><div className="h-3 bg-blue-100 rounded-full w-24 ml-auto"></div></td>
                            </tr>
                          ))}
                        </>
                      ) : categoryItems.length > 0 ? (
                        <>
                          {(() => {
                            const catPath = Object.keys(reportConfigEdits.categories || {}).find(p => p.endsWith(activeInquiryCategory || ""));
                            const defaultDiscount = catPath ? (reportConfigEdits.categories[catPath]?.discount || 1) : 1;

                            return categoryItems.slice(0, displayedCategoryItemsCount).map((row: any, i: number) => {
                              const editKey = `${row.item_no}|SEP|${row.description}`;
                              const currentEdit = inquiryEdits[editKey];
                              
                              const unitPrice = currentEdit?.unit_price !== undefined ? currentEdit.unit_price : parseFloat(row.unit_price || 0);
                              const discountRate = currentEdit?.discount_rate !== undefined ? currentEdit.discount_rate : (row.discount_rate !== undefined ? row.discount_rate : defaultDiscount);
                              
                              const quantity = parseFloat(row.quantity || 0);
                              const totalPrice = quantity * unitPrice;
                              const internalCost = totalPrice * discountRate;
                              
                              return (
                                <tr key={i} className={`hover:bg-blue-50/30 transition-colors border-b border-slate-50 last:border-0 ${currentEdit ? 'bg-amber-50/20' : ''}`}>
                                  <td className="px-6 py-4 font-mono text-slate-400 w-14 whitespace-nowrap">{row.item_no || "-"}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800 min-w-[200px] whitespace-normal break-words leading-relaxed">{row.description}</td>
                                  <td className="px-6 py-4 text-center w-16 text-slate-500">{row.unit}</td>
                                  <td className="px-6 py-4 text-right font-black w-20">{formatQuantity(row.quantity)}</td>
                                  <td className="px-6 py-4 text-center w-32 bg-amber-50/10">
                                    <input 
                                      type="number"
                                      value={unitPrice === 0 ? "" : unitPrice}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                        setInquiryEdits(prev => ({
                                          ...prev,
                                          [editKey]: { ...(prev[editKey] || { discount_rate: discountRate }), unit_price: val }
                                        }));
                                      }}
                                      className="w-full bg-white border border-amber-100 rounded-lg px-2 py-1.5 text-center font-black text-amber-600 focus:ring-2 focus:ring-amber-500 shadow-sm outline-none transition-all placeholder:text-amber-300"
                                    />
                                  </td>
                                  <td className="px-6 py-4 text-center font-black text-slate-400 w-32">{formatCurrency(totalPrice)}</td>
                                  <td className="px-6 py-4 text-center w-24 bg-blue-50/10">
                                    <div className="flex items-center justify-center gap-1">
                                      <input 
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="200"
                                        value={(discountRate * 100).toFixed(0)}
                                        onChange={(e) => {
                                          const val = (parseFloat(e.target.value) || 0) / 100;
                                          setInquiryEdits(prev => ({
                                            ...prev,
                                            [editKey]: { ...(prev[editKey] || { unit_price: unitPrice }), discount_rate: val }
                                          }));
                                        }}
                                        className="w-16 bg-white border border-blue-100 rounded-lg px-2 py-1.5 text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none transition-all"
                                      />
                                      <span className="text-xs font-bold text-slate-400">%</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right font-black text-blue-700 bg-blue-50/10 w-32">{formatCurrency(internalCost)}</td>
                                </tr>
                              );
                            });
                          })()}
                          {categoryItems.length > displayedCategoryItemsCount && (
                            <tr>
                              <td colSpan={8} className="py-6 text-center bg-slate-50/30">
                                <button 
                                  onClick={() => setDisplayedCategoryItemsCount(prev => prev + 200)}
                                  className="px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-black text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                  顯示更多項目 (還有 {categoryItems.length - displayedCategoryItemsCount} 筆)
                                </button>
                              </td>
                            </tr>
                          )}
                        </>
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-20 text-center text-slate-400 italic">尚未找到相關項目資料。</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                  <button 
                    onClick={() => setTemplateModalOpen(true)}
                    className="px-6 py-3 rounded-full font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-2"
                  >
                    <SettingsIcon size={18} /> 模板設定
                  </button>
                  <button 
                    onClick={() => setActiveInquiryCategory(null)}
                    className="px-8 py-3 rounded-full font-semibold text-slate-400 hover:text-slate-600 transition-all"
                  >
                    取消返回
                  </button>
                  <button 
                    onClick={handleInquiryExport}
                    className="px-10 py-4 bg-slate-900 text-white rounded-full font-semibold shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet size={20} /> 設計詢價內容
                  </button>
                </div>
              </div>
            )}
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

      <InquiryTemplateModal 
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSave={handleSaveInquiryTemplate}
        initialData={{
          ...reportConfigEdits.inquiry_template,
          project_name: reportConfigEdits.inquiry_template?.project_name || project.name,
          project_location: reportConfigEdits.inquiry_template?.project_location || project.location
        }}
      />
    </div>
  );
}
