// ポップアップの初期化とUI管理

class TabSwitcherPopup {
    constructor() {
        this.settings = null;
        this.statusUpdateInterval = null;
        this.tabList = [];

        this.init();
    }

    async init() {
        console.log('TabSwitcherPopup初期化開始');

        // イベントリスナーをバインド
        this.bindEvents();

        // 設定をロード
        await this.loadSettings();

        // UI要素の生成
        this.renderTabList();

        // ステータスを更新
        await this.updateStatus();

        // 定期的にステータスを更新
        this.startStatusUpdate();

        this.addLog('ポップアップが初期化されました', 'info');
    }

    // タブリストを描画
    renderTabList() {
        const container = document.getElementById('tab-list-container');
        container.innerHTML = '';

        if (this.tabList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    まだタブが設定されていません。<br>
                    「+」ボタンでタブを追加してください。
                </div>
            `;
            return;
        }

        this.tabList.forEach((tab, index) => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-item';
            tabItem.innerHTML = `
                <span class="tab-number">${index + 1}</span>
                <input type="text"
                       class="tab-url-input"
                       data-index="${index}"
                       value="${tab.url || ''}"
                       placeholder="URL または file:// パス"
                       title="WebページのURLまたはローカルファイルのfile://パス">
                <input type="number"
                       class="tab-time-input"
                       data-index="${index}"
                       value="${tab.time || 10}"
                       min="1"
                       max="3600"
                       title="秒単位で表示時間を設定">
                <span class="time-unit">秒</span>
                <button class="btn btn-icon btn-remove" data-index="${index}" title="このタブを削除">🗑️</button>
            `;
            container.appendChild(tabItem);
        });

        // タブの入力フィールドにイベントリスナーを追加
        this.bindTabInputEvents();
    }

    // タブを追加
    addTab() {
        this.tabList.push({ url: '', time: 10 });
        this.renderTabList();
        this.addLog(`タブを追加しました (${this.tabList.length}個目)`, 'info');
    }

    // タブを削除
    removeTab(index) {
        if (index >= 0 && index < this.tabList.length) {
            this.tabList.splice(index, 1);
            this.renderTabList();
            this.addLog(`タブを削除しました (残り${this.tabList.length}個)`, 'info');
        }
    }

    // タブ入力フィールドのイベントリスナー
    bindTabInputEvents() {
        // URL入力の変更
        document.querySelectorAll('.tab-url-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (this.tabList[index]) {
                    this.tabList[index].url = e.target.value;
                }
            });
        });

        // 時間入力の変更
        document.querySelectorAll('.tab-time-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                const value = parseInt(e.target.value) || 10;
                if (this.tabList[index]) {
                    this.tabList[index].time = Math.max(1, Math.min(3600, value));
                }
            });
        });

        // 削除ボタン
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm('このタブを削除しますか？')) {
                    this.removeTab(index);
                }
            });
        });
    }

    // イベントリスナーをバインド
    bindEvents() {
        // 開始ボタン
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startSwitching();
        });

        // 停止ボタン
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopSwitching();
        });

        // タブ追加ボタン
        document.getElementById('add-tab-btn').addEventListener('click', () => {
            this.addTab();
        });

        // 保存ボタン
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // リセットボタン
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSettings();
        });

        // ログクリアボタン
        document.getElementById('clear-logs-btn').addEventListener('click', () => {
            this.clearLogs();
        });

        // 自動起動トグルボタン
        document.getElementById('auto-start-toggle').addEventListener('change', (e) => {
            this.saveAutoStartSetting(e.target.checked);
        });
    }

    // 設定をロード
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                'tabList',
                'autoStart',
                'isRunning',
                'currentTabIndex',
                'logs'
            ]);

            this.settings = {
                tabList: result.tabList || [],
                autoStart: result.autoStart !== false, // デフォルトはtrue
                isRunning: result.isRunning || false,
                currentTabIndex: result.currentTabIndex || 0,
                logs: result.logs || []
            };

            this.tabList = this.settings.tabList;
            this.populateUI();
            this.addLog('設定をロードしました', 'success');
        } catch (error) {
            console.error('設定ロードエラー:', error);
            this.addLog(`設定ロードエラー: ${error.message}`, 'error');
        }
    }

    // UIに設定値を反映
    populateUI() {
        // 自動起動設定
        const autoStartToggle = document.getElementById('auto-start-toggle');
        if (autoStartToggle) {
            autoStartToggle.checked = this.settings.autoStart;
        }

        // ログ表示
        if (this.settings.logs && this.settings.logs.length > 0) {
            this.displayLogs(this.settings.logs);
        }
    }

    // 設定を保存
    async saveSettings() {
        try {
            // 有効なタブのみをフィルタリング
            const validTabList = this.tabList.filter(tab =>
                tab.url && tab.url.trim() !== ''
            );

            const autoStart = document.getElementById('auto-start-toggle').checked;

            await chrome.storage.local.set({
                tabList: validTabList,
                autoStart: autoStart
            });

            this.settings.tabList = validTabList;
            this.settings.autoStart = autoStart;

            this.addLog(`設定を保存しました (${validTabList.length}個のタブ)`, 'success');

            // 背景スクリプトに設定変更を通知
            chrome.runtime.sendMessage({
                action: 'settingsUpdated',
                settings: { tabList: validTabList, autoStart }
            });

        } catch (error) {
            console.error('設定保存エラー:', error);
            this.addLog(`設定保存エラー: ${error.message}`, 'error');
        }
    }

    // 設定をリセット
    async resetSettings() {
        if (confirm('すべての設定をリセットしますか？')) {
            // タブリストをクリア
            this.tabList = [];
            this.renderTabList();

            // 自動起動をデフォルトに戻す
            document.getElementById('auto-start-toggle').checked = true;

            // 自動的に保存
            await this.saveSettings();

            this.addLog('設定をリセットし、自動保存しました', 'success');
        }
    }

    // 自動起動設定を保存
    async saveAutoStartSetting(autoStart) {
        try {
            await chrome.storage.local.set({ autoStart: autoStart });
            this.settings.autoStart = autoStart;
            this.addLog(`自動起動を${autoStart ? '有効' : '無効'}にしました`, 'info');
        } catch (error) {
            console.error('自動起動設定エラー:', error);
            this.addLog(`自動起動設定エラー: ${error.message}`, 'error');
        }
    }

    // タブ切り替えを開始
    async startSwitching() {
        try {
            // まず設定を保存
            await this.saveSettings();

            if (this.settings.tabList.length === 0) {
                this.addLog('タブが設定されていません', 'error');
                return;
            }

            // 背景スクリプトに開始指示を送信
            const response = await chrome.runtime.sendMessage({
                action: 'startSwitching'
            });

            if (response && response.success) {
                this.addLog('タブ切り替えを開始しました', 'success');
                this.updateButtonStates(true);
            } else {
                this.addLog('タブ切り替えの開始に失敗しました', 'error');
            }
        } catch (error) {
            console.error('開始エラー:', error);
            this.addLog(`開始エラー: ${error.message}`, 'error');
        }
    }

    // タブ切り替えを停止
    async stopSwitching() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'stopSwitching'
            });

            if (response && response.success) {
                this.addLog('タブ切り替えを停止しました', 'info');
                this.updateButtonStates(false);
            } else {
                this.addLog('タブ切り替えの停止に失敗しました', 'error');
            }
        } catch (error) {
            console.error('停止エラー:', error);
            this.addLog(`停止エラー: ${error.message}`, 'error');
        }
    }

    // ボタンの状態を更新
    updateButtonStates(isRunning) {
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');

        startBtn.disabled = isRunning;
        stopBtn.disabled = !isRunning;

        // ステータス表示も更新
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');

        if (isRunning) {
            statusDot.className = 'status-dot running';
            statusText.textContent = '実行中';
        } else {
            statusDot.className = 'status-dot stopped';
            statusText.textContent = '停止中';
        }
    }

    // ステータスを更新
    async updateStatus() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getStatus'
            });

            if (response) {
                this.updateButtonStates(response.isRunning);

                if (response.isRunning) {
                    // 現在のタブ情報を表示
                    const currentTabDisplay = document.getElementById('current-tab-display');
                    const remainingTimeDisplay = document.getElementById('remaining-time-display');

                    if (currentTabDisplay) {
                        const currentTab = response.currentTab || '準備中...';
                        currentTabDisplay.textContent = currentTab.length > 30 ?
                            currentTab.substring(0, 30) + '...' : currentTab;
                    }

                    if (remainingTimeDisplay) {
                        remainingTimeDisplay.textContent = response.remainingTime ?
                            `${response.remainingTime}秒` : '切り替え中...';
                    }
                } else {
                    document.getElementById('current-tab-display').textContent = '-';
                    document.getElementById('remaining-time-display').textContent = '-';
                }

                // 設定との一貫性をチェック
                const autoStartToggle = document.getElementById('auto-start-toggle');
                if (autoStartToggle && !response.isRunning) {
                    // 停止中の場合、UIの自動開始設定と実際の状態を同期
                    this.addLog(`ステータス同期: 実行中=${response.isRunning}, 自動開始=${autoStartToggle.checked}`, 'info');
                }
            }
        } catch (error) {
            console.error('ステータス更新エラー:', error);
            // エラーの場合は停止状態として表示
            this.updateButtonStates(false);
            document.getElementById('current-tab-display').textContent = 'エラー';
            document.getElementById('remaining-time-display').textContent = '-';
        }
    }

    // 定期的なステータス更新を開始
    startStatusUpdate() {
        this.statusUpdateInterval = setInterval(() => {
            this.updateStatus();
        }, 1000); // 1秒ごとに更新
    }

    // ログを追加
    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        const logEntry = `[${timestamp}] ${message}`;

        console.log(logEntry);

        const logContainer = document.getElementById('log-display');
        if (logContainer) {
            const logElement = document.createElement('div');
            logElement.className = `log-entry ${type}`;
            logElement.textContent = logEntry;

            logContainer.appendChild(logElement);
            logContainer.scrollTop = logContainer.scrollHeight;

            // ログが多すぎる場合は古いものを削除
            const logs = logContainer.querySelectorAll('.log-entry');
            if (logs.length > 50) {
                logs[0].remove();
            }
        }

        // ストレージにも保存
        this.saveLogToStorage(logEntry, type);
    }

    // ログをストレージに保存
    async saveLogToStorage(message, type) {
        try {
            const result = await chrome.storage.local.get(['logs']);
            const logs = result.logs || [];

            logs.push({
                message: message,
                type: type,
                timestamp: Date.now()
            });

            // 最新50件のみ保持
            if (logs.length > 50) {
                logs.splice(0, logs.length - 50);
            }

            await chrome.storage.local.set({ logs: logs });
        } catch (error) {
            console.error('ログ保存エラー:', error);
        }
    }

    // ログを表示
    displayLogs(logs) {
        const logContainer = document.getElementById('log-display');
        if (logContainer && logs.length > 0) {
            logContainer.innerHTML = '';

            logs.slice(-20).forEach(log => { // 最新20件を表示
                const logElement = document.createElement('div');
                logElement.className = `log-entry ${log.type || 'info'}`;
                logElement.textContent = log.message;
                logContainer.appendChild(logElement);
            });

            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // ログをクリア
    clearLogs() {
        const logContainer = document.getElementById('log-display');
        if (logContainer) {
            logContainer.innerHTML = '<div class="log-entry">ログがクリアされました</div>';
        }

        // ストレージからもクリア
        chrome.storage.local.set({ logs: [] });
    }
}

// ポップアップが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
    new TabSwitcherPopup();
});

// ページがアンロードされるときにインターバルをクリア
window.addEventListener('beforeunload', () => {
    if (window.tabSwitcherPopup && window.tabSwitcherPopup.statusUpdateInterval) {
        clearInterval(window.tabSwitcherPopup.statusUpdateInterval);
    }
});