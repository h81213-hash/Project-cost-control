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
  timeoutMs: number = 25000
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
      try {
        const errJson = await response.json();
        errMsg = errJson.message || errMsg;
      } catch (e) {
        // Ignore parsing error
      }
      return { data: null, error: errMsg, ok: false, status: response.status };
    }

    const data = await response.json();
    return { data, error: null, ok: true, status: response.status };
  } catch (err: any) {
    clearTimeout(id);
    
    let errMsg = "連線失敗";
    if (err.name === "AbortError") {
      errMsg = "連線逾時 (Timeout)";
    } else if (err instanceof TypeError && err.message === "Failed to fetch") {
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
