let isRunning = false;
let fetchStatus = {
    loading: false,
    current: 0,
    data: [],
    username: ""
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_FETCH") {
        // 同じユーザーの解析が既に走っているなら二重に開始しない
        if (isRunning && fetchStatus.username === request.user) {
            sendResponse({ status: "already_running" });
        } else {
            startMarathon(request.user);
            sendResponse({ status: "started" });
        }
    } 
    else if (request.action === "GET_STATUS") {
        sendResponse(fetchStatus);
    }
    return true;
});

async function startMarathon(username) {
    isRunning = true;
    fetchStatus.loading = true;
    fetchStatus.current = 0;
    fetchStatus.data = [];
    fetchStatus.username = username;

    let allUsers = [];
    const types = ['following', 'followers'];

    try {
        for (const type of types) {
            let offset = 0;
            while (true) {
                // 途中で別のユーザーの解析が始まったら中断
                if (fetchStatus.username !== username) return;

                const url = `https://api.scratch.mit.edu/users/${username}/${type}?limit=40&offset=${offset}`;
                const res = await fetch(url);
                if (!res.ok) break;
                const data = await res.json();
                if (data.length === 0) break;

                const markedData = data.map(u => ({ ...u, _type: type }));
                allUsers = allUsers.concat(markedData);
                
                // リアルタイム反映用のステータス更新
                fetchStatus.data = [...allUsers];
                fetchStatus.current = allUsers.length;

                if (data.length < 40) break;
                offset += 40;
                await new Promise(r => setTimeout(r, 150));
            }
        }
        // ✅ 完了したらストレージに永久保存
        await chrome.storage.local.set({ [`cache_list_${username}`]: allUsers });
        console.log(`Saved ${username}'s list to storage.`);

    } catch (e) {
        console.error("Fetch Error:", e);
    } finally {
        isRunning = false;
        fetchStatus.loading = false;
    }
}