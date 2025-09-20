// Chrome自動タブ切り替え - バックグラウンドスクリプト
// Manifest V3 Service Worker

class TabSwitcherBackground {
    constructor() {
        this.isRunning = false;
        this.currentTabIndex = 0;
        this.tabList = [];
        this.openTabs = new Map(); // URL -> tabId のマッピング
        this.switchInterval = null;
        this.remainingTime = 0;
        this.currentTab = null;

        // 初期化
        this.init();
    }

    async init() {
        // console.log('TabSwitcherBackground 初期化開始');

        // 設定をロード
        await this.loadSettings();

        // イベントリスナーを設定
        this.setupEventListeners();

        // 初期アイコンを設定（現在の実行状態に基づく）
        await this.updateIcon(this.isRunning ? 'running' : 'stopped');

        // 自動起動の判定と処理
        if (this.autoStart && this.tabList.length > 0) {
            console.log('自動起動が有効 - タブ切り替えを開始');
            // 自動開始の場合は直接開始
            setTimeout(async () => {
                await this.startSwitching();
            }, 1000);
        } else {
            // 自動開始がOFFの場合は明示的に停止処理を実行
            console.log('自動起動がOFF - 明示的に停止処理を実行');
            await this.stopSwitching();
        }

        this.log('バックグラウンドスクリプトが初期化されました', 'info');
    }

