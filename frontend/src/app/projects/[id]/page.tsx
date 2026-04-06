"use client";

import { useState, useEffect, useTransition, memo, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "../../constants";
import { safeFetch } from "../../utils/api_utils";
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
  Calculator,
  TrendingUp,
  Settings as SettingsIcon,
  Phone,
  Printer,
  Mail,
  UserCheck,
  MapPinned,
  Clock,
  Tag,
  User
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
  delivery_requirement?: string;
  sender_name?: string;
  sender_title?: string;
  mail_provider?: "GMAIL" | "OUTLOOK";
  outlook_client_id?: string;
  mail_subject_template?: string;
  mail_body_template?: string;
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

/**
 * 渲染模板工具
 */
export const renderTemplate = (template: string, context: Record<string, string>) => {
  if (!template) return "";
  let rendered = template;
  Object.entries(context).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(placeholder, value || "");
  });
  return rendered;
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
    deadline: initialData?.deadline || "",
    delivery_requirement: initialData?.delivery_requirement || "",
    sender_name: initialData?.sender_name || "Wanlin",
    sender_title: initialData?.sender_title || "採購工程師",
    mail_provider: initialData?.mail_provider || "GMAIL",
    outlook_client_id: initialData?.outlook_client_id || "",
    mail_subject_template: initialData?.mail_subject_template || "【詢價】{{project_name}}－{{category}} (請於 {{deadline}} 前提供回報)",
    mail_body_template: initialData?.mail_body_template || "{{vendor_name}} 您好：\n\n檢附「{{project_name}}」項目詢價單如附件，煩請貴司協助針對「{{category}}」項目評估報價，並於 {{deadline}} 前提供回覆，謝謝。\n\n詳細規格請參閱附件 Excel。\n\n祝  商祺\n\n{{company_name}}\n{{sender_title}} {{sender_name}}\n電話：{{phone}}"
  });

  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body'>('body');

  // 插入變數輔助
  const insertTag = (tag: string) => {
    const placeholder = `{{${tag}}}`;
    if (lastFocusedField === 'subject') {
      setData(prev => ({ ...prev, mail_subject_template: (prev.mail_subject_template || "") + placeholder }));
    } else {
      setData(prev => ({ ...prev, mail_body_template: (prev.mail_body_template || "") + placeholder }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-[700px] max-w-full overflow-hidden flex flex-col scale-in-center">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <SettingsIcon className="text-blue-500" /> Mail模板設定
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
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">報價截止日</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="例如: 2026/04/05"
                  value={data.deadline}
                  onChange={e => setData({...data, deadline: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">寄件人姓名 (Email用)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.sender_name}
                  onChange={e => setData({...data, sender_name: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">寄件人職稱 (Email用)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={data.sender_title}
                  onChange={e => setData({...data, sender_title: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">交期需求 (預計進場時間)</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="例如: 2026年5月中旬"
                value={data.delivery_requirement}
                onChange={e => setData({...data, delivery_requirement: e.target.value})}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            </div>
          </div>

          {/* Email 客製化區域 */}
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <Mail size={16} /> 郵件內容自定義
              </h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                正在編輯：{lastFocusedField === 'subject' ? '【主旨】' : '【內文】'}
              </span>
            </div>

            <div className="bg-blue-50/30 p-4 rounded-2xl flex flex-wrap gap-2">
              {[
                { label: "專案名稱", key: "project_name" },
                { label: "分類", key: "category" },
                { label: "截止日", key: "deadline" },
                { label: "供應商", key: "vendor_name" },
                { label: "發送者", key: "sender_name" },
                { label: "公司", key: "company_name" },
                { label: "電話", key: "phone" },
              ].map(tag => (
                <button 
                  key={tag.key}
                  type="button"
                  onClick={() => insertTag(tag.key)}
                  className="bg-white border border-blue-100 text-[11px] font-bold text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  + {tag.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">郵件主旨模板</label>
                <input 
                  type="text"
                  onFocus={() => setLastFocusedField('subject')}
                  value={data.mail_subject_template}
                  onChange={e => setData({...data, mail_subject_template: e.target.value})}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all ${lastFocusedField === 'subject' ? 'border-blue-400 ring-2 ring-blue-500/5' : 'border-slate-100'}`}
                  placeholder="輸入主旨模板，可用 {{variable}}"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">郵件內文模板</label>
                <textarea 
                  rows={8}
                  onFocus={() => setLastFocusedField('body')}
                  value={data.mail_body_template}
                  onChange={e => setData({...data, mail_body_template: e.target.value})}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm leading-relaxed ${lastFocusedField === 'body' ? 'border-blue-400 ring-2 ring-blue-500/5' : 'border-slate-100'}`}
                  placeholder="輸入內文模板，可用 {{variable}}"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <Zap size={16} /> 自動草稿服務設定 (God-Mode)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">選擇郵件服務</label>
                <select 
                  value={data.mail_provider}
                  onChange={e => setData({...data, mail_provider: e.target.value as any})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                >
                  <option value="GMAIL">Google Gmail (OAuth2)</option>
                  <option value="OUTLOOK">Microsoft Outlook (MS Graph)</option>
                </select>
              </div>

              {data.mail_provider === "OUTLOOK" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Outlook Client ID</label>
                  <input 
                    type="text" 
                    placeholder="輸入 Azure 應用程式編號"
                    value={data.outlook_client_id}
                    onChange={e => setData({...data, outlook_client_id: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>
              )}
            </div>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              <p className="text-[11px] text-blue-600 leading-relaxed font-medium">
                {data.mail_provider === "GMAIL" ? (
                  <>💡 <b>Gmail 提醒：</b>請確保 <code>backend/secrets/credentials.json</code> 已備妥。第一次執行時，伺服器終端機會跳出網頁請您登入授權。</>
                ) : (
                  <>💡 <b>Outlook 提醒：</b>請填入 Azure 的 Client ID。執行時，伺服器終端機會提供裝置代碼 (Device Code) 供您驗證。</>
                )}
              </p>
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
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (path: string, addKeyword: boolean, keyword: string, itemName: string) => void;
  categoriesTree: any;
  rowDescription: string;
  isBatch?: boolean;
  isSubmitting?: boolean;
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
            disabled={isSubmitting}
            onClick={() => onSave("未分類", false, "", rowDescription)}
            className="px-4 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={16} /> {isSubmitting ? '處理中...' : '設為未分類'}
          </button>
          <div className="flex gap-3">
            <button disabled={isSubmitting} onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
              取消
            </button>
            <button 
              disabled={!selectedPath || isSubmitting}
              onClick={() => onSave(selectedPath, addKeyword, keyword, rowDescription)}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {isSubmitting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {isSubmitting ? '儲存中...' : '確認儲存'}
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
  displayCategory,
  onConfirmAI
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
            <div className="flex items-center gap-1.5 group/cat">
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold font-mono flex items-center gap-1 ${getCategoryColor(row.system_category)}`}>
                {row.is_ai_category && (
                  <button onClick={(e) => { e.stopPropagation(); onConfirmAI && onConfirmAI(); }} title="確認 AI 建議" className="flex items-center bg-amber-50 hover:bg-emerald-50 text-amber-500 hover:text-emerald-600 px-1 py-0.5 rounded shadow-sm border border-transparent hover:border-emerald-200 transition-all">
                    <Zap size={10} className="fill-current animate-pulse mr-0.5" />
                    <span className="text-[8px]">確認</span>
                  </button>
                )}
                <span onClick={(e) => { e.stopPropagation(); onEdit && onEdit(); }} className="cursor-pointer hover:underline decoration-dashed underline-offset-2">
                  {displayCategory}
                </span>
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
            <div className="flex items-center gap-1.5 group/cat">
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold font-mono flex items-center gap-1 ${getCategoryColor(row.system_category)}`}>
                {row.is_ai_category && (
                  <button onClick={(e) => { e.stopPropagation(); onConfirmAI && onConfirmAI(); }} title="確認 AI 建議" className="flex items-center bg-amber-50 hover:bg-emerald-50 text-amber-500 hover:text-emerald-600 px-1 py-0.5 rounded shadow-sm border border-transparent hover:border-emerald-200 transition-all">
                    <Zap size={10} className="fill-current animate-pulse mr-0.5" />
                    <span className="text-[8px]">確認</span>
                  </button>
                )}
                <span onClick={(e) => { e.stopPropagation(); onEdit && onEdit(); }} className="cursor-pointer hover:underline decoration-dashed underline-offset-2">
                  {displayCategory}
                </span>
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
  const [error, setError] = useState<string | null>(null);
  const [showUnclassified, setShowUnclassified] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [activeInquiryCategory, setActiveInquiryCategory] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<any[]>([]);
  const [displayedCategoryItemsCount, setDisplayedCategoryItemsCount] = useState(100);
  const [isFetchingCategoryItems, setIsFetchingCategoryItems] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [diffResult, setDiffResult] = useState<any>(null);
  const searchParams = useSearchParams();
  const [baseVersionIdx, setBaseVersionIdx] = useState(0);
  
  // URL 同步：當網址參數 v 變更時更新 baseVersionIdx，或初始化時設定
  useEffect(() => {
    const v = searchParams.get("v");
    if (v !== null) {
      const idx = parseInt(v);
      if (!isNaN(idx)) setBaseVersionIdx(idx);
    }
  }, [searchParams]);
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
  // Custom rows: subtotal dividers, deduction items, and formulas
  const [customRows, setCustomRows] = useState<Array<{id: string, type: 'subtotal'|'deduction'|'formula', label: string, afterIndex: number, amount?: number, formula?: string}>>([]);
  // Drag state for reordering
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragCustomId, setDragCustomId] = useState<string | null>(null);
  const [dragCatIndex, setDragCatIndex] = useState<number | null>(null);

  // Simulation states
  const [simulationMode, setSimulationMode] = useState(false);
  const [costSimFactor, setCostSimFactor] = useState(0); // -20 to +20 percentage
  const [profitSimFactor, setProfitSimFactor] = useState(0); // -20 to +20 percentage
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ignoredItemIndices, setIgnoredItemIndices] = useState<number[]>([]);
  const [keptRemovedRows, setKeptRemovedRows] = useState<any[]>([]);
  const [revertedItemIndices, setRevertedItemIndices] = useState<number[]>([]);
  
  // 詢價單編輯暫存
  const [inquiryEdits, setInquiryEdits] = useState<Record<string, { unit_price: number, discount_rate: number }>>({});
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [isAIClassifying, setIsAIClassifying] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [aiProgress, setAiProgress] = useState(0);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  
  // 智慧廠商媒合狀態
  const [selectedInquiryIndices, setSelectedInquiryIndices] = useState<number[]>([]);
  const [selectedInquiryRow, setSelectedInquiryRow] = useState<any | null>(null);
  const [matchedVendors, setMatchedVendors] = useState<any[]>([]);
  const [isMatchingVendors, setIsMatchingVendors] = useState(false);
  const [selectedVendorForExport, setSelectedVendorForExport] = useState<any | null>(null);

  // 當選擇項目時，自動媒合廠商
  useEffect(() => {
    if (selectedInquiryRow) {
      const matchSuppliers = async () => {
        setIsMatchingVendors(true);
        try {
          const desc = encodeURIComponent(selectedInquiryRow.description || "");
          const note = encodeURIComponent(selectedInquiryRow.remark || selectedInquiryRow.note || "");
          const cat = encodeURIComponent(activeInquiryCategory || "");
          const res = await fetch(`${API_BASE_URL}/match_vendors?description=${desc}&note=${note}&category=${cat}`);
          const data = await res.json();
          setMatchedVendors(data || []);
        } catch (e) {
          console.error("媒合失敗", e);
        } finally {
          setIsMatchingVendors(false);
        }
      };
      matchSuppliers();
    } else {
      setMatchedVendors([]);
    }
  }, [selectedInquiryRow, activeInquiryCategory]);



  // 當選中詢價類別或版本變更時，從後端抓取該類別的所有項目
  useEffect(() => {
    if (activeInquiryCategory && projectId) {
      const fetchItems = async () => {
        setIsFetchingCategoryItems(true);
        try {
          const response = await fetch(`${API_BASE_URL}/projects/${projectId}/inquiry_rows?system_category=${encodeURIComponent(activeInquiryCategory)}&version_idx=${baseVersionIdx}`);
          const rows = await response.json();
          setCategoryItems(rows || []);
          setDisplayedCategoryItemsCount(100);
        } catch (error) {
          console.error("Failed to fetch category items:", error);
        } finally {
          setIsFetchingCategoryItems(false);
        }
      };
      fetchItems();
      setInquiryEdits({}); 
      setSelectedInquiryIndices([]);
    } else {
      setCategoryItems([]);
      setSelectedInquiryIndices([]);
    }
  }, [activeInquiryCategory, projectId, baseVersionIdx]);

  const fetchReport = useCallback(async (depth: number) => {
    setIsFetchingReport(true);
    try {
      const { data, ok } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/reports?depth=${depth}&version_idx=${baseVersionIdx}`);
      if (ok && data) {
        setReportData(data);
        if (data.config) {
          setReportConfigEdits({
            floor_area: data.floor_area || "",
            categories: data.config.categories || {},
            summary: data.config.summary || { profit_rate: 0.18, tax_rate: 0.05 },
            categoryOrder: data.config.categoryOrder || [],
            inquiry_template: data.config.inquiry_template || {}
          });
          setCustomRows(data.config.custom_rows || []);
        }
      }
    } catch (e) {
      console.error("報表載入失敗", e);
    } finally {
      setIsFetchingReport(false);
    }
  }, [projectId, baseVersionIdx]);

  useEffect(() => {
    if (activeTab === "report" || activeTab === "analysis") {
      fetchReport(reportDepth);
    }
  }, [activeTab, reportDepth, fetchReport]);

  const saveReportConfig = async () => {
    try {
      setLoading(true);
      const { data, ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/reports/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reportConfigEdits, custom_rows: customRows })
      });
      if (ok) {
        fetchReport(reportDepth);
        alert("報表設定已儲存");
      } else {
        alert(error || "儲存失敗");
      }
    } catch (e) {
      alert("儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  const saveInquiryChanges = async () => {
    if (!activeInquiryCategory || Object.keys(inquiryEdits).length === 0) return;
    
    // 防錯機制：編輯歷史版本時彈出確認
    const isLatest = baseVersionIdx === (project?.files.length || 1) - 1;
    if (!isLatest) {
      if (!window.confirm(`⚠️ 您正在修改「歷史版本 (V${baseVersionIdx + 1})」，這將直接覆寫該版本的原始數據。確定要繼續嗎？`)) {
        return;
      }
    }

    setIsSavingInquiry(true);
    try {
      const updates = Object.entries(inquiryEdits).map(([key, val]) => {
        const [item_no, description] = key.split("|SEP|");
        return { item_no, description, ...val };
      });

      const { ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/inquiry_rows/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          system_category: activeInquiryCategory, 
          updates, 
          version_idx: baseVersionIdx 
        })
      });
      
      if (ok) {
        // 重新抓取資料以同步
        const { data: rows, ok: fetchOk } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/inquiry_rows?system_category=${encodeURIComponent(activeInquiryCategory)}`);
        if (fetchOk) {
          setCategoryItems(rows || []);
          setInquiryEdits({});
          alert("詢價修改已儲存");
        }
      } else {
        alert(error || "儲存失敗");
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

  const fetchProject = useCallback(async (pageNum: number = 1, append: boolean = false, customPageSize?: number, customFilterType: string | null = null) => {
    // 捲動不快取，初次載入才檢查
    if (pageNum === 1 && !append && !customFilterType) {
        const cacheKey = `project_${projectId}_v${baseVersionIdx}`;
        if (typeof window !== "undefined") {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    setProject(parsed);
                    if (parsed.files && parsed.files[baseVersionIdx]?.data) {
                        setResult(parsed.files[baseVersionIdx].data);
                    }
                } catch (e) {
                    console.error("快取解析失敗", e);
                }
            }
        }
    }

    try {
      setError(null);
      const limit = customPageSize || 50;
      const effectiveFilter = customFilterType !== null ? customFilterType : filterType;
      const url = `${API_BASE_URL}/projects/${projectId}?page=${pageNum}&page_size=${limit}&version_idx=${baseVersionIdx}${effectiveFilter ? `&filter_type=${effectiveFilter}` : ""}`;
      
      const { data, ok, error } = await safeFetch(url);
      if (ok && data && data.id) {
        setProject(data);
        // 重要：不再固定取最後一個，而是取 baseVersionIdx
        const targetFile = data.files[baseVersionIdx] || data.files[data.files.length - 1];
        if (targetFile && targetFile.data) {
          const newData = targetFile.data;
          const pagination = newData.pagination;

          if (append) {
            setResult((prev: any) => {
              const prevRows = prev?.rows || [];
              const newRows = newData.rows || [];
              const existingIds = new Set(prevRows.map((r: any) => r._original_index));
              const uniqueNewRows = newRows.filter((r: any) => !existingIds.has(r._original_index));
              
              return {
                ...prev,
                rows: [...prevRows, ...uniqueNewRows]
              };
            });
          } else {
            setResult(newData);
            // 只有在首次載入 (及 AI 重新整理) 時更新快取
            const cacheKey = `project_${projectId}_v${baseVersionIdx}`;
            if (typeof window !== "undefined" && !effectiveFilter) {
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
  }, [projectId, baseVersionIdx, filterType]);

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


  // 監控 AI 分類進度（背景輪詢）
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isAIClassifying) {
      intervalId = setInterval(async () => {
        try {
          const { data, ok } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/ai-status`, { method: "GET" });
          if (ok && data) {
            if (data.status === "processing" || data.status === "started") {
              if (data.progress && data.progress !== aiProgress) {
                 setAiProgress(data.progress);
                 if (data.progress > 0) {
                    setAiStatusMessage(`⚡ AI 正在掃描並分類標單項目...`);
                    // 使用 page * 50 抓取目前已經加載的頁數長度
                    fetchProject(1, false, page * 50);
                 }
              }
            } else if (data.status === "completed") {
              setIsAIClassifying(false);
              setAiProgress(100);
              setAiStatusMessage("✅ AI 分類全部完成！");
              fetchProject(1, false);
              if (project?.classification_depth) {
                fetchReport(project.classification_depth);
              }
              setTimeout(() => { setAiStatusMessage(""); setAiProgress(0); }, 5000);
            } else if (data.status === "error") {
              setIsAIClassifying(false);
              setAiStatusMessage(`❌ AI 分類發生錯誤: ${data.last_error || "請重試"}`);
              setTimeout(() => setAiStatusMessage(""), 5000);
            }
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isAIClassifying, projectId, baseVersionIdx, project?.classification_depth, aiProgress, fetchProject, page]);

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
  }, [projectId, fetchProject, baseVersionIdx]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); // START LOADING
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        // [FIX] 不再自動跳轉/分類，保持目前畫面
        // setResult(data.data); 
        
        // 為了讓下拉選單即時更新，清除 localStorage 快取
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`project_${projectId}`)) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.error("清除快取失敗", e);
        }

        await fetchProject();
        alert("標單上傳成功！請從版本選單中選擇新版本開始作業。");
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
    
    // 防錯機制：編輯歷史版本時彈出確認
    const isLatest = baseVersionIdx === (project?.files.length || 1) - 1;
    if (!isLatest) {
      if (!window.confirm(`⚠️ 您正在修改「歷史版本 (V${baseVersionIdx + 1})」的分類，這將直接覆寫該版本的數據。確定要繼續嗎？`)) {
        return;
      }
    }

    setLoading(true);
    // 不再立即關閉 Modal，而是顯示載入狀態
    
    const endpoint = isBatch 
      ? `${API_BASE_URL}/projects/${projectId}/batch_classify`
      : `${API_BASE_URL}/projects/${projectId}/manual_classify`;
      
    const depth = project?.classification_depth || 4;
    const body = isBatch
      ? {
          row_indices: selectedIndices,
          new_category_path: path,
          add_keyword: addKeyword,
          keyword: keyword,
          classification_depth: depth,
          version_idx: baseVersionIdx
        }
      : {
          row_index: editingRowIndex,
          new_category_path: path,
          add_keyword: addKeyword,
          keyword: keyword,
          item_name: itemName,
          classification_depth: depth,
          version_idx: baseVersionIdx
        };

    // --- Optimistic UI Update ---
    const oldResult = result;
    if (result && !addKeyword) {
      try {
        const newRows = [...result.rows];
        const rawTargetIndices = isBatch ? selectedIndices : [editingRowIndex];
        // 排除 null
        const targetIndices = rawTargetIndices.filter((idx): idx is number => idx !== null);
        const newCat = path.split(" > ").slice(0, depth).join(" > ");
        
        targetIndices.forEach(idx => {
          const rowIndexInArray = newRows.findIndex((r: any) => (r._original_index !== undefined ? r._original_index : -1) === idx);
          if (rowIndexInArray !== -1) {
            newRows[rowIndexInArray] = { 
              ...newRows[rowIndexInArray], 
              system_category: newCat,
              is_manual_category: true,
              manual_raw_category: path
            };
          }
        });

        // 簡單更新分析摘要的計數（選擇性）
        const newAnalysis = JSON.parse(JSON.stringify(result.analysis));
        if (newAnalysis.systems) {
          targetIndices.forEach(idx => {
            const oldRow = result.rows.find((r: any) => (r._original_index !== undefined ? r._original_index : -1) === idx);
            if (!oldRow) return;
            const oldCat = oldRow.system_category || "未分類";
            const rowPrice = parseFloat(String(oldRow.total_price || 0).replace(/,/g, ""));
            
            if (newAnalysis.systems[oldCat]) {
              newAnalysis.systems[oldCat].count = Math.max(0, newAnalysis.systems[oldCat].count - 1);
              newAnalysis.systems[oldCat].total -= rowPrice;
            }
            if (!newAnalysis.systems[newCat]) {
              newAnalysis.systems[newCat] = { count: 0, total: 0, percentage: 0 };
            }
            newAnalysis.systems[newCat].count += 1;
            newAnalysis.systems[newCat].total += rowPrice;
          });
        }

        setResult({ ...result, rows: newRows, analysis: newAnalysis });
      } catch (err) {
        console.error("Optimistic UI failed", err);
      }
    }

    try {
      const { data: resData, ok, error } = await safeFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      if (ok && resData?.status === "success" && result) {
        const finalRows = result.rows.map((row: any) => {
          const patch = resData.updated_rows?.find((u: any) => u._original_index === row._original_index);
          return patch ? { ...row, ...patch } : row;
        });

        setResult({ 
          ...result, 
          rows: finalRows, 
          analysis: resData.analysis 
        });

        if (isBatch) setSelectedIndices([]);
        setModalOpen(false);
        
        if (addKeyword) {
          fetch(`${API_BASE_URL}/categories`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => setCategoriesTree(data));
        }
      } else {
        setResult(oldResult);
        alert(resData.message || "儲存失敗");
      }
    } catch (err) {
      console.error("Manual save failed", err);
      setResult(oldResult);
      alert("網路連線或伺服器錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleReclassify = async () => {
    if (!project || !window.confirm("確定要重新分析分類嗎？\n\n注意：系統僅會重新分析『自動分類』的項目，您手動修改過的分類將會被保留。")) return;
    
    setIsReclassifying(true);
    try {
      const { data, ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/reclassify?version_idx=${baseVersionIdx}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }, 120000);
      if (ok && data) {
        alert(`重新分析完成！\n本次共更新了 ${data.updated_count} 個項目的分類。`);
        await fetchProject(1, false);
        if (activeTab === "report" || activeTab === "analysis") {
          fetchReport(reportDepth);
        }
      } else {
        alert(error || "重新分析失敗");
      }
    } catch (e) {
      console.error(e);
      alert("重新分析失敗");
    } finally {
      setIsReclassifying(false);
    }
  };

  const handleAIClassify = async () => {
    if (!project) return;
    
    // 計算未分類數量 (過濾掉自訂或已經指定分類的項目)
    const unclassifiedCount = result?.rows?.filter((r: any) => r.system_category === "未分類" && !r.is_manual_category).length || 0;
    
    if (!window.confirm(`確定要啟用 AI 智慧分類填補未分類項目嗎？\n\n系統將會嘗試理解「未分類」項目的描述以及單位，並自動推測符合現有類別的最精準放置位置。\n\n注意：這可能會耗費一些時間，且推測結果可能含有少數瑕疵，事後仍可手動調整。`)) return;

    setIsAIClassifying(true);
    setAiProgress(0);
    setAiStatusMessage("⚡ 正在建立 AI 任務...");
    try {
      const { data, ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/ai-classify?version_idx=${baseVersionIdx}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }); 
      
      if (ok && (data?.status === "success" || data?.status === "started")) {
        setAiStatusMessage("⚡ AI 已經在背景啟動，請稍候...");
        // setIsAIClassifying(false) 已經拔除，讓它等 useEffect 輪詢自己抓到 completed/error
      } else {
        const detail = data?.detail || "";
        alert(`❌ AI 分類啟動失敗\n\n原因: ${data?.message || error || "未知錯誤"}\n\n${detail}`);
        setIsAIClassifying(false);
        setAiStatusMessage("");
      }
    } catch (e) {
      console.error("AI Classify Error:", e);
      alert("AI 分類發生網路錯誤，請檢視後端 Log。");
      setIsAIClassifying(false);
      setAiStatusMessage("");
    }
  };
  
  const handleStopAI = async () => {
    try {
      setAiStatusMessage("⚡ 正在停止分析...");
      await safeFetch(`${API_BASE_URL}/projects/${projectId}/ai-stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      // 停止後一秒，後端循環會自己中斷，這裡前端也強制關閉狀態
      setTimeout(() => setIsAIClassifying(false), 800);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    if (!project) return;
    window.location.href = `${API_BASE_URL}/projects/${project.id}/export?version_idx=${baseVersionIdx}`;
  };



  // 確認 AI 建議的功能 (Optimistic Update)
  const handleConfirmAI = async (rowIndices: number[]) => {
    // 立即更新畫面 (Optimistic)
    const previousResult = result ? JSON.parse(JSON.stringify(result)) : null;
    
    setResult((prev: any) => {
      if (!prev || !prev.rows) return prev;
      const newRows = prev.rows.map((r: any) => {
        if (rowIndices.includes(r._original_index !== undefined ? r._original_index : -1)) {
          return { ...r, is_ai_category: false, is_manual_category: true };
        }
        return r;
      });
      return { ...prev, rows: newRows };
    });

    try {
      const { ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/confirm_ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row_indices: rowIndices,
          version_idx: baseVersionIdx
        })
      });
      
      if (!ok) {
        console.error("[Optimistic UI] Rollback triggered due to fetch failure:", error);
        if (previousResult) setResult(previousResult);
      }
    } catch (e) {
      console.error("[Optimistic UI] Rollback triggered due to error:", e);
      if (previousResult) setResult(previousResult);
    }
  };

  const handleCompare = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const targetIdx = targetVersionIdx === -1 ? project.files.length - 1 : targetVersionIdx;
      const { data, ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          base_index: baseVersionIdx, 
          target_index: targetIdx
        }),
      }, 180000);
      if (ok && data) {
        setDiffResult(data.data);
      } else {
        alert(error || "比對失敗");
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

      const { data, ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/apply_diff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rows: mergedRows,
          file_name: targetFileName
        }),
      }, 60000);
      if (ok) {
        // --- UX Hint: 詳細的合併報告 ---
        const s = diffResult.diff.summary;
        const msg = [
          "🎉 合併成功並已建立新版本！",
          `--------------------------`,
          `📍 從 V${baseVersionIdx + 1} 繼承手動分類：${s.inherited_manual || 0} 筆`,
          `📍 保留 V${(targetVersionIdx === -1 ? project.files.length - 1 : targetVersionIdx) + 1} 現有手動分類：${s.kept_target_manual || 0} 筆`,
          `📍 剩餘新項目待分類：${s.added || 0} 筆`,
          `--------------------------`,
          `請從版本選單中切換至最新的「合併版本」查看結果。`
        ].join("\n");
        
        alert(msg);
        setIsCompareMode(false);
        setDiffResult(null);
        fetchProject();
      } else {
        alert(error || "套用失敗");
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
      
      const { data: updateData, ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_config: newConfig }),
      });
      
      if (ok && updateData) {
        setProject(updateData.project);
        setReportConfigEdits(updateData.project.report_config || {});
        setTemplateModalOpen(false);
        alert("詢價模板儲存成功！");
      } else {
        alert(error || "儲存失敗");
      }
    } catch (e) {
      console.error(e);
      alert("儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleInquiryExport = (vendorName?: string, vendorPhone?: string, vendorFax?: string) => {
    if (!project || !activeInquiryCategory || selectedInquiryIndices.length === 0) {
       alert("請先在列表中勾選要詢價的項目！");
       return;
    }

    // 優先使用參數，若無則使用選取的廠商
    const name = vendorName || selectedVendorForExport?.name;
    const phone = vendorPhone || selectedVendorForExport?.phone;
    const fax = vendorFax || selectedVendorForExport?.fax;
    
    let url = `${API_BASE_URL}/projects/${projectId}/inquiry_export?category=${encodeURIComponent(activeInquiryCategory)}&version_idx=${baseVersionIdx}&row_indices=${selectedInquiryIndices.join(",")}`;
    if (name) url += `&vendor_name=${encodeURIComponent(name)}`;
    if (phone) url += `&vendor_phone=${encodeURIComponent(phone)}`;
    if (fax) url += `&vendor_fax=${encodeURIComponent(fax)}`;
    
    // 改用 window.open 以確保在 Chrome 中有明顯的下載行為
    window.open(url, '_blank');
  };

  const sendInquiryEmail = async (vendor: any) => {
    if (!project || !activeInquiryCategory) return;
    
    const tpl: any = project.report_config?.inquiry_template || {
      company_name: "聖暉工程科技股份有限公司",
      phone: "02-2655-8067",
      sender_name: "Wanlin",
      mail_provider: "GMAIL"
    };

    const projectName = project.name || "";
    const category = activeInquiryCategory || "";
    const deadline = tpl.deadline || "指定日期";

    const context = {
      project_name: projectName,
      project_location: project.location || "",
      category: category,
      deadline: deadline,
      vendor_name: vendor.name,
      company_name: tpl.company_name,
      sender_name: tpl.sender_name || "",
      sender_title: tpl.sender_title || "",
      phone: tpl.phone || ""
    };

    const defaultSubject = `【詢價】${projectName}－${category} (請於 ${deadline} 前提供回報)`;
    const defaultBody = `${vendor.name} 您好：\n\n檢附「${projectName}」項目詢價單如附件，煩請貴司協助針對「${category}」項目評估報價，並於 ${deadline} 前提供回覆，謝謝。\n\n詳細規格請參閱附件 Excel。\n\n祝  商祺\n\n${tpl.company_name}\n${tpl.sender_title || ""} ${tpl.sender_name || ""}\n電話：${tpl.phone}`;

    let subject = tpl.mail_subject_template ? renderTemplate(tpl.mail_subject_template, context) : defaultSubject;
    let body = tpl.mail_body_template ? renderTemplate(tpl.mail_body_template, context) : defaultBody;

    // 處理 Body 的換行符號轉為 %0D%0A 以利後續處理
    body = body.replace(/\n/g, '%0D%0A');

    // --- 新增：呼叫後端 API 建立草稿 ---
    setLoading(true);
    try {
      const { data, ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/inquiry_draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: vendor,
          category: category,
          version_idx: baseVersionIdx,
          row_indices: selectedInquiryIndices.join(","),
          provider: tpl.mail_provider || "GMAIL",
          subject: subject,
          body: body
        })
      });

      if (ok && data?.status === "success") {
        alert(`🎉 神級自動化成功！\n已在您的 ${tpl.mail_provider} 草稿夾中建立電子郵件，並已自動夾帶 Excel 詢價單附件。`);
      } else {
        // 錯誤處理：如果是權限問題，或是找不到 credentials
        if (data?.message?.includes("FileNotFoundError")) {
          alert("錯誤：後端找不到 credentials.json。請將下載的金鑰放置於 backend/secrets/ 資料夾下。");
        } else {
          alert("建立草稿失敗: " + (data?.message || error || "未知錯誤"));
          
          // 回退機制：如果 API 失敗，至少讓使用者可以用 mailto
          console.log("正在啟用回退機制 (mailto)...");
          const mailtoUri = `mailto:${vendor.email || ""}?subject=${encodeURIComponent(subject)}&body=${body}`;
          window.location.href = mailtoUri;
          
          // 同步嘗試寫入剪貼簿
          const plainBody = body.replace(/%0D%0A/g, '\n');
          navigator.clipboard.writeText(plainBody).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Draft API failed", err);
      alert("連線後端建立草稿失敗，已自動開啟本地郵件程式作為備案。");
      const mailtoUri = `mailto:${vendor.email || ""}?subject=${encodeURIComponent(subject)}&body=${body}`;
      window.location.href = mailtoUri;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVersion = async (index: number) => {
    if (!project || !window.confirm("確定要刪除此標單版本嗎？此操作無法恢復。")) return;
    setLoading(true);
    try {
      const { ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/files/${index}`, {
        method: "DELETE",
      });
      if (ok) {
        await fetchProject();
        setDiffResult(null);
        setBaseVersionIdx(0);
        setTargetVersionIdx(-1);
      } else {
        alert(error || "刪除失敗");
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
      const { data: updateData, ok, error } = await safeFetch(`${API_BASE_URL}/projects/${projectId}/settings`, {
        method: "PATCH",
        body: JSON.stringify({ classification_depth: newDepth }),
      });
      if (ok && updateData) {
        setProject(updateData.project);
      } else {
        alert(error || "更新失敗");
        return;
      }
      
      if (result && result.rows) {
        setLoading(true);
        const { data: anaData, ok: anaOk, error: anaErr } = await safeFetch(`${API_BASE_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: result.rows, max_depth: newDepth }),
        }, 60000);
        if (anaOk && anaData) {
          setResult({ ...result, analysis: anaData.analysis, rows: anaData.rows });
        } else {
          alert(anaErr || "分析失敗");
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

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[40px] shadow-xl border border-slate-100 max-w-md w-full flex flex-col items-center gap-6">
          <AlertCircle size={64} className="text-rose-500" />
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {error === "連線逾時 (Timeout)" ? "伺服器正在喚醒中" : "載入失敗"}
            </h2>
            <p className="text-slate-400 mt-3 font-medium leading-relaxed">
              {error === "連線逾時 (Timeout)" 
                ? "後端服務正在啟動（約需 30-60 秒），請點擊下方按鈕重試。" 
                : error}
            </p>
          </div>
          <button 
            onClick={() => fetchProject()}
            className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} /> 重新整理
          </button>
          <button 
            onClick={() => router.push("/projects")}
            className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold animate-pulse">正在載入專案資料...</p>
      </div>
    );
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
                      <>
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
                          <div className="flex flex-col gap-4 mb-6">
                            <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-sm">
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">配置工具</span>
                                  <button
                                    onClick={() => setCustomRows(prev => [...prev, {
                                      id: Date.now().toString(),
                                      type: 'formula',
                                      label: '自定義小計',
                                      afterIndex: (reportData?.categories.filter((c: any) => !reportConfigEdits.categories[c.path]?.hidden).length ?? 1) - 1,
                                      formula: ''
                                    }])}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-2xl text-[13px] font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                                  >
                                    <Calculator size={15} /> 新增公式行
                                  </button>
                                </div>
                              </div>
                            </div>
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
                                
                                if (reportConfigEdits.categoryOrder && reportConfigEdits.categoryOrder.length > 0) {
                                  visibleCats = [...visibleCats].sort((a: any, b: any) => {
                                    const indexA = reportConfigEdits.categoryOrder.indexOf(a.path);
                                    const indexB = reportConfigEdits.categoryOrder.indexOf(b.path);
                                    if (indexA === -1 && indexB === -1) return 0;
                                    if (indexA === -1) return 1;
                                    if (indexB === -1) return -1;
                                    return indexA - indexB;
                                  });
                                }

                                const evaluateFormula = (formulaStr: string, cMap: Record<number, number>, fMap: Record<string, number>) => {
                                  if (!formulaStr) return 0;
                                  try {
                                    let p = formulaStr.trim().toUpperCase();
                                    p = p.replace(/(\d+)\s*[:~]\s*(\d+)/g, (_, s, e) => {
                                      const start = parseInt(s), end = parseInt(e);
                                      const r = [];
                                      for (let n = Math.min(start, end); n <= Math.max(start, end); n++) r.push(n);
                                      return `(${r.join('+')})`;
                                    });
                                    p = p.replace(/SUM\(([^)]+)\)/g, '($1)');
                                    p = p.replace(/AVG\(([^)]+)\)|AVERAGE\(([^)]+)\)/g, (_, g1, g2) => {
                                      const inner = g1 || g2;
                                      return `((${inner}) / ${inner.split(',').length})`;
                                    });
                                    p = p.replace(/\b([A-Z])\b/g, (match) => {
                                      const v = fMap[match];
                                      return v !== undefined ? v.toString() : match;
                                    });
                                    p = p.replace(/\b(\d+)\b(?!\.)/g, (match) => {
                                      const v = cMap[parseInt(match)];
                                      return v !== undefined ? v.toString() : match;
                                    });
                                    // eslint-disable-next-line no-new-func
                                    const result = new Function(`return ${p}`)();
                                    return typeof result === 'number' && isFinite(result) ? result : null;
                                  } catch (e) { return null; }
                                };

                                const rows: React.ReactNode[] = [];
                                const catInternalMap: Record<number, number> = {};
                                const catSupplierMap: Record<number, number> = {};
                                const formulaInternalMap: Record<string, number> = {};
                                const formulaSupplierMap: Record<string, number> = {};
                                let formulaLabelCounter = 0;

                                visibleCats.forEach((c: any, idx: number) => {
                                  const factor = simulationMode ? (1 + costSimFactor / 100) : 1;
                                  catInternalMap[idx + 1] = c.internal_total * factor;
                                  catSupplierMap[idx + 1] = c.supplier_total * factor;
                                });

                                const allRowsDisplay: any[] = [];
                                visibleCats.forEach((cat: any, i: number) => {
                                  allRowsDisplay.push({ type: 'cat', data: cat, originalIdx: i });
                                  const customsHere = customRows.filter(r => r.afterIndex === i);
                                  customsHere.forEach(cr => {
                                    allRowsDisplay.push({ type: 'custom', data: cr });
                                  });
                                });

                                if (!reportData) return <tr><td colSpan={9} className="text-center py-12 text-slate-400">數據內容載入中...</td></tr>;

                                const totalBaseSupplier = (reportData.summary.direct_supplier || 1) * (simulationMode ? (1 + costSimFactor / 100) : 1);
                                const totalBaseInternal = (reportData.summary.direct_internal || 1) * (simulationMode ? (1 + costSimFactor / 100) : 1);

                                allRowsDisplay.forEach(row => {
                                  if (row.type === 'cat') {
                                    const cat = row.data;
                                    const edit = reportConfigEdits.categories[cat.path] || {};
                                    const currentRemark = edit.remark !== undefined ? edit.remark : cat.remark;
                                    const idx = row.originalIdx;
                                    
                                    const dispInternal = catInternalMap[idx + 1] || 0;
                                    const dispSupplier = catSupplierMap[idx + 1] || 0;

                                    rows.push(
                                      <tr 
                                        key={`cat-${cat.path}`}
                                        className={`hover:bg-slate-50/80 transition-all group ${simulationMode ? 'bg-amber-50/20' : ''}`}
                                      >
                                        <td className="px-6 py-4 text-center text-slate-300 text-lg select-none group-hover:text-blue-400 cursor-grab" draggable onDragStart={() => { setDragCatIndex(idx); setDragCustomId(null); }}>⠿</td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-slate-400 text-center">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                            <span className="text-[14px] font-bold text-slate-800">{cat.name}</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{cat.path}</span>
                                          </div>
                                        </td>
                                        <td className={`px-6 py-4 text-right text-[14px] font-semibold ${simulationMode ? 'text-amber-600' : 'text-slate-700'} transition-colors underline decoration-slate-100/50 underline-offset-4`}>{formatCurrency(dispSupplier)}</td>
                                        <td className="px-6 py-4 text-right">
                                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{((dispSupplier / totalBaseSupplier) * 100).toFixed(1)}%</span>
                                        </td>
                                        <td className={`px-6 py-4 text-right text-[14px] font-semibold ${simulationMode ? 'text-amber-600' : 'text-blue-700'} transition-colors`}>{formatCurrency(dispInternal)}</td>
                                        <td className="px-6 py-4 text-right">
                                          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{((dispInternal / totalBaseInternal) * 100).toFixed(1)}%</span>
                                        </td>
                                        <td className="px-6 py-4">
                                          <input 
                                            type="text" 
                                            value={currentRemark || ''} 
                                            placeholder="輸入備註..." 
                                            onChange={(e) => setReportConfigEdits((prev: any) => ({ ...prev, categories: { ...prev.categories, [cat.path]: { ...(prev.categories?.[cat.path] || {}), remark: e.target.value } } }))} 
                                            className="w-full bg-transparent border border-transparent focus:border-blue-500/30 px-2 py-1 text-[12px] text-slate-500 outline-none transition-all focus:bg-white rounded-lg" 
                                          />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                          <button onClick={() => setReportConfigEdits((prev: any) => ({ ...prev, categories: { ...prev.categories, [cat.path]: { ...prev.categories?.[cat.path], hidden: true } } }))} className="text-slate-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-50" title="隱藏此分類"><Trash2 size={16} /></button>
                                        </td>
                                      </tr>
                                    );
                                  } else {
                                    const cr = row.data;
                                    if (cr.type === 'formula') {
                                      rows.push(
                                        <tr key={`cr-${cr.id}`} className={`${simulationMode ? 'bg-amber-50/40' : 'bg-blue-50/40'} group border-l-4 ${simulationMode ? 'border-amber-500' : 'border-[#007AFF]'} animate-in fade-in slide-in-from-left-2 duration-300`}>
                                          <td className="px-6 py-4 text-center text-blue-200 text-lg select-none group-hover:text-blue-400 cursor-grab" draggable onDragStart={() => { setDragCustomId(cr.id); setDragCatIndex(null); }}>⠿</td>
                                          <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                              <span className={`${simulationMode ? 'bg-amber-500' : 'bg-[#007AFF]'} text-white text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-xl shadow-md transform rotate-3 group-hover:rotate-0 transition-all`}>{row.displayLabel}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                              <input
                                                type="text"
                                                value={cr.label}
                                                onChange={(e) => setCustomRows(prev => prev.map(r => r.id === cr.id ? { ...r, label: e.target.value } : r))}
                                                className="bg-transparent font-bold text-[14px] text-slate-800 outline-none border-b border-transparent hover:border-slate-300 focus:border-[#007AFF] px-0.5 transition-all"
                                              />
                                              <div className={`flex items-center gap-1.5 mt-1 border ${simulationMode ? 'border-amber-100' : 'border-blue-100'} bg-white/50 rounded-md px-2 py-0.5 w-max`}>
                                                <span className={`text-[9px] font-black ${simulationMode ? 'text-amber-500' : 'text-blue-500'} uppercase tracking-tighter`}>公式</span>
                                                <input
                                                  type="text"
                                                  value={cr.formula || ''}
                                                  placeholder="1~3 或 A+B"
                                                  onChange={(e) => setCustomRows(prev => prev.map(r => r.id === cr.id ? { ...r, formula: e.target.value } : r))}
                                                  className={`bg-transparent text-[11px] font-mono ${simulationMode ? 'text-amber-600' : 'text-[#007AFF]'} outline-none w-24`}
                                                />
                                              </div>
                                            </div>
                                          </td>
                                          <td className={`px-6 py-4 text-right text-[14px] font-bold ${simulationMode ? 'text-amber-600' : 'text-slate-700'} transition-colors`}>{row.computedSupplier !== null ? formatCurrency(row.computedSupplier) : <span className="text-rose-500 text-[10px] animate-pulse">ERR</span>}</td>
                                          <td className="px-6 py-4 text-center text-[10px] font-black text-blue-300 uppercase tracking-widest italic opacity-50">{simulationMode ? 'Simulated' : 'Custom'}</td>
                                          <td className={`px-6 py-4 text-[14px] font-bold text-right ${simulationMode ? 'text-amber-600' : 'text-[#007AFF]'} transition-colors`}>{row.computedInternal !== null ? formatCurrency(row.computedInternal) : <span className="text-rose-500 text-[10px] animate-pulse">ERR</span>}</td>
                                          <td className="px-6 py-4"></td>
                                          <td className="px-6 py-4">
                                            <span className={`text-[10px] ${simulationMode ? 'text-amber-400 bg-amber-100/50' : 'text-blue-400 bg-blue-100/50'} font-bold px-2 py-1 rounded-md`}>自定義計算</span>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                            <button onClick={() => setCustomRows(prev => prev.filter(r => r.id !== cr.id))} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-rose-500 rounded-full transition-all">✕</button>
                                          </td>
                                        </tr>
                                      );
                                    } else if (cr.type === 'subtotal') {
                                      rows.push(
                                        <tr key={`cr-${cr.id}`} className="bg-slate-50/50 text-[11px] text-slate-400 italic border-b border-slate-100">
                                          <td className="px-6 py-2 text-center text-slate-200">⠿</td>
                                          <td colSpan={2} className="px-6 py-2">小計分隔線: {cr.label}</td>
                                          <td colSpan={5} className="px-6 py-2"></td>
                                          <td className="px-6 py-2 text-center">
                                            <button onClick={() => setCustomRows(prev => prev.filter(r => r.id !== cr.id))} className="text-rose-400 hover:text-rose-600 font-bold">移除</button>
                                          </td>
                                        </tr>
                                      );
                                    }
                                  }
                                });

                                return rows;
                              })()}

                              {/* Summary Rows */}
                              {reportData && (() => {
                                const factor = simulationMode ? (1 + costSimFactor / 100) : 1;
                                const currentProfitRate = (reportConfigEdits.summary?.profit_rate || 0.18) + (simulationMode ? profitSimFactor / 100 : 0);
                                
                                const simDirectSupplier = (reportData.summary.direct_supplier || 0) * factor;
                                const simDirectInternal = (reportData.summary.direct_internal || 0) * factor;
                                
                                const simIndirectSupplier = simDirectSupplier * currentProfitRate;
                                const simIndirectInternal = simDirectInternal * 0.05;

                                const totalSimSupplier = simDirectSupplier + simIndirectSupplier;
                                const totalSimInternal = simDirectInternal + simIndirectInternal;

                                const totalDeductions = (customRows.reduce((sum, r) => r.type === 'deduction' ? sum + (r.amount || 0) : sum, 0)) * factor;

                                return (
                                  <>
                                    {!reportConfigEdits.summary?.hide_subtotal && (
                                      <tr className={`border-t border-slate-100 font-semibold ${simulationMode ? 'bg-amber-50/50' : 'bg-slate-50'}`}>
                                        <td className="px-6 py-5"></td>
                                        <td colSpan={2} className="px-6 py-5 text-[13px] text-slate-700">小計 (直接成本) {simulationMode && <span className="text-[10px] text-amber-500 font-bold ml-2">SIMULATED</span>}</td>
                                        <td className={`px-6 py-5 text-[13px] font-bold text-right ${simulationMode ? 'text-amber-600' : 'text-slate-800'}`}>{formatCurrency(simDirectSupplier)}</td>
                                        <td className="px-6 py-5 text-right"></td>
                                        <td className={`px-6 py-5 text-[13px] font-bold text-right ${simulationMode ? 'text-amber-600' : 'text-blue-700'}`}>{formatCurrency(simDirectInternal)}</td>
                                        <td className="px-6 py-5 text-right"></td>
                                        <td className="px-6 py-5 text-[11px] text-slate-400 italic font-normal">{simulationMode ? `已加成 ${costSimFactor}%` : '依標單明細匯總'}</td>
                                        <td className="px-6 py-5 text-center">
                                          <button 
                                            onClick={() => setReportConfigEdits((prev: any) => ({ ...prev, summary: { ...prev.summary, hide_subtotal: true } }))} 
                                            className="text-slate-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-50"
                                            title="隱藏此列"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    )}
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
                                    {!reportConfigEdits.summary?.hide_profit_row && (
                                      <tr className="bg-white font-semibold border-t border-slate-100">
                                        <td className="px-6 py-5"></td>
                                        <td colSpan={2} className="px-6 py-5 text-[13px] text-slate-500">利潤及管理費 ({(currentProfitRate * 100).toFixed(1)}%) {simulationMode && profitSimFactor !== 0 && <span className="text-[10px] text-emerald-500 ml-1">({profitSimFactor > 0 ? '+' : ''}{profitSimFactor}%)</span>}</td>
                                        <td className={`px-6 py-5 text-[13px] font-medium text-right ${simulationMode ? 'text-amber-600' : 'text-slate-600'}`}>{formatCurrency(simIndirectSupplier)}</td>
                                        <td className="px-6 py-5 text-right text-[11px] font-semibold text-slate-400">{((simIndirectSupplier / (totalSimSupplier || 1)) * 100).toFixed(2)}%</td>
                                        <td className={`px-6 py-5 text-[13px] font-medium text-right ${simulationMode ? 'text-amber-600' : 'text-blue-600'}`}>{formatCurrency(simIndirectInternal)}</td>
                                        <td className="px-6 py-5 text-right text-[11px] font-semibold text-blue-400">{((simIndirectInternal / (totalSimInternal || 1)) * 100).toFixed(2)}%</td>
                                        <td className="px-6 py-5 text-[11px] text-slate-400 italic font-normal">利潤自動計算</td>
                                        <td className="px-6 py-5 text-center">
                                          <button 
                                            onClick={() => setReportConfigEdits((prev: any) => ({ ...prev, summary: { ...prev.summary, hide_profit_row: true } }))} 
                                            className="text-slate-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-50"
                                            title="隱藏此列"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    )}
                                    <tr className={`border-t-2 border-slate-100 text-slate-900 font-bold ${simulationMode ? 'bg-amber-50' : 'bg-white'}`}>
                                      <td className="px-6 py-6 border-t-2 border-slate-100"></td>
                                      <td colSpan={2} className="px-6 py-6 text-[15px] border-t-2 border-slate-100">合計總覽 (含稅預估) {simulationMode && <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full ml-2">SIMULATED</span>}</td>
                                      <td className={`px-6 py-6 text-xl font-bold text-right border-t-2 border-slate-100 ${simulationMode ? 'text-amber-600' : ''}`}>{formatCurrency(totalSimSupplier - totalDeductions)}</td>
                                      <td className="px-6 py-6 text-right font-bold text-slate-400 uppercase text-[10px] tracking-widest border-t-2 border-slate-100">100.00%</td>
                                      <td className={`px-6 py-6 text-2xl font-bold text-right border-t-2 border-slate-100 ${simulationMode ? 'text-amber-600' : 'text-blue-600'}`}>{formatCurrency(totalSimInternal - totalDeductions)}</td>
                                      <td className="px-6 py-6 text-right font-bold text-blue-400 uppercase text-[10px] tracking-widest border-t-2 border-slate-100">100.00%</td>
                                      <td colSpan={2} className="px-6 py-6 text-[13px] text-slate-400 text-center border-t-2 border-slate-100">預估毛利：<span className={`${simulationMode ? 'text-amber-700' : 'text-slate-700'} font-bold text-lg`}>{formatCurrency((totalSimSupplier - totalDeductions) - (totalSimInternal - totalDeductions))}</span></td>
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
                    </>
                  )}
                </div>
              )}

        {/* Home Tab Content */}
        {activeTab === "home" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Project Info Card */}
            <div className="bg-white/70 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 relative">
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
                            // URL 同步
                            router.push(`/projects/${projectId}?v=${idx}`);
                            if (!isCompareMode) setResult(project.files[idx].data);
                          }}
                          className={`bg-slate-50/50 border border-slate-100 text-slate-700 text-sm rounded-xl px-4 py-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none hover:bg-white transition-all min-w-[280px] appearance-none cursor-pointer ${
                            baseVersionIdx !== project.files.length - 1 ? 'ring-2 ring-amber-500/30' : ''
                          }`}
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

                    <div className="relative group">
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
                      
                      {/* Comparison Help Tooltip */}
                      {isCompareMode && !loading && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[60] text-xs space-y-3 pointer-events-none">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <AlertCircle size={14} className="text-blue-500" />
                            <span className="font-black text-slate-800 uppercase tracking-widest text-[10px]">比對功能說明</span>
                          </div>
                          
                          <div className="space-y-2.5">
                            <div className="flex gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                              <p className="text-slate-600 leading-relaxed">
                                <strong className="text-emerald-600">新增項目：</strong>目標版本新增的項次。點擊後方 <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-400 font-bold">✕</span> 可在存檔時排除。
                              </p>
                            </div>
                            
                            <div className="flex gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                              <p className="text-slate-600 leading-relaxed">
                                <strong className="text-amber-600">內容變更：</strong>數量或單價變動。標註 <span className="font-bold">↑↓</span> 趨勢，點擊 <span className="inline-block"><RotateCcw size={12} className="text-slate-400" /></span> 可單項還原至舊值。
                              </p>
                            </div>
                            
                            <div className="flex gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                              <p className="text-slate-600 leading-relaxed">
                                <strong className="text-rose-600">刪除項目：</strong>僅存在於舊版，預設刪除，可點擊「保留」恢復。
                              </p>
                            </div>
                          </div>
                          <div className="pt-2 text-[9px] text-slate-400 italic text-center border-t border-slate-50">
                            提示：比對完成後，點擊「套用繼承」建立新版本
                          </div>
                        </div>
                      )}
                    </div>
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
                    <div className="w-px h-8 bg-slate-200/60 hidden sm:block"></div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest block mb-1 px-1 flex items-center gap-1.5">
                        <BarChart3 size={12} className="text-slate-400" /> 項目統計
                      </span>
                      <div className="flex items-center gap-2 px-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                            {isCompareMode && diffResult ? diffResult.diff.rows.length : totalRows} 
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">筆總數</span>
                        </div>
                        
                        {!isCompareMode && result?.rows && (
                          <div className="flex items-center gap-3 ml-3 pl-3 border-l border-slate-200/70">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-bold tracking-wider mb-0.5">未分類</span>
                              <span className="text-sm font-bold text-slate-700">
                                {result?.analysis?.systems?.["未分類"]?.count || 0}
                              </span>
                            </div>
                            <button 
                                onClick={() => {
                                  const next = filterType === "ai_suggestions" ? null : "ai_suggestions";
                                  setFilterType(next);
                                  // 重置頁碼並重新抓取
                                  fetchProject(1, false, 50, next);
                                }}
                                className={`flex flex-col hover:bg-slate-50 p-1.5 rounded-xl transition-all border ${filterType === "ai_suggestions" ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400" : "border-transparent"}`}
                              >
                                <span className={`text-[9px] font-bold tracking-wider mb-0.5 ${filterType === "ai_suggestions" ? "text-amber-700" : "text-amber-500"}`}>AI 已分建議</span>
                                <span className={`text-sm font-bold ${filterType === "ai_suggestions" ? "text-amber-800" : "text-amber-600"}`}>
                                  {Object.values(result?.analysis?.systems || {}).reduce((acc: number, sys: any) => acc + (sys.ai_count || 0), 0)}
                                </span>
                              </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                      <div className="flex flex-col items-end gap-2">
                        {filterType === "ai_suggestions" && (
                          <div className="bg-amber-50 text-amber-700 text-[11px] font-bold px-4 py-1.5 rounded-full border border-amber-200 flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                            <Zap size={14} className="fill-amber-500" /> 正在檢視全案 {Object.values(result?.analysis?.systems || {}).reduce((acc: number, sys: any) => acc + (sys.ai_count || 0), 0)} 筆 AI 分類建議
                             <button onClick={() => { setFilterType(null); fetchProject(1, false, 50, null); }} className="ml-2 hover:bg-amber-200 p-1 rounded-full"><X size={12} /></button>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                        <button
                            onClick={handleAIClassify}
                            disabled={isAIClassifying}
                            className={`px-6 py-2.5 rounded-full text-sm font-black transition-all border shadow-lg ${
                            isAIClassifying 
                                ? "bg-amber-50 text-amber-500 border-amber-200 animate-pulse" 
                                : "bg-gradient-to-r from-amber-400 to-amber-500 text-white border-amber-300 hover:shadow-amber-500/20 hover:scale-105 active:scale-95"
                            } flex items-center gap-2`}
                        >
                            {isAIClassifying ? <RotateCcw size={16} className="animate-spin" /> : <Zap size={16} className="fill-white" />}
                            {isAIClassifying ? "AI 分類中..." : "AI 智慧補完未分類"}
                        </button>

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
                        
                        {result?.rows?.some((r: any) => r.is_ai_category) && (
                          <button
                              onClick={() => handleConfirmAI(result.rows.filter((r: any) => r.is_ai_category).map((r: any) => r._original_index !== undefined ? r._original_index : -1))}
                              className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all border bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 flex items-center gap-2`}
                          >
                              <Check size={16} />
                              全部確認 AI 建議
                          </button>
                        )}
                        </div>
                        {aiStatusMessage && (
                            <div className="flex flex-col gap-1.5 w-full max-w-xs mt-1 animate-in slide-in-from-top-2 duration-300">
                                <div className={`text-[11px] font-bold px-3 py-1.5 rounded-full border shadow-sm flex items-center justify-between transition-colors ${
                                    isAIClassifying ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                    aiStatusMessage.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                    <span className={isAIClassifying ? 'animate-pulse' : ''}>{aiStatusMessage}</span>
                                    {isAIClassifying && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-amber-600 block shrink-0">{aiProgress}%</span>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleStopAI(); }}
                                          title="中斷分析"
                                          className="p-1 hover:bg-rose-100 text-rose-500 rounded-full transition-all group"
                                        >
                                          <X size={12} className="group-hover:scale-110" />
                                        </button>
                                      </div>
                                    )}
                                </div>
                                {isAIClassifying && (
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden ring-1 ring-inset ring-slate-200 shadow-inner">
                                        <div 
                                            className="bg-gradient-to-r from-amber-400 to-amber-500 h-1.5 rounded-full transition-all duration-500 ease-out" 
                                            style={{ width: `${aiProgress}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                                onChange={(e)=>setSelectedIndices(e.target.checked ? (result?.rows || []).map((r:any)=>r._original_index) : [])} 
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
                        {isCompareMode && (diffResult?.diff?.removed_rows || []).map((row: any, i: number) => {
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

                        {(isCompareMode ? (diffResult?.diff?.rows || []) : (result?.rows || [])).map((row: any, i: number) => {
                          const rowIdx = row._original_index !== undefined ? row._original_index : i;
                          if (isCompareMode && ignoredItemIndices.includes(rowIdx)) return null;
                          
                          const displayCategory = (row.system_category === "未分類" || row.system_category === "無類別" || !row.system_category) 
                            ? "未分類" 
                            : (row.system_category.split(">")[project.classification_depth - 1]?.trim() || "-");
                          
                          if (showUnclassified && displayCategory !== "未分類" && !row.is_ai_category) return null;

                          return (
                            <ProjectTableRow 
                              key={rowIdx}
                              row={row}
                              index={rowIdx}
                              isCompareMode={isCompareMode}
                              project={project}
                              getCategoryColor={getCategoryColor}
                              formatCurrency={formatCurrency}
                              onEdit={() => {setEditingRowIndex(rowIdx); setModalOpen(true);}}
                              isSelected={selectedIndices.includes(rowIdx)}
                              onToggleSelect={(checked: boolean) => setSelectedIndices(checked ? [...selectedIndices, rowIdx] : selectedIndices.filter(x=>x!==rowIdx))}
                              isReverted={revertedItemIndices.includes(rowIdx)}
                              onRevert={() => setRevertedItemIndices([...revertedItemIndices, rowIdx])}
                              onIgnore={() => setIgnoredItemIndices([...ignoredItemIndices, rowIdx])}
                              displayCategory={displayCategory}
                              onConfirmAI={() => handleConfirmAI([rowIdx])}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                    
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

                  <div className="flex items-center gap-3">
                    <button 
                       onClick={() => setTemplateModalOpen(true)}
                       className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[13px] font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                       <SettingsIcon size={16} className="text-slate-400" /> Mail模板設定
                    </button>
                    <button
                      onClick={handleReclassify}
                      disabled={isReclassifying}
                      title="僅重新分析『自動分類』的項目，您手動修改過的分類將會被保留。"
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-50 group"
                    >
                      {isReclassifying ? <RotateCcw size={16} className="animate-spin text-blue-500" /> : <RotateCcw size={16} className="text-blue-500 group-hover:rotate-180 transition-transform duration-500" />}
                      {isReclassifying ? "分析中..." : "重新分析分類"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const analysisSystems = result?.analysis?.systems || {};
                    const groups: Record<string, { count: number, total: number, items: any[] }> = {};
                    
                    Object.entries(analysisSystems).forEach(([fullPath, info]: [string, any]) => {
                      const parts = fullPath.split(" > ") || ["未分類"];
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

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {Object.keys(inquiryEdits).length > 0 && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={saveInquiryChanges}
                              disabled={isSavingInquiry}
                              className={`px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg transition-all flex items-center gap-2 animate-in zoom-in ${
                                baseVersionIdx === project.files.length - 1 
                                  ? "bg-[#007AFF] text-white shadow-blue-500/20 hover:bg-[#0071E3]" 
                                  : "bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600"
                              }`}
                            >
                              {isSavingInquiry ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
                              {isSavingInquiry ? "儲存中..." : `儲存 ${Object.keys(inquiryEdits).length} 筆變更 ${baseVersionIdx === project.files.length - 1 ? "" : `至 V${baseVersionIdx + 1}`}`}
                            </button>
                            
                            {baseVersionIdx !== project.files.length - 1 && (
                              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 flex items-center gap-1.5 animate-pulse">
                                <AlertCircle size={12} /> 正在編輯歷史版本
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100/50">
                      <tr>
                        <th className="px-6 py-4 w-10 text-center">
                          <input 
                            type="checkbox" 
                            checked={categoryItems.length > 0 && selectedInquiryIndices.length === categoryItems.length}
                            onChange={(e) => {
                               if (e.target.checked) {
                                  const allIndices = categoryItems.map((r: any, idx: number) => r._original_index !== undefined ? r._original_index : idx);
                                  setSelectedInquiryIndices(allIndices);
                               } else {
                                  setSelectedInquiryIndices([]);
                               }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                        </th>
                        <th className="px-6 py-4 w-14">項次</th>
                        <th className="px-6 py-4 min-w-[200px]">項目名稱 (Description)</th>
                        <th className="px-6 py-4 min-w-[150px]">備註</th>
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
                              <td className="px-6 py-4"><div className="h-3 bg-slate-100 rounded-full w-3/4"></div></td>
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
                                <tr 
                                  key={i} 
                                  onClick={(e) => {
                                     // 防止點擊 Checkbox 時觸發 Row Click (會開啟側邊欄)
                                     if ((e.target as HTMLElement).tagName === 'INPUT') return;
                                     setSelectedInquiryRow(row);
                                  }}
                                  className={`hover:bg-blue-50/30 transition-all border-b border-slate-50 cursor-pointer relative group ${selectedInquiryRow?.description === row.description && selectedInquiryRow?.item_no === row.item_no ? 'bg-blue-50/50 ring-1 ring-blue-500/20 z-10' : ''} ${currentEdit ? 'bg-amber-50/20' : ''}`}
                                >
                                  <td className="px-6 py-4 text-center w-10">
                                     <input 
                                       type="checkbox" 
                                       checked={selectedInquiryIndices.includes(row._original_index !== undefined ? row._original_index : i)}
                                       onChange={(e) => {
                                          const idx = row._original_index !== undefined ? row._original_index : i;
                                          if (e.target.checked) {
                                             setSelectedInquiryIndices([...selectedInquiryIndices, idx]);
                                          } else {
                                             setSelectedInquiryIndices(selectedInquiryIndices.filter(x => x !== idx));
                                          }
                                       }}
                                       className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                     />
                                  </td>
                                  <td className="px-6 py-4 font-mono text-slate-400 w-14 whitespace-nowrap">{row.item_no || "-"}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800 min-w-[200px] whitespace-normal break-words leading-relaxed">
                                    <div className="flex flex-col py-0.5">
                                      {row.parent_section && (
                                        <span className="text-[10px] text-slate-500 font-medium tracking-wider mb-1 bg-slate-50 w-fit px-1.5 py-0.5 rounded-sm border border-slate-100 truncate max-w-[280px]" title={row.parent_section}>
                                          {row.parent_section}
                                        </span>
                                      )}
                                      <span className="leading-tight">{row.description}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-[12px] text-slate-500 min-w-[150px] whitespace-normal italic">{row.remark || row.note || row.specification || "-"}</td>
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
                                  <td className="px-6 py-4 text-center w-24 bg-blue-50/20">
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
                              <td colSpan={9} className="py-6 text-center bg-slate-50/30">
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
                          <td colSpan={9} className="py-20 text-center text-slate-400 italic">尚未找到相關項目資料。</td>
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
                    <SettingsIcon size={18} /> Mail模板設定
                  </button>
                  <button 
                    onClick={() => handleInquiryExport()}
                    className="px-10 py-4 bg-slate-900 text-white rounded-full font-semibold shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet size={20} /> 產出詢價單
                  </button>
                </div>

                {/* 智慧詢價側邊助理 (Supplier Sidebar Drawer) */}
                {selectedInquiryRow && (
                  <div className="fixed inset-y-0 right-0 w-[400px] bg-white/95 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] border-l border-slate-100 z-[60] flex flex-col animate-in slide-in-from-right duration-500">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50">
                       <div>
                         <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                           <Zap size={20} className="text-amber-500 fill-amber-500" /> 智慧詢價助理
                         </h3>
                         <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">選中項目：{selectedInquiryRow.item_no || "無編號"}</p>
                       </div>
                       <button 
                        onClick={() => setSelectedInquiryRow(null)}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                       >
                         <X size={20} />
                       </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                       {/* 選中項目摘要 */}
                       <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl">
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-2">Item Description</span>
                          <p className="text-sm font-bold leading-relaxed">{selectedInquiryRow.description}</p>
                          {selectedInquiryRow.remark && (
                            <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2">
                               <Tag size={12} className="text-blue-400 mt-0.5" />
                               <span className="text-xs text-white/60 italic">{selectedInquiryRow.remark}</span>
                            </div>
                          )}
                       </div>

                       {/* 媒合建議列表 */}
                       <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            建議供應商 (按相關性排序)
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px]">{matchedVendors.length} Found</span>
                          </h4>

                          {isMatchingVendors ? (
                            <div className="space-y-4 py-4">
                               {[...Array(3)].map((_, i) => (
                                 <div key={i} className="h-24 bg-slate-50 rounded-3xl animate-pulse"></div>
                               ))}
                            </div>
                          ) : matchedVendors.length > 0 ? (
                            <div className="space-y-3">
                               {matchedVendors.map((vendor, vidx) => (
                                 <div 
                                    key={vendor.id} 
                                    onClick={() => {
                                      if (selectedVendorForExport?.id === vendor.id) setSelectedVendorForExport(null);
                                      else setSelectedVendorForExport(vendor);
                                    }}
                                    className={`group p-5 rounded-3xl border-2 transition-all animate-in slide-in-from-bottom-2 cursor-pointer ${
                                      selectedVendorForExport?.id === vendor.id 
                                        ? 'bg-blue-50/50 border-blue-500 shadow-lg shadow-blue-500/10' 
                                        : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'
                                    }`}
                                    style={{ animationDelay: `${vidx * 50}ms` }}
                                 >
                                    <div className="flex justify-between items-start mb-4">
                                       <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${
                                            selectedVendorForExport?.id === vendor.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                                          }`}>
                                             {vendor.name[0]}
                                          </div>
                                          <div>
                                             <div className="font-bold text-slate-800 text-sm">{vendor.name}</div>
                                             <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${vendor.match_score > 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                  MATCH {vendor.match_score}%
                                                </span>
                                             </div>
                                          </div>
                                       </div>
                                       <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                          <div className="relative group">
                                             <button 
                                               onClick={() => sendInquiryEmail(vendor)}
                                               className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                             >
                                                <Mail size={16} />
                                             </button>
                                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                                                生成詢價郵件草稿
                                             </div>
                                          </div>
                                          <div className="relative group">
                                             <button 
                                               onClick={() => handleInquiryExport(vendor.name, vendor.phone, vendor.fax)}
                                               className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                             >
                                                <FileSpreadsheet size={16} />
                                             </button>
                                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                                                匯出此廠商專用 Excel
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-4 py-3 border-t border-slate-50 mt-2">
                                       {vendor.phone && (
                                         <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                            <Phone size={10} /> {vendor.phone}
                                         </div>
                                       )}
                                       {vendor.contact && (
                                         <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium ml-auto">
                                            <User size={10} /> {vendor.contact}
                                         </div>
                                       )}
                                    </div>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                               <Search size={32} className="text-slate-200 mx-auto mb-3" />
                               <p className="text-slate-400 text-xs font-medium">尚未找到匹配標籤的廠商</p>
                               <button 
                                onClick={() => router.push("/vendors")}
                                className="text-blue-600 text-[11px] font-bold mt-2 hover:underline"
                               >前往廠商管理新增標籤</button>
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-3">
                       {selectedInquiryIndices.length > 0 ? (
                         <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-600/20 mb-4 flex items-center gap-2">
                            <Check size={14} className="text-blue-600" />
                            <span className="text-[10px] font-bold text-blue-700">已選取 {selectedInquiryIndices.length} 個項目</span>
                         </div>
                       ) : (
                         <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mb-4 flex items-center gap-2">
                            <AlertCircle size={14} className="text-amber-500" />
                            <span className="text-[10px] font-medium text-amber-700">請在左側勾選項目以啟用專屬詢價單</span>
                         </div>
                       )}
                       <button 
                         onClick={() => {
                            if (selectedInquiryIndices.length === 0) {
                               alert("請先勾選要詢價的項目！");
                               return;
                            }
                             const firstVendor = matchedVendors[0];
                             if (firstVendor) {
                               sendInquiryEmail(firstVendor);
                             } else {
                               handleInquiryExport();
                             }
                         }}
                         disabled={selectedInquiryIndices.length === 0}
                         className={`w-full py-4 rounded-2xl font-black shadow-xl transition-all text-sm flex items-center justify-center gap-2 ${
                            selectedInquiryIndices.length > 0 
                               ? "bg-[#007AFF] text-white hover:scale-[1.02] active:scale-95 cursor-pointer shadow-blue-500/25" 
                               : "bg-slate-100 text-slate-300 cursor-not-allowed"
                         }`}
                       >
                          <Zap size={18} />
                          一鍵生成詢價郵件 + Excel
                       </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cost Analysis Tab Content */}
        {activeTab === "analysis" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Dashboard */}
            {(() => {
              const factor = 1 + costSimFactor / 100;
              const currentProfitRate = (reportConfigEdits.summary?.profit_rate || 0.18) + (profitSimFactor / 100);
              
              const baseDirectSupplier = reportData?.summary.direct_supplier || 0;
              const baseDirectInternal = reportData?.summary.direct_internal || 0;
              
              const simDirectSupplier = baseDirectSupplier * factor;
              const simDirectInternal = baseDirectInternal * factor;
              
              const simIndirectSupplier = simDirectSupplier * currentProfitRate;
              const simIndirectInternal = simDirectInternal * 0.05;

              const revenue = simDirectSupplier + simIndirectSupplier;
              const cost = simDirectInternal + simIndirectInternal;
              const profit = revenue - cost;
              const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <TrendingUp size={80} />
                      </div>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileSpreadsheet size={14} className="text-blue-500" /> 專案預估總收入 (含稅)
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-800 tracking-tighter">{formatCurrency(revenue * 1.05)}</span>
                        <span className="text-sm font-bold text-slate-400">TWD</span>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg font-bold">基礎：{formatCurrency((baseDirectSupplier * (1 + (reportConfigEdits.summary?.profit_rate || 0.18))) * 1.05)}</span>
                        {profitSimFactor !== 0 && (
                          <span className={`text-[10px] font-bold ${profitSimFactor > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {profitSimFactor > 0 ? '+' : ''}{profitSimFactor}% Adjusted
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Calculator size={80} />
                      </div>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" /> 專案預估運營成本
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-800 tracking-tighter">{formatCurrency(cost)}</span>
                        <span className="text-sm font-bold text-slate-400">TWD</span>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                         <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg font-bold">基礎：{formatCurrency(baseDirectInternal + (baseDirectInternal * 0.05))}</span>
                         {costSimFactor !== 0 && (
                          <span className={`text-[10px] font-bold ${costSimFactor > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {costSimFactor > 0 ? '+' : ''}{costSimFactor}% Cost Change
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`bg-gradient-to-br ${margin >= 20 ? 'from-emerald-600 to-teal-700 shadow-emerald-500/20' : 'from-blue-600 to-indigo-700 shadow-blue-500/20'} rounded-[2rem] p-8 shadow-2xl flex flex-col gap-2 relative overflow-hidden text-white`}>
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <PieChart size={80} />
                      </div>
                      <span className="text-xs font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} className="text-white/80" /> 預估專案毛利率
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tighter">{margin.toFixed(1)}<small className="text-lg ml-1">%</small></span>
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                         <div className="flex flex-col">
                           <span className="text-[10px] text-white/50 font-bold uppercase">預估毛利</span>
                           <span className="text-sm font-black">{formatCurrency(profit)}</span>
                         </div>
                         <div className="w-px h-6 bg-white/20"></div>
                         <div className="flex flex-col">
                           <span className="text-[10px] text-white/50 font-bold uppercase">淨利預期</span>
                           <span className="text-sm font-black">{formatCurrency(profit * 0.8)}</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulation Controls */}
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                           <Zap size={22} className="text-amber-500 fill-amber-500" /> "What-if" 成本與利潤模擬
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">調整下方參數以模擬不同市場情境下的損益變動</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setCostSimFactor(0); setProfitSimFactor(0); }}
                          className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                          <RotateCcw size={16} /> 重置所有模擬
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-4">
                       <div className="space-y-6">
                          <div className="flex justify-between items-center bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                             <div>
                               <span className="text-xs font-black text-amber-700 uppercase tracking-widest block mb-1">成本調整因素 (Cost Factor)</span>
                               <p className="text-[11px] text-amber-600/70">調整原物料與發包成本的漲幅/降幅</p>
                             </div>
                             <span className={`text-2xl font-black ${costSimFactor > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                               {costSimFactor > 0 ? '+' : ''}{costSimFactor}%
                             </span>
                          </div>
                          <div className="px-2">
                            <input 
                              type="range" min="-20" max="20" step="1" 
                              value={costSimFactor}
                              onChange={(e) => setCostSimFactor(parseInt(e.target.value))}
                              className="w-full h-2.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="flex justify-between mt-2 px-1 text-[10px] font-black text-slate-300 uppercase">
                              <span>成本下降 -20%</span>
                              <span>基準 0%</span>
                              <span>成本上升 +20%</span>
                            </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                             <div>
                               <span className="text-xs font-black text-blue-700 uppercase tracking-widest block mb-1">毛利期望值 (Profit Expectations)</span>
                               <p className="text-[11px] text-blue-600/70">調整對業主的報價利潤加成比率</p>
                             </div>
                             <span className="text-2xl font-black text-blue-600">
                               {profitSimFactor > 0 ? '+' : ''}{profitSimFactor}%
                             </span>
                          </div>
                          <div className="px-2">
                            <input 
                              type="range" min="-20" max="20" step="1" 
                              value={profitSimFactor}
                              onChange={(e) => setProfitSimFactor(parseInt(e.target.value))}
                              className="w-full h-2.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between mt-2 px-1 text-[10px] font-black text-slate-300 uppercase">
                              <span>毛利調降 -20%</span>
                              <span>基準 0%</span>
                              <span>毛利調增 +20%</span>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Summary Comparison Table */}
                  <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100">
                     <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                           <Layers size={18} className="text-blue-500" /> 各分類模擬數據摘要
                        </h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">LV.1 Summary</span>
                     </div>
                     <table className="w-full">
                        <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                           <tr>
                              <th className="px-8 py-4 text-left">分類名稱</th>
                              <th className="px-8 py-4 text-right">原始內部成本</th>
                              <th className="px-8 py-4 text-right">模擬後內部成本</th>
                              <th className="px-8 py-4 text-right">變動差額</th>
                              <th className="px-8 py-4 text-right">佔比比重</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {reportData?.categories.map((cat: any) => (
                             <tr key={cat.path} className="hover:bg-slate-50/50 transition-colors">
                               <td className="px-8 py-5 font-bold text-slate-700">{cat.name}</td>
                               <td className="px-8 py-5 text-right font-mono text-slate-400">{formatCurrency(cat.internal_total)}</td>
                               <td className={`px-8 py-5 text-right font-black font-mono transition-colors ${costSimFactor !== 0 ? 'text-amber-600 bg-amber-50/20' : 'text-slate-800'}`}>
                                 {formatCurrency(cat.internal_total * factor)}
                               </td>
                               <td className={`px-8 py-5 text-right font-bold font-mono ${costSimFactor > 0 ? 'text-rose-500' : costSimFactor < 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                                 {costSimFactor !== 0 ? (costSimFactor > 0 ? '+' : '') + formatCurrency(cat.internal_total * (factor - 1)) : '-'}
                               </td>
                               <td className="px-8 py-5 text-right font-bold text-slate-400 text-xs">
                                 {((cat.internal_total / (baseDirectInternal || 1)) * 100).toFixed(1)}%
                               </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <CategorySelectorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleManualSave}
          categoriesTree={categoriesTree}
          rowDescription={editingRowIndex !== null ? (isCompareMode ? diffResult?.diff.rows[editingRowIndex]?.description : (result?.rows.find((r: any) => r._original_index === editingRowIndex)?.description || "項目")) : `已選取 ${selectedIndices.length} 個項目`}
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
    </div>
  );
}
