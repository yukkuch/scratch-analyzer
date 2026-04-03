import { countryMap } from '../js_common/countries.js';

let cachedStats = null;

// --- 1. ヘルパー関数群 ---
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

function formatNumber(num, isUnitOn) {
    if (num === undefined || num === null) return "0";
    if (isUnitOn) {
        let result = "";
        let n = num;
        const oku = Math.floor(n / 100000000);
        if (oku > 0) { result += oku + "億"; n %= 100000000; }
        const man = Math.floor(n / 10000);
        if (man > 0) { result += man + "万"; n %= 10000; }
        if (n > 0 || result === "") { result += n; }
        return result;
    } else {
        // --- 修正箇所：.toLocaleString() を消して String() にする ---
        return String(num); 
    }
}

// --- 2. 描画関数 ---
function renderStats() {
    if (!cachedStats) return;
    const { userData, s, avg, top3 } = cachedStats;
    
    const langToggle = document.getElementById('lang-toggle');
    const isUnitOn = langToggle ? langToggle.checked : false;

    // --- プロフィールエリアの描画 ---
    const profileArea = document.getElementById('profile-area');
    if (profileArea) {
        const avatarUrl = `https://uploads.scratch.mit.edu/users/avatars/${userData.id}.png`;

        // Fetch方式で画像をデータ化（CORS回避・保存対策）
        fetch(avatarUrl)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataURL = reader.result;
                    profileArea.innerHTML = `
                        <div class="profile-bar">
                            <img src="${dataURL}" class="avatar"> 
                            <div class="profile-info">
                                <div class="username">${userData.username}</div>
                                <div class="lab">📍 国：<span>${getCountryName(userData.profile.country, isUnitOn)}</span></div>
                                <div class="lab">📅 参加日：<span>${getFormattedDate(userData.history.joined, isUnitOn)}</span></div>
                            </div>
                        </div>`;
                };
                reader.readAsDataURL(blob);
            })
            .catch(() => {
                // 失敗時はデフォルト画像を表示
                profileArea.innerHTML = `
                    <div class="profile-bar">
                        <img src="https://cdn2.scratch.mit.edu/get_image/user/default_90x90.png" class="avatar">
                        <div class="profile-info">
                            <div class="username">${userData.username}</div>
                            <div class="lab">📍 国：<span>${getCountryName(userData.profile.country, isUnitOn)}</span></div>
                            <div class="lab">📅 参加日：<span>${getFormattedDate(userData.history.joined, isUnitOn)}</span></div>
                        </div>
                    </div>`;
            });
    }

    // --- 統計グリッドの描画 ---
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        const labs = ["合計参照数", "合計❤️", "合計⭐️", "合計リミックス", "平均: "];
        statsGrid.innerHTML = `
            <div class="panel"><div class="lab">${labs[0]}</div><div class="val">${formatNumber(s.v, isUnitOn)}</div><div class="avg-box">${labs[4]}${formatNumber(avg.v, isUnitOn)}</div></div>
            <div class="panel"><div class="lab">${labs[1]}</div><div class="val">${formatNumber(s.l, isUnitOn)}</div><div class="avg-box">${labs[4]}${formatNumber(avg.l, isUnitOn)}</div></div>
            <div class="panel"><div class="lab">${labs[2]}</div><div class="val">${formatNumber(s.f, isUnitOn)}</div><div class="avg-box">${labs[4]}${formatNumber(avg.f, isUnitOn)}</div></div>
            <div class="panel"><div class="lab">${labs[3]}</div><div class="val">${formatNumber(s.r, isUnitOn)}</div><div class="avg-box">${labs[4]}${formatNumber(avg.r, isUnitOn)}</div></div>`;
    }

    // --- 人気作品ランキングの描画 ---
    const rankingContainer = document.getElementById('ranking-container');
    if (rankingContainer) {
        rankingContainer.innerHTML = `
            <div class="section-title">人気作品TOP3</div>` + 
            top3.map((p, i) => `
            <div class="rank-card">
                <div class="rank-num">${i+1}</div>
                <div class="rank-content">
                    <a href="https://scratch.mit.edu/projects/${p.id}/" target="_blank" class="project-name-link">
                        <div class="project-name">${p.title}</div>
                    </a>
                    <div class="project-stats">
                        👁️ ${formatNumber(p.stats.views, isUnitOn)} 
                        ❤️ ${formatNumber(p.stats.loves, isUnitOn)} 
                        ⭐ ${formatNumber(p.stats.favorites, isUnitOn)} 
                        🌀 ${formatNumber(p.stats.remixes, isUnitOn)}
                    </div>
                </div>
            </div>`).join('');
    }
} // ← ここの閉じカッコで関数の終わりです

