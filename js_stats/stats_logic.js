/**
 * ランキング用のHTMLを生成する
 * @param {string} rankedHtml - content.jsから送られてきたHTML
 * @returns {string} 加工済みHTML
 */
export function processRankedList(rankedHtml) {
  if (!rankedHtml) return "";
  // 必要があればここでランキングデータのソートや加工ロジックを追加可能
  return rankedHtml;
}

/**
 * 平均値などの統計数値を整理する
 * @param {Object} data - 生データ
 * @returns {Object} 整理済みデータ
 */
export function prepareStats(data) {
  return {
    views: data.totalViews || "0",
    loves: data.totalLoves || "0",
    favs: data.totalFavs || "0",
    remixes: data.totalRemixes || "0",
    avgViews: data.avgViews ? `平均: ${data.avgViews}` : "平均: -",
    avgLoves: data.avgLoves ? `平均: ${data.avgLoves}` : "平均: -",
    avgFavs: data.avgFavs ? `平均: ${data.avgFavs}` : "平均: -",
    avgRemixes: data.avgRemixes ? `平均: ${data.avgRemixes}` : "平均: -"
  };
}