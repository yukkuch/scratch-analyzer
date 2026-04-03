import { runStatsAnalysis, copyToClipboard, saveAsImage } from './stats.js';
import { runListAnalysis } from './list.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ボタン要素の登録 ---
    const copyBtn = document.getElementById('copy-stats');
    const saveBtn = document.getElementById('save-image');

    if (copyBtn) {
        copyBtn.onclick = () => copyToClipboard();
    }

    if (saveBtn) {
        saveBtn.onclick = () => saveAsImage();
    }

    // --- 2. タブ切り替えロジック ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // --- 3. 自動解析の開始 ---
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url) return;
        
        const url = tabs[0].url;
        const match = url.match(/scratch\.mit\.edu\/users\/([^/]+)/);
        
        if (match) {
            const username = match[1];
            // 統計とリストの両方を実行
            runStatsAnalysis(username);
            runListAnalysis(username);
            
} else {
            // 1. 「統計」タブのコンテンツエリアを取得
            const statsContent = document.getElementById('stats-content');
            // 2. 「リスト」タブのコンテンツエリアを取得
            const listContainer = document.getElementById('list-container');
            // 3. アクションバー（コピー/保存ボタン）を取得
            const actionBar = document.getElementById('action-bar');

            // 共通のメッセージHTML
            const alertHtml = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 40px 20px;
                    text-align: center;
                    width: 100%;
                    box-sizing: border-box;
                ">
                    <div style="
                        color: #6c5ce7; 
                        font-size: 15px; 
                        font-weight: bold; 
                        line-height: 1.6;
                    ">
                        Scratchのユーザープロフィールページを<br>開いてから起動してください。
                    </div>
                </div>
            `;

            // 「統計」タブにメッセージを表示
            if (statsContent) {
                statsContent.innerHTML = alertHtml;
            }

            // 「リスト」タブにメッセージを表示
            if (listContainer) {
                listContainer.innerHTML = alertHtml;
            }

            // ボタン（アクションバー）を隠す
            if (actionBar) {
                actionBar.style.display = 'none';
            }
        }
    });
});