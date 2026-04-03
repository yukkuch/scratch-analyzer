// 桁揃え
export const pad = (n) => n.toString().padStart(2, '0');

// 日付整形（日本語・英語スイッチ対応）
export function formatDateTime(dateStr, isJP) {
  if (!dateStr) return "-";
  const d = new Date(dateStr.replace(/\//g, '-'));
  
  const p = (n) => n.toString().padStart(2, '0');

  if (isJP) {
    return `${d.getFullYear()}年${p(d.getMonth()+1)}月${p(d.getDate())}日 ${p(d.getHours())}時${p(d.getMinutes())}分${p(d.getSeconds())}秒`;
  } else {
    return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
}