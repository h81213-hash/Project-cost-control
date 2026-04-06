/**
 * 安全的 API 呼叫工具，避免開發模式下的 Failed to fetch 遮罩，並提供 Timeout 機制。
 */

export interface SafeFetchResponse<T> {
  data: T | null;
  error: string | null;
  ok: boolean;
  status?: number;
}

export async function safeFetch<T = any>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 60000, // 增加至 60 秒以對應 Render 冷啟動
  retryCount: number = 0
): Promise<SafeFetchResponse<T>> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(id);

    if (!response.ok) {
      // 嘗試讀取錯誤訊息
      let errMsg = `HTTP Error: ${response.status}`;
      let errData = null;
      try {
        errData = await response.json();
        errMsg = errData.detail || errData.message || errData.error || errMsg;
      } catch (e) {
        // Ignore parsing error
      }
      return { data: errData, error: errMsg, ok: false, status: response.status };
    }

    const data = await response.json();
    return { data, error: null, ok: true, status: response.status };
  } catch (err: any) {
    clearTimeout(id);
    
    let errMsg = "連線失敗";
    const isTimeout = err.name === "AbortError";
    
    if (isTimeout) {
      errMsg = "連線逾時 (Timeout)";
      // 如果是逾時且尚未重試過，則自動重試一次
      if (retryCount < 1) {
        console.warn(`[SafeFetch] ${url} 逾時，正在嘗試自動重試...`);
        return safeFetch(url, options, timeoutMs, retryCount + 1);
      }
    } else if (err.name === "TypeError" && err.message === "Failed to fetch") {
      errMsg = "無法連線至後端伺服器 (Failed to fetch)";
    } else {
      errMsg = err.message || "發生未知錯誤";
    }

    console.warn(`[SafeFetch] ${url} 失敗:`, errMsg);
    
    return { 
      data: null, 
      error: errMsg, 
      ok: false 
    };
  }
}

