"use client";

import { useState } from "react";

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 控制是否隱藏被勾選的行
  const [hideIgnored, setHideIgnored] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8002/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.status === "success") {
        setResult(data.data);
      } else {
        setError(data.message || "上傳失敗");
      }
    } catch (err) {
      setError("連線後端失敗，請確保後端已運行於 8002 埠");
    } finally {
      setLoading(false);
    }
  };

  const toggleHideRow = (index: number) => {
    const newRows = [...result.rows];
    newRows[index].should_hide = !newRows[index].should_hide;
    setResult({ ...result, rows: newRows });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">機電專案成本控制器 - 標單預覽</h1>
            <p className="text-slate-500">第一階段：標單數位化與智慧讀取 (含垃圾數據過濾)</p>
          </div>
          <a href="/" className="text-sm text-blue-600 hover:underline">返回首頁</a>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "處理中..." : "開始解析"}
            </button>
          </div>
          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
        </div>

        {result && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6">
                    <span className="text-sm font-medium text-slate-700">共 {result.rows.length} 筆原始項目</span>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
                        <span className="text-xs text-slate-500">系統標記無效行</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setHideIgnored(!hideIgnored)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            hideIgnored 
                            ? "bg-amber-600 text-white" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        {hideIgnored ? "顯示已隱藏項目" : "執行隱藏標記項目"}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 w-10 text-center">隱藏</th>
                      {Object.values(result.mapping).map((header: any, index) => (
                        <th key={index} className="px-6 py-3 font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.map((row: any, rowIndex: number) => {
                      if (hideIgnored && row.should_hide) return null;
                      
                      return (
                        <tr 
                          key={rowIndex} 
                          className={`transition-colors ${
                            row.should_hide 
                                ? "bg-amber-50 border-l-4 border-l-amber-400" 
                                : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-4 text-center">
                            <input 
                                type="checkbox" 
                                checked={!!row.should_hide}
                                onChange={() => toggleHideRow(rowIndex)}
                                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                            />
                          </td>
                          {Object.keys(result.mapping).map((key, colIndex) => (
                            <td key={colIndex} className={`px-6 py-4 ${row.should_hide ? "text-slate-500" : "text-slate-600"}`}>
                              {row[key]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
