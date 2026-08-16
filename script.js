// ==========================================================================
// REAL-TIME CRYPTO DASHBOARD - SCRIPT.JS
// ==========================================================================
const uiElements = {
    btc: { 
        price: document.getElementById('price-btc'), 
        change: document.getElementById('change-btc') 
    },
    eth: { 
        price: document.getElementById('price-eth'), 
        change: document.getElementById('change-eth') 
    },
    sol: { 
        price: document.getElementById('price-sol'), 
        change: document.getElementById('change-sol') 
    }
};

const tradesBody = document.getElementById('trades-tbody');
const statusDot = document.getElementById('connection-dot');
const statusText = document.getElementById('connection-text');
const marketDataBuffer = {
    btc: { price: null, change: null, lastRenderedPrice: null },
    eth: { price: null, change: null, lastRenderedPrice: null },
    sol: { price: null, change: null, lastRenderedPrice: null }
};

let ws = null;
function connectWebSocket() {
    const streams = [
        'btcusdt@ticker',
        'ethusdt@ticker',
        'solusdt@ticker',
        'btcusdt@trade'
    ].join('/');

    ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onopen = () => {
        if (statusDot) {
            statusDot.innerText = '[ LIVE ]';
            statusDot.style.color = 'var(--up-green, #10b981)';
        }
        if (statusText) {
            statusText.innerText = 'Connected to Binance Stream';
        }
    };

    ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        const streamName = payload.stream;
        const data = payload.data;

        if (streamName.includes('@ticker')) {
            handleTickerData(streamName, data);
        } else if (streamName === 'btcusdt@trade') {
            handleTradeData(data);
        }
    };

    ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        updateStatusDisconnected('Connection Error');
    };

    ws.onclose = () => {
        updateStatusDisconnected('Disconnected - Reconnecting in 3s...');
        
        setTimeout(connectWebSocket, 3000);
    };
}

function updateStatusDisconnected(message) {
    if (statusDot) {
        statusDot.innerText = '[ OFF ]';
        statusDot.style.color = 'var(--down-red, #ef4444)';
    }
    if (statusText) {
        statusText.innerText = message;
    }
}

function handleTickerData(streamName, data) {
    let symbol;
    if (streamName.startsWith('btc')) symbol = 'btc';
    else if (streamName.startsWith('eth')) symbol = 'eth';
    else if (streamName.startsWith('sol')) symbol = 'sol';

    if (symbol && marketDataBuffer[symbol]) {
        marketDataBuffer[symbol].price = parseFloat(data.c); 
        marketDataBuffer[symbol].change = parseFloat(data.P); 
    }
}

function handleTradeData(data) {
    if (!tradesBody) return;

    const price = parseFloat(data.p).toFixed(2);
    const amount = parseFloat(data.q).toFixed(4);
    const isBuyerMaker = data.m; 
    const time = new Date(data.T).toLocaleTimeString('en-US', { 
        hour12: false, 
        fractionalSecondDigits: 2 
    });

    const typeLabel = isBuyerMaker ? 'SELL' : 'BUY';
    const typeColor = isBuyerMaker ? 'var(--down-red, #ef4444)' : 'var(--up-green, #10b981)';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${time}</td>
        <td style="color: ${typeColor}; font-weight: bold;">${price}</td>
        <td>${amount}</td>
        <td style="color: ${typeColor};">${typeLabel}</td>
    `;

    tradesBody.prepend(tr);

    if (tradesBody.children.length > 15) {
        tradesBody.removeChild(tradesBody.lastChild);
    }
}

setInterval(() => {
    ['btc', 'eth', 'sol'].forEach(symbol => {
        const data = marketDataBuffer[symbol];
        const ui = uiElements[symbol];

        if (data.price !== null && data.price !== data.lastRenderedPrice && ui.price) {
            
            // Format price with commas & 2 decimal places
            ui.price.innerText = '$' + data.price.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
            
            // Green/Red flash animation based on price movement
            if (data.lastRenderedPrice) {
                ui.price.style.color = data.price > data.lastRenderedPrice 
                    ? 'var(--up-green, #10b981)' 
                    : 'var(--down-red, #ef4444)';

                setTimeout(() => {
                    if (ui.price) ui.price.style.color = 'var(--text-primary, #ffffff)';
                }, 300);
            }

            // Update 24h percentage change
            if (ui.change) {
                const changePrefix = data.change >= 0 ? '+' : '';
                ui.change.innerText = `24h: ${changePrefix}${data.change.toFixed(2)}%`;
                ui.change.style.color = data.change >= 0 
                    ? 'var(--up-green, #10b981)' 
                    : 'var(--down-red, #ef4444)';
            }

            data.lastRenderedPrice = data.price;
        }
    });
}, 500);

// --- 6. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
});