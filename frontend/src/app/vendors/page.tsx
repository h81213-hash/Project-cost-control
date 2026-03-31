"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../constants";
import { safeFetch } from "../utils/api_utils";
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Users, 
  Phone, 
  Mail, 
  Tag, 
  Trash2, 
  Pencil,
  X,
  User,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
  fax: string;
  email: string;
  tags: string[];
}

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formFax, setFormFax] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTags, setFormTags] = useState("");

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    const { data, error, ok } = await safeFetch(`${API_BASE_URL}/vendors`);
    if (ok) {
      setVendors(data);
    } else {
      setError(error || "無法載入供應商資料");
    }
    setLoading(false);
  };

  const handleOpenModal = (vendor: Vendor | null = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormName(vendor.name);
      setFormContact(vendor.contact);
      setFormPhone(vendor.phone);
      setFormFax(vendor.fax || "");
      setFormEmail(vendor.email);
      setFormTags(vendor.tags.join(", "));
    } else {
      setEditingVendor(null);
      setFormName("");
      setFormContact("");
      setFormPhone("");
      setFormFax("");
      setFormEmail("");
      setFormTags("");
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    
    const vendorData = {
      name: formName,
      contact: formContact,
      phone: formPhone,
      fax: formFax,
      email: formEmail,
      tags: formTags.split(",").map(t => t.trim()).filter(t => t !== "")
    };

    const method = editingVendor ? "PUT" : "POST";
    const url = editingVendor ? `${API_BASE_URL}/vendors/${editingVendor.id}` : `${API_BASE_URL}/vendors`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorData),
      });
      if (res.ok) {
        setShowModal(false);
        fetchVendors();
      }
    } catch (err) {
      console.error("儲存失敗", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這間供應商嗎？")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${id}`, { method: "DELETE" });
      if (res.ok) fetchVendors();
    } catch (err) {
      console.error("刪除失敗", err);
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 md:p-12 lg:p-16">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.push("/projects")}
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
            >
              <ArrowLeft size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>
            <div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                供應商管理
                <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{vendors.length} Vendors</span>
              </h1>
              <p className="text-slate-400 font-medium ml-1 mt-1">管理配合廠商與對應資材品牌標籤</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="搜尋廠商、標籤或品牌..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 bg-white border border-slate-200 rounded-full px-12 py-3.5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm font-medium"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="bg-[#007AFF] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#0071E3] transition-all shadow-lg flex items-center gap-2 active:scale-95"
            >
              <Plus size={20} /> 新增廠商
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-center">
             <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
             <p className="text-rose-600 font-bold">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVendors.map(vendor => (
              <div key={vendor.id} className="group bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                     <Users size={28} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(vendor)} className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-all"><Pencil size={18} /></button>
                    <button onClick={() => handleDelete(vendor.id)} className="p-2.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-6 truncate">{vendor.name}</h3>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center"><User size={14} /></div>
                    <span className="text-sm font-semibold">{vendor.contact || "未填寫"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center"><Phone size={14} /></div>
                    <span className="text-sm font-semibold">{vendor.phone || "未填電話"} <span className="text-[10px] text-slate-300 ml-2 font-normal">F: {vendor.fax || "-"}</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center"><Mail size={14} /></div>
                    <span className="text-sm font-semibold truncate">{vendor.email || "未填寫"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {vendor.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                  {vendor.tags.length === 0 && <span className="text-[10px] text-slate-300 italic">尚未加上關鍵字標籤</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
             <div className="bg-white rounded-[40px] w-full max-w-xl p-10 shadow-2xl relative animate-in zoom-in-95 duration-500">
                <button 
                  onClick={() => setShowModal(false)}
                  className="absolute top-8 right-8 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-10">
                   <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                      {editingVendor ? <Pencil size={24} /> : <Plus size={24} />}
                   </div>
                   <div>
                     <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingVendor ? "編輯供應商" : "新增供應商"}</h2>
                     <p className="text-slate-400 font-medium">請填寫基本資訊與對應標籤</p>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">廠商名稱 <small className="text-rose-500">*</small></label>
                      <input 
                        type="text" 
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="例：大甲建材實業有限公司"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm font-bold"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">聯絡窗口</label>
                        <input 
                          type="text" 
                          value={formContact}
                          onChange={(e) => setFormContact(e.target.value)}
                          placeholder="姓名"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">聯絡電話</label>
                        <input 
                          type="text" 
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="電話或手機"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">傳真號碼</label>
                        <input 
                          type="text" 
                          value={formFax}
                          onChange={(e) => setFormFax(e.target.value)}
                          placeholder="Fax (例：02-xxxx-xxxx)"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 text-slate-300">保留位</label>
                         <div className="w-full h-[58px] bg-slate-50/50 rounded-2xl border border-dashed border-slate-100"></div>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">電子郵件 / 分送對象</label>
                      <input 
                        type="email" 
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="example@company.com"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm font-bold"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-baseline">
                        智慧標籤 (以逗號分隔)
                        <span className="text-[10px] text-blue-500 lowercase normal-case tracking-normal">可用品牌、品項分類標籤</span>
                      </label>
                      <textarea 
                        rows={3}
                        value={formTags}
                        onChange={(e) => setFormTags(e.target.value)}
                        placeholder="南亞, 大洋, PVC管, 給排水..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all shadow-sm font-bold resize-none"
                      />
                   </div>
                </div>

                <div className="mt-12 flex gap-4">
                   <button 
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-8 py-4 rounded-full font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                   >取消</button>
                   <button 
                    onClick={handleSave}
                    className="flex-[2] bg-[#007AFF] text-white px-8 py-4 rounded-full font-black shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-lg"
                   >確認儲存</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