// --- 3. メイン解析関数 ---
export async function runStatsAnalysis(username) {
    const grid = document.getElementById('stats-grid');
    const cacheKey = `stats_${username}`;

    try {
        const storage = await chrome.storage.local.get(cacheKey);
        
        // --- キャッシュがある場合のルート ---
        if (storage[cacheKey]) {
            cachedStats = storage[cacheKey];
            renderStats();

            // ★トグルスイッチの監視を開始★
            const langToggle = document.getElementById('lang-toggle');
            if (langToggle) {
                langToggle.onchange = () => renderStats();
            }
            return; 
        }

        // --- 新しく解析する画のルート ---
        if (grid) grid.innerHTML = `<div style="padding:20px; color:#666;">📊 統計を計算中...</div>`;

        const userRes = await fetch(`https://api.scratch.mit.edu/users/${username}`);
        const userData = await userRes.json();
        
        let allProjects = [];
        let offset = 0;
        while (true) {
            const res = await fetch(`https://api.scratch.mit.edu/users/${username}/projects?offset=${offset}&limit=40`);
            const data = await res.json();
            if (!data || data.length === 0) break;
            allProjects = allProjects.concat(data);
            if (data.length < 40) break;
            offset += 40;
        }

        const detailedStats = [];
        const BATCH_SIZE = 20;
        for (let i = 0; i < allProjects.length; i += BATCH_SIZE) {
            const batch = allProjects.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(batch.map(p => 
                fetch(`https://api.scratch.mit.edu/projects/${p.id}`)
                    .then(res => res.json())
                    .then(d => d.stats)
                    .catch(() => ({ views: 0, loves: 0, favorites: 0, remixes: 0 }))
            ));
            detailedStats.push(...batchResults);
        }

        let s = { v: 0, l: 0, f: 0, r: 0 };
        detailedStats.forEach(stat => {
            s.v += stat.views; s.l += stat.loves; s.f += stat.favorites; s.r += stat.remixes;
        });
        const count = allProjects.length;
        const calcAvg = (val) => (count > 0 ? Math.round(val / count) : 0);

        cachedStats = {
            userData,
            s,
            avg: { v: calcAvg(s.v), l: calcAvg(s.l), f: calcAvg(s.f), r: calcAvg(s.r) },
            top3: allProjects.map((p, i) => ({ ...p, stats: detailedStats[i] }))
                   .sort((a, b) => b.stats.views - a.stats.views).slice(0, 3)
        };

        await chrome.storage.local.set({ [cacheKey]: cachedStats });
        
        // 解析直後の描画
        renderStats();

        // ★解析完了後もトグルスイッチの監視を開始★
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.onchange = () => renderStats();
        }

    } catch (e) {
        if (grid) grid.innerHTML = '<div style="color:red; padding:20px;">エラーが発生しました</div>';
    }
}
// --- 文字でコピー機能 ---
export async function copyToClipboard() {
    if (!cachedStats) {
        alert("データがありません。解析を先に完了させてください。");
        return;
    }
    const { userData, s, avg } = cachedStats;
    const isUnitOn = document.getElementById('lang-toggle')?.checked || false;
    const text = `📊 Scratch Analyzer 解析結果\n👤 ユーザー: ${userData.username}\n📍 国: ${getCountryName(userData.profile.country, isUnitOn)}\n📅 参加日: ${getFormattedDate(userData.history.joined, isUnitOn)}\n-------------------------\n👁️ 合計参照数: ${formatNumber(s.v, isUnitOn)} (平均: ${formatNumber(avg.v, isUnitOn)})\n❤️ 合計❤️: ${formatNumber(s.l, isUnitOn)} (平均: ${formatNumber(avg.l, isUnitOn)})\n⭐ 合計⭐️: ${formatNumber(s.f, isUnitOn)} (平均: ${formatNumber(avg.f, isUnitOn)})\n🌀 合計リミックス: ${formatNumber(s.r, isUnitOn)} (平均: ${formatNumber(avg.r, isUnitOn)})\n-------------------------\nProduced by Scratch Analyzer Ultra`.trim();
    try {
        await navigator.clipboard.writeText(text);
        alert("クリップボードにコピーしました！");
    } catch (err) {
        alert("コピーに失敗しました。");
    }
}

// --- 画像で保存機能 ---
export async function saveAsImage() {
    const target = document.getElementById('stats-content');
    if (!target) return;

    const actionBar = document.getElementById('action-bar');
    if (actionBar) actionBar.style.display = 'none';

    try {
        const canvas = await html2canvas(target, {
            useCORS: true,           // 必須：CORSを有効にする
            allowTaint: false,       // 必須：汚染を許可しない（保存するため）
            proxy: null,             // 余計なプロキシは使わない
            backgroundColor: "#ffffff",
            scale: 2,
            logging: true            // 失敗時に原因を詳しく見るためにON
        });

        const link = document.createElement('a');
        link.download = `Scratch Analyzer_${cachedStats.userData.username}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (err) {
        console.error("生成失敗の理由:", err);
        alert("画像の生成に失敗しました。コンソール(F12)を確認してください。");
    } finally {
        if (actionBar) actionBar.style.display = 'flex';
    }
}