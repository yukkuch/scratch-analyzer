import { countryMap } from '../js_common/countries.js';

let followingNames = [];
let followerNames = [];
let renderedUserIds = new Set(); 

function getCountryName(englishName, isJapanese) {
    if (!isJapanese) return englishName;
    return countryMap[englishName] || englishName;
}

function getFormattedDate(dateStr, isJapanese) {
    const d = new Date(dateStr);
    const pad = (n) => n.toString().padStart(2, '0');
    const y = d.getFullYear(), M = pad(d.getMonth() + 1), day = pad(d.getDate());
    const h = pad(d.getHours()), m = pad(d.getMinutes()), s = pad(d.getSeconds());
    return isJapanese ? `${y}年${M}月${day}日 ${h}時${m}分${s}秒` : `${y}/${M}/${day} ${h}:${m}:${s}`;
}

function updateCounts() {
    document.querySelectorAll('.section-container').forEach(container => {
        const titleEl = container.querySelector('.section-title');
        const rows = container.querySelectorAll('.user-row');
        if (!titleEl || !rows) return;
        const visibleCount = Array.from(rows).filter(row => row.style.display !== 'none').length;
        const baseName = titleEl.textContent.split(' (')[0];
        titleEl.textContent = `${baseName} (${visibleCount}名)`;
    });
}

function applyFilterToRow(row, type, word, isFwing, isFwer) {
    const nameEl = row.querySelector('.user-name-mini');
    if (!nameEl) return;
    const name = nameEl.textContent;

    let matchFilter = false;
    if (type === 'all') matchFilter = true;
    else if (type === 'mutual') matchFilter = (isFwing && isFwer);
    else if (type === 'following') matchFilter = (isFwing && !isFwer);
    else if (type === 'followers') matchFilter = (!isFwing && isFwer);

    const matchSearch = name.toLowerCase().includes(word);
    row.style.display = (matchFilter && matchSearch) ? '' : 'none';
}

function refreshList() {
    const activeBtn = document.querySelector('.filter-btn.active');
    const type = activeBtn ? activeBtn.dataset.filter : 'all';
    const searchInput = document.getElementById('user-search');
    const langToggle = document.getElementById('lang-toggle');
    const word = searchInput ? searchInput.value.toLowerCase() : '';
    const isJp = langToggle ? langToggle.checked : true;

    document.querySelectorAll('.user-row').forEach(row => {
        const name = row.querySelector('.user-name-mini').textContent;
        const countryEl = row.querySelector('.detail-country');
        const dateEl = row.querySelector('.detail-date');
        if (countryEl) countryEl.innerText = getCountryName(countryEl.dataset.raw, isJp);
        if (dateEl) dateEl.innerText = getFormattedDate(dateEl.dataset.raw, isJp);

        applyFilterToRow(row, type, word, followingNames.includes(name), followerNames.includes(name));
    });
    updateCounts();
}

