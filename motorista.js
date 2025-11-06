let map;
let userLocation = null;
let isTracking = false;
let isOnline = false;
let currentRequest = null;
let countdownInterval = null;

// Inicializar mapa
function initMap() {
    const lisbon = { lat: 38.7223, lng: -9.1393 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: lisbon,
        zoom: 13,
        styles: [
            {
                "featureType": "all",
                "elementType": "geometry.fill",
                "stylers": [{ "weight": "2.00" }]
            },
            {
                "featureType": "all",
                "elementType": "geometry.stroke",
                "stylers": [{ "color": "#9c9c9c" }]
            },
            {
                "featureType": "landscape",
                "elementType": "all",
                "stylers": [{ "color": "#f2f2f2" }]
            },
            {
                "featureType": "road",
                "elementType": "all",
                "stylers": [
                    { "saturation": -100 },
                    { "lightness": 45 }
                ]
            }
        ]
    });

    // Obter localização do usuário
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(userLocation);
            },
            () => {
                userLocation = lisbon;
            }
        );
    } else {
        userLocation = lisbon;
    }

    checkLoginStatus();
}

function checkLoginStatus() {
    if (!currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
    } else {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('driver-panel').style.display = 'block';
        document.getElementById('driver-name').textContent = `Bem-vindo, ${currentUser.name}`;
        document.getElementById('logout-btn').style.display = 'block';
    }
}

function goOnline() {
    if (currentUser) {
        isOnline = true;
        if (firebaseInitialized) {
            rtdb.ref(`drivers/${currentUser.uid}`).update({
                isOnline: true,
                name: currentUser.displayName || 'Motorista',
                location: userLocation
            });
        }
        
        document.getElementById('online-btn').style.display = 'none';
        document.getElementById('offline-btn').style.display = 'block';
        document.getElementById('driver-status').textContent = 'Status: Online';
        document.getElementById('driver-status').className = 'status-online';
        
        listenForRequests();
    }
}

function goOffline() {
    if (currentUser) {
        isOnline = false;
        if (firebaseInitialized) {
            rtdb.ref(`drivers/${currentUser.uid}`).update({
                isOnline: false
            });
        }
        
        document.getElementById('online-btn').style.display = 'block';
        document.getElementById('offline-btn').style.display = 'none';
        document.getElementById('driver-status').textContent = 'Status: Offline';
        document.getElementById('driver-status').className = 'status-offline';
        
        stopTracking();
    }
}

function startTracking() {
    isTracking = true;
    updateDriverLocation();
    document.getElementById('tracking-btn').textContent = 'Rastreamento Ativo';
    document.getElementById('tracking-btn').style.backgroundColor = '#4CAF50';
}

function stopTracking() {
    isTracking = false;
    document.getElementById('tracking-btn').textContent = 'Iniciar Rastreamento';
    document.getElementById('tracking-btn').style.backgroundColor = '#2196F3';
}

function updateDriverLocation() {
    if (navigator.geolocation && isTracking && isOnline && currentUser) {
        navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                userLocation = location;
                
                if (firebaseInitialized) {
                    rtdb.ref(`drivers/${currentUser.uid}`).update({
                        location: location,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            },
            (error) => {
                console.error('Erro ao obter localização:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
}

function listenForRequests() {
    if (!firebaseInitialized) return;
    
    rtdb.ref('rideRequests').on('child_added', (snapshot) => {
        const request = snapshot.val();
        if (request.status === 'pending') {
            showRequestNotification(request, snapshot.key);
        }
    });
}

function showRequestNotification(request, requestId) {
    currentRequest = { id: requestId, ...request };
    
    document.getElementById('request-info').innerHTML = `
        <p><strong>De:</strong> ${request.pickup}</p>
        <p><strong>Para:</strong> ${request.destination}</p>
        <p><strong>Passageiros:</strong> ${request.passengers}</p>
        <p><strong>Contato:</strong> ${request.contact}</p>
    `;
    
    document.getElementById('request-notification').style.display = 'block';
    
    let countdown = 60;
    countdownInterval = setInterval(() => {
        countdown--;
        document.getElementById('countdown').textContent = countdown + 's';
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            rejectRequest();
        }
    }, 1000);
}

function acceptRequest() {
    if (currentRequest && firebaseInitialized) {
        clearInterval(countdownInterval);
        
        rtdb.ref(`rideRequests/${currentRequest.id}`).update({
            status: 'accepted',
            driverId: currentUser.uid,
            driverName: currentUser.name
        });
        
        document.getElementById('request-notification').style.display = 'none';
        alert('Você aceitou a corrida! Entre em contato com o cliente.');
    }
}

function rejectRequest() {
    if (currentRequest && firebaseInitialized) {
        clearInterval(countdownInterval);
        
        rtdb.ref(`rideRequests/${currentRequest.id}`).update({
            status: 'rejected'
        });
        
        document.getElementById('request-notification').style.display = 'none';
        currentRequest = null;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        loginUser(username, password, 'driver')
            .then((user) => {
                document.getElementById('login-modal').style.display = 'none';
                document.getElementById('driver-panel').style.display = 'block';
                document.getElementById('driver-name').textContent = `Bem-vindo, ${user.name}`;
                document.getElementById('logout-btn').style.display = 'block';
            })
            .catch((error) => {
                alert(error);
            });
    });
    
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('online-btn').addEventListener('click', goOnline);
    document.getElementById('offline-btn').addEventListener('click', goOffline);
    document.getElementById('tracking-btn').addEventListener('click', startTracking);
    document.getElementById('accept-btn').addEventListener('click', acceptRequest);
    document.getElementById('reject-btn').addEventListener('click', rejectRequest);
});