    // 設定をロード
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                'tabList',
                'autoStart',
                'isRunning',
                'currentTabIndex'
            ]);

            this.tabList = result.tabList || [];
            this.autoStart = result.autoStart !== false; // デフォルトはtrue
            this.isRunning = result.isRunning || false;
            this.currentTabIndex = result.currentTabIndex || 0;

            // console.log('設定をロード:', {
            //     tabCount: this.tabList.length,
            //     autoStart: this.autoStart,
            //     isRunning: this.isRunning
            // });

        } catch (error) {
            console.error('設定ロードエラー:', error);
            this.log(`設定ロードエラー: ${error.message}`, 'error');
        }
    }

    // 設定を保存
    async saveSettings() {
        try {
            await chrome.storage.local.set({
                isRunning: this.isRunning,
                currentTabIndex: this.currentTabIndex
            });
        } catch (error) {
            console.error('設定保存エラー:', error);
        }
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // ポップアップからのメッセージ
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // 非同期レスポンスを示す
        });

        // 拡張機能起動時
        chrome.runtime.onStartup.addListener(() => {
            this.handleStartup();
        });

        // Chrome起動時
        chrome.runtime.onInstalled.addListener(() => {
            this.handleInstalled();
        });

        // アラーム（タイマー）
        chrome.alarms.onAlarm.addListener((alarm) => {
            this.handleAlarm(alarm);
        });

        // タブが閉じられた時
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.handleTabRemoved(tabId);
        });

        // ウィンドウフォーカス変更時
        chrome.windows.onFocusChanged.addListener((windowId) => {
            this.handleWindowFocusChanged(windowId);
        });
    }

    // メッセージハンドラー
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'startSwitching':
                    const startResult = await this.startSwitching();
                    sendResponse({ success: startResult });
                    break;

                case 'stopSwitching':
                    const stopResult = await this.stopSwitching();
                    sendResponse({ success: stopResult });
                    break;

                case 'getStatus':
                    sendResponse({
                        isRunning: this.isRunning,
                        currentTab: this.currentTab,
                        remainingTime: this.remainingTime,
                        currentTabIndex: this.currentTabIndex,
                        totalTabs: this.tabList.length
                    });
                    break;

                case 'settingsUpdated':
                    await this.updateSettings(message.settings);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('メッセージ処理エラー:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // 拡張機能起動時の処理
    async handleStartup() {
        // console.log('Chrome起動検知');

        // 既に実行中の場合はスキップ
        if (this.isRunning) {
            // console.log('既に実行中のため起動処理をスキップ');
            return;
        }

        // 少し待ってからロード（他の拡張機能との競合を避ける）
        await this.sleep(2000);

        await this.loadSettings();
        this.log('Chrome起動時の設定確認完了', 'info');

        if (this.autoStart && this.tabList.length > 0) {
            this.log(`自動起動を実行: autoStart=${this.autoStart}, tabCount=${this.tabList.length}`, 'info');

            // さらに少し待ってから開始（タブが安定するまで）
            await this.sleep(3000);
            await this.startSwitching();
        } else {
            this.log(`自動起動スキップ: autoStart=${this.autoStart}, tabCount=${this.tabList.length}`, 'info');

            // 自動開始がOFFの場合は明示的に停止処理を実行
            this.log('明示的に停止処理を実行して状態をリセット', 'info');
            await this.stopSwitching();
        }
    }

    // 拡張機能インストール時の処理
    async handleInstalled() {
        // console.log('拡張機能インストール/更新検知');

        await this.loadSettings();
        this.log('拡張機能インストール時の設定確認完了', 'info');

        // インストール時は自動起動しない（ユーザーが設定を確認するまで）
        this.log('インストール時のため自動起動はスキップします', 'info');
    }

    // アラーム処理
    async handleAlarm(alarm) {
        if (alarm.name === 'tabSwitchTimer') {
            await this.switchToNextTab();
        } else if (alarm.name === 'remainingTimeUpdate') {
            this.updateRemainingTime();
        }
    }

    // タブが閉じられた時の処理
    async handleTabRemoved(tabId) {
        if (this.isRunning) {
            // 管理対象のタブが閉じられた場合、停止する
            let tabClosed = false;
            for (let [url, id] of this.openTabs) {
                if (id === tabId) {
                    console.log('管理対象のタブが閉じられました:', url);
                    this.openTabs.delete(url);
                    tabClosed = true;
                    break;
                }
            }

            if (tabClosed) {
                this.log('管理対象のタブが閉じられたため、自動切り替えを停止しました', 'info');
                await this.stopSwitching();
            }
        }
    }

    // ウィンドウフォーカス変更時の処理
    handleWindowFocusChanged(windowId) {
        if (this.isRunning && windowId !== chrome.windows.WINDOW_ID_NONE) {
            // フォーカスが変わった場合、必要に応じて現在のタブにフォーカスを戻す
            // デジタルサイネージ用途では他のアプリケーションが前面に来ることを防ぐ
        }
    }

    // タブ切り替えを開始
    async startSwitching() {
        try {
            if (this.isRunning) {
                // console.log('既に実行中です');
                return true;
            }

            if (this.tabList.length === 0) {
                this.log('タブが設定されていません', 'error');
                return false;
            }

            this.log(`タブ切り替えを開始 (${this.tabList.length}個のタブ)`, 'success');

            // すべてのタブを開く
            await this.openAllTabs();

            // 切り替えを開始
            this.isRunning = true;
            this.currentTabIndex = 0;
            await this.saveSettings();

            // アイコンを実行中に変更
            await this.updateIcon('running');

            // 最初のタブから開始
            await this.switchToCurrentTab();

            return true;

        } catch (error) {
            console.error('タブ切り替え開始エラー:', error);
            this.log(`タブ切り替え開始エラー: ${error.message}`, 'error');
            return false;
        }
    }

    // タブ切り替えを停止
    async stopSwitching() {
        try {
            if (!this.isRunning) {
                // console.log('既に停止しています');
                return true;
            }

            this.log('タブ切り替えを停止', 'info');

            this.isRunning = false;
            this.remainingTime = 0;
            this.currentTab = null;

            // タイマーをクリア
            chrome.alarms.clear('tabSwitchTimer');
            chrome.alarms.clear('remainingTimeUpdate');

            // アイコンを停止中に変更
            await this.updateIcon('stopped');

            await this.saveSettings();

            return true;

        } catch (error) {
            console.error('タブ切り替え停止エラー:', error);
            this.log(`タブ切り替え停止エラー: ${error.message}`, 'error');
            return false;
        }
    }

    // すべてのタブを開く
    async openAllTabs() {
        this.log('登録されたタブを開いています...', 'info');

        // 最初に既存タブをスキャンして管理マップを初期化
        await this.scanExistingTabs();

        for (const tabConfig of this.tabList) {
            try {
                const tabId = await this.openTab(tabConfig.url);
                this.log(`タブを準備: ${this.getDisplayUrl(tabConfig.url)} (ID: ${tabId})`, 'info');

                // タブ間に少し間隔を空ける
                await this.sleep(300);
            } catch (error) {
                console.error(`タブオープンエラー (${tabConfig.url}):`, error);
                this.log(`タブオープンエラー: ${tabConfig.url}`, 'error');
            }
        }

        // すべてのタブが読み込まれるまで少し待つ
        await this.sleep(1500);
    }

    // 既存タブをスキャンして管理マップを初期化
    async scanExistingTabs() {
        try {
            this.log('既存タブをスキャン中...', 'info');
            const tabs = await chrome.tabs.query({});
            let foundCount = 0;

            for (const tabConfig of this.tabList) {
                for (const tab of tabs) {
                    if (this.isUrlMatch(tab.url, tabConfig.url)) {
                        this.openTabs.set(tabConfig.url, tab.id);
                        foundCount++;
                        this.log(`既存タブを検出: ${this.getDisplayUrl(tabConfig.url)} (ID: ${tab.id})`, 'success');
                        break;
                    }
                }
            }

            this.log(`既存タブスキャン完了: ${foundCount}個のタブを再利用`, 'info');
        } catch (error) {
            console.error('既存タブスキャンエラー:', error);
            this.log(`既存タブスキャンエラー: ${error.message}`, 'error');
        }
    }

    // URLマッチング判定
    isUrlMatch(tabUrl, targetUrl) {
        if (!tabUrl || !targetUrl) return false;

        // 完全一致
        if (tabUrl === targetUrl) return true;

        // file:// プロトコルの場合の正規化比較
        if (targetUrl.startsWith('file://') && tabUrl.startsWith('file://')) {
            return this.normalizeFileUrl(tabUrl) === this.normalizeFileUrl(targetUrl);
        }

        return false;
    }

    // 既存タブの中から対象URLを検索
    async findExistingTab(url) {
        try {
            const tabs = await chrome.tabs.query({});

            for (const tab of tabs) {
                // URLが完全一致する場合
                if (tab.url === url) {
                    console.log('既存タブを発見:', url, 'tabId:', tab.id);
                    return tab.id;
                }

                // file:// プロトコルの場合、パスのみで比較
                if (url.startsWith('file://') && tab.url && tab.url.startsWith('file://')) {
                    if (this.normalizeFileUrl(url) === this.normalizeFileUrl(tab.url)) {
                        console.log('既存ファイルタブを発見:', url, 'tabId:', tab.id);
                        return tab.id;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('既存タブ検索エラー:', error);
            return null;
        }
    }

    // file:// URLを正規化（大文字小文字、スラッシュの違いを吸収）
    normalizeFileUrl(url) {
        if (!url.startsWith('file://')) {
            return url;
        }

        return url.toLowerCase().replace(/\\/g, '/');
    }

    // タブを開く（既に開いている場合は再利用）
    async openTab(url) {
        try {
            // 管理マップから既存タブをチェック
            if (this.openTabs.has(url)) {
                const tabId = this.openTabs.get(url);
                try {
                    const tab = await chrome.tabs.get(tabId);
                    if (tab) {
                        console.log('管理マップから既存タブを再利用:', url);
                        return tabId;
                    }
                } catch (error) {
                    // タブが既に閉じられている場合
                    this.openTabs.delete(url);
                }
            }

            // 全タブから既存タブを検索
            const existingTabId = await this.findExistingTab(url);
            if (existingTabId) {
                console.log('全タブ検索で既存タブを発見、再利用:', url);
                this.openTabs.set(url, existingTabId);
                return existingTabId;
            }

            // 新しいタブを作成
            console.log('新しいタブを作成:', url);
            const tab = await chrome.tabs.create({
                url: url,
                active: false // 背景で開く
            });

            this.openTabs.set(url, tab.id);
            return tab.id;

        } catch (error) {
            console.error('タブ作成エラー:', error);
            throw error;
        }
    }

    // 現在のタブに切り替え
    async switchToCurrentTab() {
        try {
            const currentTabConfig = this.tabList[this.currentTabIndex];
            if (!currentTabConfig) {
                console.error('現在のタブ設定が見つかりません');
                this.log('タブ設定が見つからないため停止します', 'error');
                await this.stopSwitching();
                return;
            }

            const tabId = this.openTabs.get(currentTabConfig.url);
            if (!tabId) {
                console.error('タブIDが見つかりません:', currentTabConfig.url);
                this.log(`タブID不明のため再作成: ${this.getDisplayUrl(currentTabConfig.url)}`, 'error');

                // タブを再作成
                try {
                    const newTabId = await this.openTab(currentTabConfig.url);
                    await this.sleep(1000); // タブの読み込み待機
                } catch (reopenError) {
                    console.error('タブ再作成エラー:', reopenError);
                    this.log('タブ再作成に失敗しました', 'error');
                    await this.switchToNextTab();
                    return;
                }
            }

            // タブの存在確認
            let tab;
            try {
                tab = await chrome.tabs.get(this.openTabs.get(currentTabConfig.url));
            } catch (tabError) {
                console.error('タブアクセスエラー:', tabError);
                this.log('タブにアクセスできないため次のタブに移動', 'error');
                await this.switchToNextTab();
                return;
            }

            // タブをアクティブにする
            await chrome.tabs.update(tab.id, { active: true });

            // ウィンドウを最前面に移動
            await chrome.windows.update(tab.windowId, { focused: true });

            // タブごとのリロード設定が有効な場合、ページをリロード
            if (currentTabConfig.reload !== false) {
                try {
                    await chrome.tabs.reload(tab.id);
                    this.log(`ページをリロードしました: ${this.getDisplayUrl(currentTabConfig.url)}`, 'info');
                } catch (reloadError) {
                    console.error('ページリロードエラー:', reloadError);
                    this.log(`ページリロードエラー: ${reloadError.message}`, 'error');
                }
            }

            this.currentTab = this.getDisplayUrl(currentTabConfig.url);
            this.remainingTime = currentTabConfig.time;

            // 状態を確実に保存
            await this.saveSettings();

            this.log(`タブ切り替え成功: ${this.currentTab} (${currentTabConfig.time}秒)`, 'success');

            // 既存のタイマーをクリア
            chrome.alarms.clear('tabSwitchTimer');
            chrome.alarms.clear('remainingTimeUpdate');

            // 次の切り替えタイマーを設定
            chrome.alarms.create('tabSwitchTimer', {
                delayInMinutes: currentTabConfig.time / 60
            });

            // 残り時間更新タイマーを設定
            chrome.alarms.create('remainingTimeUpdate', {
                periodInMinutes: 1/60 // 1秒ごと
            });

        } catch (error) {
            console.error('タブ切り替えエラー:', error);
            this.log(`タブ切り替えエラー: ${error.message}`, 'error');

            // エラーが発生した場合は次のタブに進む
            await this.switchToNextTab();
        }
    }

    // 次のタブに切り替え
    async switchToNextTab() {
        if (!this.isRunning) {
            return;
        }

        // 次のタブのインデックスを計算
        this.currentTabIndex = (this.currentTabIndex + 1) % this.tabList.length;
        await this.saveSettings();

        // タブを切り替え
        await this.switchToCurrentTab();
    }

    // 残り時間を更新
    updateRemainingTime() {
        if (this.isRunning && this.remainingTime > 0) {
            this.remainingTime--;
            if (this.remainingTime <= 0) {
                chrome.alarms.clear('remainingTimeUpdate');
            }
        }
    }

    // 設定を更新
    async updateSettings(newSettings) {
        try {
            if (newSettings.tabList) {
                this.tabList = newSettings.tabList;
            }

            if (typeof newSettings.autoStart === 'boolean') {
                this.autoStart = newSettings.autoStart;
            }


            this.log('設定が更新されました', 'info');

            // 実行中の場合は再起動
            if (this.isRunning) {
                await this.stopSwitching();
                if (this.tabList.length > 0) {
                    await this.startSwitching();
                }
            }

        } catch (error) {
            console.error('設定更新エラー:', error);
            this.log(`設定更新エラー: ${error.message}`, 'error');
        }
    }

    // URLの表示用文字列を取得
    getDisplayUrl(url) {
        if (url.length > 50) {
            return url.substring(0, 50) + '...';
        }
        return url;
    }

    // ログを記録
    async log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        const logEntry = `[${timestamp}] ${message}`;

        // console.log(logEntry);

        try {
            const result = await chrome.storage.local.get(['logs']);
            const logs = result.logs || [];

            logs.push({
                message: logEntry,
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

    // アイコンを更新
    async updateIcon(status) {
        try {
            // 現在はタイトルのみ更新（アイコンファイルが用意されるまで）
            let title;

            if (status === 'running') {
                title = 'Auto Tab Switcher - 実行中';
            } else {
                title = 'Auto Tab Switcher - 停止中';
            }

            await chrome.action.setTitle({ title: title });

            // console.log(`アイコン更新: ${status}`);

            // アイコンを切り替えてステータスを視覚的に表示
            let iconPath;
            if (status === 'running') {
                iconPath = {
                    16: 'icons/icon-running-16.png',
                    32: 'icons/icon-running-32.png',
                    48: 'icons/icon-running-48.png',
                    128: 'icons/icon-running-128.png'
                };
            } else {
                iconPath = {
                    16: 'icons/icon-stopped-16.png',
                    32: 'icons/icon-stopped-32.png',
                    48: 'icons/icon-stopped-48.png',
                    128: 'icons/icon-stopped-128.png'
                };
            }
            await chrome.action.setIcon({ path: iconPath });
        } catch (error) {
            console.error('アイコン更新エラー:', error);
        }
    }

    // スリープ関数
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// サービスワーカーの初期化
console.log('TabSwitcher Background Script 開始');
const tabSwitcher = new TabSwitcherBackground();