function renderList(allData, isFinal = false, currentCount = 0) {
    const displayArea = document.getElementById('users-display-area');
    const langToggle = document.getElementById('lang-toggle');
    if (!displayArea || !allData) return;
    const isJp = langToggle ? langToggle.checked : true;

    if (!displayArea.querySelector('.double-scroll-wrapper')) {
        displayArea.innerHTML = `
            <div id="loading-status" style="font-size: 12px; color: #666; margin-bottom: 8px; font-weight: bold;"></div>
            <div class="double-scroll-wrapper">
                <div class="section-container" id="sec-following">
                    <div class="section-title">フォロー中 (0名)</div>
                    <div class="scroll-box"><div class="list-content"></div></div>
                </div>
                <div class="section-container" id="sec-followers">
                    <div class="section-title">フォロワー (0名)</div>
                    <div class="scroll-box"><div class="list-content"></div></div>
                </div>
            </div>`;
    }

    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
        statusEl.innerText = isFinal ? "✅ 読み込み完了" : `⏳ 現在 ${currentCount} 人読み込み中...`;
        if (isFinal) setTimeout(() => { statusEl.style.display = "none"; }, 2000);
    }

    followingNames = allData.filter(u => u._type === 'following').map(u => u.username);
    followerNames = allData.filter(u => u._type === 'followers').map(u => u.username);

    const fwingBox = document.querySelector('#sec-following .list-content');
    const fwerBox = document.querySelector('#sec-followers .list-content');
    const activeBtn = document.querySelector('.filter-btn.active');
    const type = activeBtn ? activeBtn.dataset.filter : 'all';
    const word = (document.getElementById('user-search')?.value || '').toLowerCase();

    allData.forEach(u => {
        const uniqueKey = `${u._type}_${u.id}`;
        if (renderedUserIds.has(uniqueKey)) return; 

        const countryRaw = u.profile ? u.profile.country : 'Unknown';
        const dateRaw = u.history ? u.history.joined : new Date().toISOString();

        const rowHtml = `
            <div class="user-row" data-username="${u.username}">
                <div class="user-item">
                    <div class="expand-btn"><span class="arrow-icon">▶</span></div>
                    <img src="https://uploads.scratch.mit.edu/users/avatars/${u.id}.png" class="user-avatar-mini">
                    <a href="https://scratch.mit.edu/users/${u.username}/" target="_blank" class="user-name-link">
                        <div class="user-name-mini">${u.username}</div>
                    </a>
                </div>
                <div class="user-details">
                    <div class="detail-item">📍 国：<span class="detail-country" data-raw="${countryRaw}">${getCountryName(countryRaw, isJp)}</span></div>
                    <div class="detail-item">📅 参加：<span class="detail-date" data-raw="${dateRaw}">${getFormattedDate(dateRaw, isJp)}</span></div>
                </div>
            </div>`;

        const targetBox = (u._type === 'following') ? fwingBox : fwerBox;
        targetBox.insertAdjacentHTML('beforeend', rowHtml);
        const newRow = targetBox.lastElementChild;
        applyFilterToRow(newRow, type, word, followingNames.includes(u.username), followerNames.includes(u.username));
        renderedUserIds.add(uniqueKey);
    });
    updateCounts();
}

export async function runListAnalysis(username) {
    const container = document.getElementById('list-container');
    if (!container) return; // 安全策
    renderedUserIds.clear(); 
    followingNames = [];
    followerNames = [];

    container.innerHTML = `
        <div class="search-filter-wrapper">
            <input type="text" id="user-search" placeholder="ユーザー名を検索...">
            <div class="filter-container">
                <button class="filter-btn active" data-filter="all">全員</button>
                <button class="filter-btn" data-filter="mutual">相互</button>
                <button class="filter-btn" data-filter="following">送り</button>
                <button class="filter-btn" data-filter="followers">受け</button>
            </div>
        </div>
        <div id="users-display-area"></div>`;

    const cacheKey = `cache_list_${username}`;
    const storage = await chrome.storage.local.get(cacheKey);
    
    if (storage[cacheKey]) {
        renderList(storage[cacheKey], true, storage[cacheKey].length);
    }

    chrome.runtime.sendMessage({ action: "START_FETCH", user: username });

    const timer = setInterval(() => {
        chrome.runtime.sendMessage({ action: "GET_STATUS" }, (status) => {
            if (status && status.data && status.username === username) {
                renderList(status.data, !status.loading, status.current);
                if (!status.loading) clearInterval(timer);
            } else {
                clearInterval(timer);
            }
        });
    }, 1000);
}

// イベントリスナーの登録
document.addEventListener('click', (e) => {
    const fBtn = e.target.closest('.filter-btn');
    if (fBtn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        fBtn.classList.add('active');
        refreshList();
    }
    const exBtn = e.target.closest('.expand-btn');
    if (exBtn) {
        const row = exBtn.closest('.user-row');
        if (row) row.classList.toggle('open');
    }
});

document.addEventListener('input', (e) => {
    if (e.target.id === 'user-search') refreshList();
});

document.addEventListener('change', (e) => {
    if (e.target.id === 'lang-toggle') refreshList();
});