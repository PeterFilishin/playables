// mraid-simulator.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)

// --- Настройки симулятора ---
let currentVolume = 100;
let currentState = 'default';
let currentPlayableUrl = ''; // Будет хранить URL текущего плейбла

// --- Фейковый MRAID.js, который мы будем внедрять ---
// Этот код будет выполнен ВНУТРИ плейбла
const MRAID_JS_SOURCE = `
(function() {
    if (window.mraid) {
        console.warn('MRAID-SIM: MRAID object already exists. Aborting injection.');
        return;
    }
    console.log('MRAID-SIM: Injecting fake MRAID v3.0...');

    window.mraid = {
        _state: 'loading',
        _volume: 1.0, // Громкость от 0.0 до 1.0
        _listeners: {},

        getVersion: function() { return '3.0'; },
        getState: function() { return this._state; },
        
        // MRAID 3.0 использует getAudioVolume, а не getVolume. Добавим оба для совместимости.
        getVolume: function() { return this._volume; },
        getAudioVolume: function() { return this._volume; },

        isViewable: function() {
            // Для симулятора просто считаем, что всегда видно, если не hidden
            return this._state !== 'hidden';
        },

        supports: function(feature) {
            console.log('MRAID-SIM: ad queries support for "' + feature + '"');
            return ['sms', 'tel', 'inlineVideo'].includes(feature);
        },

        addEventListener: function(event, callback) {
            console.log('MRAID-SIM: ad registered listener for "' + event + '"');
            if (!this._listeners[event]) {
                this._listeners[event] = [];
            }
            this._listeners[event].push(callback);
        },

        removeEventListener: function(event, callback) {
            if (!this._listeners[event]) return;
            if (callback) {
                this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
            } else {
                this._listeners[event] = [];
            }
        },

        _fireEvent: function(event, ...args) {
            console.log('%cMRAID-SIM: Firing event -> ' + event, 'color: blue; font-weight: bold', ...args);
            const listeners = this._listeners[event];
            if (listeners) {
                listeners.forEach(callback => {
                    try {
                        callback(...args);
                    } catch (e) {
                        console.error('MRAID-SIM: Error in event listener for "' + event + '":', e);
                    }
                });
            }
        },

        open: function(url) {
            console.log('MRAID-SIM: open("' + url + '")');
            window.open(url, '_blank');
        },

        close: function() {
            console.log('MRAID-SIM: close()');
            this._setState(this._state === 'expanded' ? 'default' : 'hidden');
        },

        _setState: function(newState) {
            if (this._state !== newState) {
                this._state = newState;
                this._fireEvent('stateChange', this._state);
            }
        }
    };

    // Слушаем команды от родителя-симулятора
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'mraid_event_from_simulator') {
            const { event, args } = e.data;
            if (event === 'audioVolumeChange') {
                window.mraid._volume = args[0];
            } else if (event === 'stateChange') {
                window.mraid._state = args[0];
            }
            window.mraid._fireEvent(event, ...args);
        }
    });

    // После небольшой задержки, чтобы плейбл успел подписаться, отправляем 'ready'
    setTimeout(() => {
        console.log('MRAID-SIM: Firing initial events.');
        window.mraid._setState('default');
        window.mraid._fireEvent('ready');
        window.mraid._fireEvent('viewableChange', window.mraid.isViewable());
        // Отправляем начальное значение громкости
        window.mraid._fireEvent('audioVolumeChange', window.mraid.getAudioVolume());
    }, 100);

})();
`;

// --- Логика самого симулятора ---

function log(message) {
    const logEl = document.getElementById('log');
    logEl.innerHTML += `[${new Date().toLocaleTimeString()}] ${message}\n`;
    logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
    document.getElementById('log').innerHTML = '';
}

// Отправка событий в iframe
function sendEventToAd(eventName, ...args) {
    const adFrame = document.getElementById('adFrame');
    if (adFrame && adFrame.contentWindow) {
        adFrame.contentWindow.postMessage({
            type: 'mraid_event_from_simulator',
            event: eventName,
            args: args
        }, '*');
        log(`📤 Sent event: ${eventName} with args: ${JSON.stringify(args)}`);
    } else {
        log(`❌ Could not send event. Iframe not ready.`);
    }
}

// Управление громкостью
function setVolume(volumePercent) {
    currentVolume = volumePercent;
    document.getElementById('volumeDisplay').textContent = `Volume: ${volumePercent}%`;
    const volumeDecimal = volumePercent / 100.0;
    sendEventToAd('audioVolumeChange', volumeDecimal);
}

// Управление состоянием
function setState(state) {
    currentState = state;
    document.getElementById('stateDisplay').textContent = `State: ${state}`;
    sendEventToAd('stateChange', state);
    sendEventToAd('viewableChange', state !== 'hidden');
}

// Главная функция загрузки плейбла
async function loadPlayable() {
    const urlInput = document.getElementById('playableUrl');
    const url = urlInput.value.trim();
    if (!url) {
        alert('Please enter a playable URL');
        return;
    }

    log(`🚀 Starting to load playable from: ${url}`);
    currentPlayableUrl = url;
    const adFrame = document.getElementById('adFrame');

    try {
        // 1. Загружаем HTML плейбла как текст
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let htmlContent = await response.text();
        log('✅ Playable HTML fetched successfully.');

        // 2. Заменяем <script src="mraid.js"></script> на наш фейковый код
        const mraidScriptTag = `<script>${MRAID_JS_SOURCE}<\/script>`;
        const regex = /<script\s+.*src\s*=\s*['"]mraid\.js['"]\s*><\/script>/i;
        
        if (regex.test(htmlContent)) {
            htmlContent = htmlContent.replace(regex, mraidScriptTag);
            log('✅ Injected fake MRAID script.');
        } else {
            log('⚠️ Warning: <script src="mraid.js"></script> not found. Appending script to head.');
            // Если тег не найден, просто добавляем наш скрипт в <head>
            htmlContent = htmlContent.replace('</head>', `${mraidScriptTag}</head>`);
        }
        
        // 3. Загружаем измененный HTML в iframe
        adFrame.srcdoc = htmlContent;
        log('🎉 Playable loaded into iframe.');

    } catch (error) {
        log(`❌❌❌ FAILED TO LOAD PLAYABLE: ${error.message}`);
        log('👉 Please ensure you are running a local web server (not using file://).');
        adFrame.srcdoc = `<div style="padding: 20px; color: red;"><h1>Error</h1><p>${error.message}</p><p>You must run this simulator from a local web server (like VS Code Live Server or 'python -m http.server') to load the playable.</p></div>`;
    }
}

function reloadCurrentAd() {
    if (currentPlayableUrl) {
        loadPlayable();
    } else {
        log('No playable URL to reload. Load one first.');
    }
}

// Инициализация при загрузке страницы
window.addEventListener('load', function() {
    log('MRAID Simulator ready.');
    const urlInput = document.getElementById('playableUrl');
    // Укажите здесь путь по умолчанию к вашему плейблу
    urlInput.value = 'pl.html'; // Убедитесь, что файл лежит рядом
    // Для первого раза ничего не загружаем, пусть пользователь нажмет кнопку
});