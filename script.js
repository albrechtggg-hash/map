document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const getLocBtn = document.getElementById('get-location-btn');
    const startWalkBtn = document.getElementById('start-walk-btn');
    const endWalkBtn = document.getElementById('end-walk-btn');
    const dashboard = document.getElementById('walk-dashboard');
    const mapContainer = document.getElementById('map-container');
    const displayArea = document.getElementById('display-area');
    
    const latElement = document.getElementById('latitude');
    const lngElement = document.getElementById('longitude');
    const accElement = document.getElementById('accuracy');
    const timeElement = document.getElementById('elapsed-time');
    const distElement = document.getElementById('total-distance');

    // State Variables
    let map = null;
    let marker = null;
    let polyline = null;
    let watchId = null;
    let startTime = null;
    let timerId = null;
    let routeCoords = [];
    let totalDistance = 0;

    // --- Helper Functions ---

    function initMap(lat, lng) {
        if (map === null) {
            mapContainer.classList.remove('hidden');
            map = L.map('map').setView([lat, lng], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(map);
            marker = L.marker([lat, lng]).addTo(map);
            polyline = L.polyline([], { color: 'red', weight: 5 }).addTo(map);
        } else {
            map.setView([lat, lng]);
            marker.setLatLng([lat, lng]);
        }
        setTimeout(() => map.invalidateSize(), 100);
    }

    function updateDashboard(latitude, longitude, accuracy) {
        latElement.textContent = latitude.toFixed(6);
        lngElement.textContent = longitude.toFixed(6);
        accElement.textContent = `${Math.round(accuracy)}m`;
        displayArea.classList.remove('hidden');
    }

    function calculateDistance(newLat, newLng) {
        if (routeCoords.length < 2) return 0;
        const last = routeCoords[routeCoords.length - 2];
        const current = L.latLng(newLat, newLng);
        const prev = L.latLng(last[0], last[1]);
        return prev.distanceTo(current);
    }

    function startTimer() {
        startTime = Date.now();
        timerId = setInterval(() => {
            const diff = Date.now() - startTime;
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            timeElement.textContent = `${h}:${m}:${s}`;
        }, 1000);
    }

    function saveToLocalStorage() {
        localStorage.setItem('walklog_current_route', JSON.stringify(routeCoords));
        localStorage.setItem('walklog_total_distance', totalDistance);
    }

    // --- Event Handlers ---

    // 1. One-time Location Check
    getLocBtn.addEventListener('click', () => {
        if (!navigator.geolocation) return alert('GPS非対応です');
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            initMap(latitude, longitude);
            updateDashboard(latitude, longitude, accuracy);
        }, (err) => alert('取得失敗: ' + err.message));
    });

    // 2. Start Walk
    startWalkBtn.addEventListener('click', () => {
        if (!navigator.geolocation) return alert('GPS非対応です');

        // Reset State
        routeCoords = [];
        totalDistance = 0;
        distElement.textContent = '0 メートル';
        timeElement.textContent = '00:00:00';
        if (polyline) polyline.setLatLngs([]);
        
        dashboard.classList.remove('hidden');
        startWalkBtn.classList.add('hidden');
        endWalkBtn.classList.remove('hidden');
        getLocBtn.classList.add('hidden');

        startTimer();

        watchId = navigator.geolocation.watchPosition((pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            
            // 精度が極端に悪い場合はスキップ（ノイズ対策）
            if (accuracy > 50) return;

            initMap(latitude, longitude);
            updateDashboard(latitude, longitude, accuracy);

            const newCoord = [latitude, longitude];
            routeCoords.push(newCoord);
            polyline.addLatLng(newCoord);

            // 距離計算
            if (routeCoords.length > 1) {
                totalDistance += calculateDistance(latitude, longitude);
                distElement.textContent = `${Math.round(totalDistance)} メートル`;
            }

            saveToLocalStorage();
        }, (err) => console.error(err), {
            enableHighAccuracy: true,
            maximumAge: 0
        });
    });

    // 3. End Walk
    endWalkBtn.addEventListener('click', () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
        if (timerId) clearInterval(timerId);

        startWalkBtn.classList.remove('hidden');
        endWalkBtn.classList.add('hidden');
        getLocBtn.classList.remove('hidden');

        // 全ルートが表示されるように調整
        if (polyline && routeCoords.length > 0) {
            map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        }

        alert('散歩を終了しました！お疲れ様でした。');
    });
});
