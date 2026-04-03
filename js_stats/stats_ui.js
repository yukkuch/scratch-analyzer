import { formatDateTime } from '../js_common/utils.js';

/**
 * 統計タブとプロフィール欄の表示をすべて更新する
 */
export function updateStatsUI(data, isJP, countryMap) {
  const updateText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text || "-";
  };

  // プロフィール更新
  updateText('u-name', data.user);
  const avatar = document.getElementById('u-avatar');
  if (avatar && data.avatarUrl) {
    avatar.src = data.avatarUrl;
    avatar.style.display = "block";
  }

  // 国名と参加日の変換
  if (isJP) {
    const jpCountry = (countryMap && countryMap[data.country]) ? countryMap[data.country] : data.country;
    updateText('u-country', jpCountry);
  } else {
    updateText('u-country', data.country);
  }
  updateText('u-joined', formatDateTime(data.joined, isJP));

  // 統計数値の更新
  updateText('tv', data.totalViews);
  updateText('tl', data.totalLoves);
  updateText('tf', data.totalFavs);
  updateText('tr', data.totalRemixes);
  updateText('av', data.avgViews ? `平均: ${data.avgViews}` : "平均: -");
  updateText('al', data.avgLoves ? `平均: ${data.avgLoves}` : "平均: -");
  updateText('af', data.avgFavs ? `平均: ${data.avgFavs}` : "平均: -");
  updateText('ar', data.avgRemixes ? `平均: ${data.avgRemixes}` : "平均: -");

  // ランキング表示
  const rankList = document.getElementById('rank-list');
  if (rankList && data.rankedHtml) {
    rankList.innerHTML = data.rankedHtml;
  }
}