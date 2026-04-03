const pathParts = window.location.pathname.split('/');
const user = pathParts[2];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get") {
    const cached = sessionStorage.getItem(`stats_${user}`);
    if (cached) {
      chrome.runtime.sendMessage({ action: "update", user: user, ...JSON.parse(cached) }).catch(() => {});
    }
    startAnalysis();
    sendResponse({ status: "started" });
  }
  return true;
});

if (user && pathParts[1] === "users") {
  startAnalysis();
}

async function startAnalysis() {
  const cacheKey = `stats_${user}`;
  try {
    const userRes = await fetch(`https://api.scratch.mit.edu/users/${user}`);
    if (!userRes.ok) return;
    const userData = await userRes.json();
    
    // 日付の変換
    const date = new Date(userData.history.joined);
    date.setHours(date.getHours() + 9);
    const jstJoined = date.toISOString().replace('T', ' ').split('.')[0].replace(/-/g, '/');

    // プロジェクトIDの収集
    let projectIds = [];
    let offset = 0;
    while (true) {
      const listRes = await fetch(`https://api.scratch.mit.edu/users/${user}/projects?offset=${offset}&limit=40`);
      const listData = await listRes.json();
      if (!listData || listData.length === 0) break;
      listData.forEach(p => projectIds.push(p.id));
      if (listData.length < 40) break;
      offset += 40;
    }

    // 各プロジェクトの詳細取得（エラー対策版）
    let allData = [];
    const CHUNK_SIZE = 15; // 少し控えめに
    for (let i = 0; i < projectIds.length; i += CHUNK_SIZE) {
      const chunk = projectIds.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(chunk.map(id => 
        fetch(`https://api.scratch.mit.edu/projects/${id}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null) // 個別のエラーで全体を止めない
      ));

      results.forEach(p => {
        if (p && p.stats) { // p.statsがあるかチェック
          allData.push({
            id: p.id, title: p.title,
            v: p.stats.views || 0, l: p.stats.loves || 0,
            f: p.stats.favorites || 0, r: p.stats.remixes || 0
          });
        }
      });
    }

    // 統計計算
    const total = allData.reduce((acc, p) => {
      acc.v += p.v; acc.l += p.l; acc.f += p.f; acc.r += p.r;
      return acc;
    }, { v: 0, l: 0, f: 0, r: 0 });

    const n = allData.length || 1;
    // 参照エラーを防ぐためにコピーしてからソート
    const ranked = [...allData].sort((a, b) => b.v - a.v).slice(0, 3);

    // フォロー・フォロワー取得
    const [followingRes, followersRes] = await Promise.all([
      fetch(`https://api.scratch.mit.edu/users/${user}/following?limit=40`).then(r => r.json()).catch(() => []),
      fetch(`https://api.scratch.mit.edu/users/${user}/followers?limit=40`).then(r => r.json()).catch(() => [])
    ]);

    const userList = [
      ...followingRes.map(u => ({ id: u.id, username: u.username, type: 'following' })),
      ...followersRes.map(u => ({ id: u.id, username: u.username, type: 'followers' }))
    ];

    const finalData = {
      avatarUrl: userData.profile.images['90x90'],
      country: userData.profile.country,
      joined: jstJoined,
      totalViews: total.v.toLocaleString(),
      totalLoves: total.l.toLocaleString(),
      totalFavs: total.f.toLocaleString(),
      totalRemixes: total.r.toLocaleString(),
      avgViews: Math.round(total.v/n).toLocaleString(),
      avgLoves: Math.round(total.l/n).toLocaleString(),
      avgFavs: Math.round(total.f/n).toLocaleString(),
      avgRemixes: Math.round(total.r/n).toLocaleString(),
      userList: userList,
      rankedHtml: ranked.length > 0 ? ranked.map((p, i) => `
        <div class="rank-card">
          <div class="rank-badge">${i+1}</div>
          <div style="flex:1; min-width: 0;">
            <a href="https://scratch.mit.edu/projects/${p.id}" target="_blank" class="rank-link">${p.title}</a>
            <div class="rank-stats">
              <span class="stat-tag">👁️ ${p.v.toLocaleString()}</span>
              <span class="stat-tag">❤️ ${p.l.toLocaleString()}</span>
              <span class="stat-tag">⭐ ${p.f.toLocaleString()}</span>
              <span class="stat-tag">🌀 ${p.r.toLocaleString()}</span>
            </div>
          </div>
        </div>`).join('') : '<div class="empty-msg">プロジェクトが見つかりませんでした</div>'
    };

    sessionStorage.setItem(cacheKey, JSON.stringify(finalData));
    
    // ポップアップへ送信（リトライ機能付き）
    const sendData = () => {
      chrome.runtime.sendMessage({ action: "update", user: user, ...finalData })
        .catch(() => { /* ポップアップが閉じていれば失敗するので何もしない */ });
    };
    sendData();

  } catch (e) {
    console.error("Analysis Error:", e);
  }
}