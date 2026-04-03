let allUsers = [];
let rawData = null; 
let isJP = false;

function requestData() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;
    chrome.tabs.sendMessage(tabId, { action: "get" }, (response) => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] });
      }
    });
  });
}
requestData();

chrome.runtime.onMessage.addListener((m) => {
  if (m.action === "update") {
    rawData = m;
    allUsers = m.userList || [];
    formatDisplay();
  }
});

function formatDisplay() {
  if (!rawData) return;
  const updateText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text || "-";
  };

  const pad = (n) => n.toString().padStart(2, '0');

  if (rawData.joined) {
    const d = new Date(rawData.joined.replace(/\//g, '-'));
    if (isJP) {
      const jpName = (typeof countryMap !== 'undefined' && countryMap[rawData.country]) ? countryMap[rawData.country] : rawData.country;
      updateText('u-country', jpName);
      // ★ 日本語モード：時分秒
      updateText('u-joined', `${d.getFullYear()}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 ${pad(d.getHours())}時${pad(d.getMinutes())}分${pad(d.getSeconds())}秒`);
    } else {
      updateText('u-country', rawData.country);
      // ★ 英語モード：コロン区切り
      updateText('u-joined', `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }
  }

  updateText('u-name', rawData.user);
  const avatar = document.getElementById('u-avatar');
  if (avatar && rawData.avatarUrl) {
    avatar.src = rawData.avatarUrl;
    avatar.style.display = "block";
  }

  updateText('tv', rawData.totalViews);
  updateText('tl', rawData.totalLoves);
  updateText('tf', rawData.totalFavs);
  updateText('tr', rawData.totalRemixes);
  updateText('av', rawData.avgViews ? "平均: " + rawData.avgViews : "平均: -");
  updateText('al', rawData.avgLoves ? "平均: " + rawData.avgLoves : "平均: -");
  updateText('af', rawData.avgFavs ? "平均: " + rawData.avgFavs : "平均: -");
  updateText('ar', rawData.avgRemixes ? "平均: " + rawData.avgRemixes : "平均: -");

  if (document.getElementById('rank-list') && rawData.rankedHtml) {
    document.getElementById('rank-list').innerHTML = rawData.rankedHtml;
  }
  renderUserList();
}

function renderUserList() {
  const fContainer = document.getElementById('following-list');
  const rContainer = document.getElementById('followers-list');
  const searchEl = document.getElementById('user-search');
  if (!fContainer || !rContainer) return;

  const searchText = searchEl ? searchEl.value.toLowerCase() : "";
  const createUserHtml = (u) => `
    <div class="user-item" data-username="${u.username}">
      <div class="user-item-main">
        <img src="https://uploads.scratch.mit.edu/users/avatars/${u.id}.png" class="user-item-avatar">
        <span class="user-item-name">${u.username}</span>
      </div>
      <div class="user-item-detail">読み込み中...</div>
    </div>`;

  fContainer.innerHTML = allUsers.filter(u => u.type === 'following' && u.username.toLowerCase().includes(searchText)).map(createUserHtml).join('') || 'なし';
  rContainer.innerHTML = allUsers.filter(u => u.type === 'followers' && u.username.toLowerCase().includes(searchText)).map(createUserHtml).join('') || 'なし';

  document.querySelectorAll('.user-item-main').forEach(el => {
    el.onclick = async () => {
      const parent = el.parentElement;
      const det = parent.querySelector('.user-item-detail');
      parent.classList.toggle('open');

      if (parent.classList.contains('open') && det.innerText === "読み込み中...") {
        try {
          const res = await fetch(`https://api.scratch.mit.edu/users/${parent.dataset.username}`);
          const data = await res.json();
          const d = new Date(data.history.joined);
          const pad = (n) => n.toString().padStart(2, '0');
          
          let dateStr, countryStr;
          if (isJP) {
            countryStr = (typeof countryMap !== 'undefined' && countryMap[data.profile.country]) ? countryMap[data.profile.country] : data.profile.country;
            // ★ 詳細欄も日本語対応
            dateStr = `${d.getFullYear()}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 ${pad(d.getHours())}時${pad(d.getMinutes())}分${pad(d.getSeconds())}秒`;
          } else {
            countryStr = data.profile.country;
            dateStr = `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
          }

          det.innerHTML = `
            <div class="detail-row">📍 国: ${countryStr}</div>
            <div class="detail-row">📅 参加日: ${dateStr}</div>
          `;
        } catch (e) { det.innerHTML = "エラー"; }
      }
    };
  });
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'unit-toggle') { isJP = e.target.checked; formatDisplay(); }
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (btn) {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    let targetId = btn.getAttribute('data-tab') === "list-tab" ? "tab-list" : btn.getAttribute('data-tab');
    document.getElementById(targetId)?.classList.add('active');
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'user-search') renderUserList();
});