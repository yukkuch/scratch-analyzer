import { fetchUserInfo } from '/js_common/api.js';
import { formatDateTime } from '/js_common/utils.js';

export function renderUserListUI(allUsers, searchText, isJP, countryMap, openUsername = null) {
  const fContainer = document.getElementById('following-list');
  const rContainer = document.getElementById('followers-list');
  if (!fContainer || !rContainer) return;

  const query = searchText.toLowerCase();

  // 1. 【初回のみ】リストの枠組みを作成
  if (fContainer.children.length === 0 && allUsers.length > 0) {
    const createUserHtml = (u) => `
      <div class="user-item" data-username="${u.username}">
        <div class="user-item-main">
          <img src="https://uploads.scratch.mit.edu/users/avatars/${u.id}.png" class="user-item-avatar">
          <span class="user-item-name">${u.username}</span>
        </div>
        <div class="user-item-detail"></div>
      </div>`;

    const following = allUsers.filter(u => u.type === 'following');
    const followers = allUsers.filter(u => u.type === 'followers');

    fContainer.innerHTML = following.length ? following.map(createUserHtml).join('') : 'なし';
    rContainer.innerHTML = followers.length ? followers.map(createUserHtml).join('') : 'なし';
    
    setupAccordionEvents(isJP, countryMap);
  }

  // 2. 【毎回実行】全ユーザーの状態をチェック
  document.querySelectorAll('.user-item').forEach(item => {
    const username = item.dataset.username;
    
    const isVisible = username.toLowerCase().includes(query);
    item.style.display = isVisible ? 'block' : 'none';
    
    if (username === openUsername || item.classList.contains('open')) {
      if (username === openUsername) {
        item.classList.add('open');
      }
      refreshDetailText(item, isJP, countryMap);
    }
  });
}

/**
 * 文字だけを書き換える
 */
async function refreshDetailText(parent, isJP, countryMap) {
  const det = parent.querySelector('.user-item-detail');
  const username = parent.dataset.username;
  
  if (det.innerHTML === "") {
    det.innerText = isJP ? "読み込み中..." : "Loading...";
  }

  const data = await fetchUserInfo(username);
  if (data) {
    const countryStr = (isJP && countryMap && countryMap[data.profile.country]) 
                       ? countryMap[data.profile.country] 
                       : data.profile.country;
    const dateStr = formatDateTime(data.history.joined, isJP);

    // ★ エラー箇所を修正：labelCountry などの変数を使わず、直接ラベルを書き込む
    det.innerHTML = `
      <div class="detail-row">📍 国: ${countryStr}</div>
      <div class="detail-row">📅 参加日: ${dateStr}</div>
    `;
  }
}

function setupAccordionEvents(isJP, countryMap) {
  document.querySelectorAll('.user-item-main').forEach(el => {
    el.onclick = async (event) => {
      const parent = el.parentElement;
      
      if (event && event.detailOnly) {
        parent.classList.add('open');
      } else {
        parent.classList.toggle('open');
      }

      if (parent.classList.contains('open')) {
        refreshDetailText(parent, isJP, countryMap);
      }
    };
  });
}