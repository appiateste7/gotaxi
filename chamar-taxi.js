let map;
let userLocation = null;
let userMarker = null;
let pickupAutocomplete;
let destinationAutocomplete;

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
                
                userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: 'Sua localização',
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10" cy="10" r="8" fill="#4285F4" stroke="white" stroke-width="2"/>
                            </svg>
                        `),
                        scaledSize: new google.maps.Size(20, 20)
                    }
                });
            },
            () => {
                userLocation = lisbon;
            }
        );
    } else {
        userLocation = lisbon;
    }

    // Inicializar autocomplete
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    
    pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput);
    destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);
    
    // Usar localização atual como padrão para pickup
    if (userLocation) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: userLocation }, (results, status) => {
            if (status === 'OK' && results[0]) {
                pickupInput.value = results[0].formatted_address;
            }
        });
    }

    checkLoginStatus();
}

function checkLoginStatus() {
    if (!currentUser) {
        document.getElementById('login-modal').style.display = 'flex';
    } else {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'block';
    }
}

function submitTaxiRequest() {
    const formData = {
        name: document.getElementById('name').value,
        pickup: document.getElementById('pickup').value,
        destination: document.getElementById('destination').value,
        passengers: document.getElementById('passengers').value,
        contact: document.getElementById('contact').value,
        time: document.querySelector('input[name="time"]:checked').value,
        payment: document.getElementById('payment').value,
        notes: document.getElementById('notes').value,
        status: 'pending',
        timestamp: new Date().toISOString()
    };

    if (firebaseInitialized) {
        const requestRef = rtdb.ref('rideRequests').push();
        requestRef.set(formData)
            .then(() => {
                document.getElementById('form-modal').style.display = 'none';
                listenForDriverResponse(requestRef.key);
            })
            .catch((error) => {
                alert('Erro ao enviar solicitação: ' + error.message);
            });
    } else {
        // Modo de demonstração
        document.getElementById('form-modal').style.display = 'none';
        document.getElementById('confirmation-message').style.display = 'block';
        document.getElementById('driver-info').textContent = 'Motorista Mega está a caminho. Chega em 5 minutos.';
    }
}

function listenForDriverResponse(requestId) {
    if (!firebaseInitialized) return;
    
    rtdb.ref(`rideRequests/${requestId}`).on('value', (snapshot) => {
        const request = snapshot.val();
        if (request.status === 'accepted') {
            document.getElementById('confirmation-message').style.display = 'block';
            document.getElementById('driver-info').textContent = `Motorista ${request.driverName} está a caminho. Chega em ${request.time}.`;
        } else if (request.status === 'rejected') {
            alert('Desculpe, nenhum motorista disponível no momento. Tente novamente.');
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    document.getElementById('call-taxi-btn').addEventListener('click', () => {
        if (currentUser) {
            document.getElementById('form-modal').style.display = 'flex';
        } else {
            alert('Por favor, faça login primeiro.');
        }
    });
    
    document.getElementById('close-form-btn').addEventListener('click', () => {
        document.getElementById('form-modal').style.display = 'none';
    });
    
    document.getElementById('submit-form-btn').addEventListener('click', submitTaxiRequest);
    
    document.getElementById('close-confirmation-btn').addEventListener('click', () => {
        document.getElementById('confirmation-message').style.display = 'none';
    });
    
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        loginUser(username, password, 'client')
            .then((user) => {
                document.getElementById('login-modal').style.display = 'none';
                document.getElementById('logout-btn').style.display = 'block';
            })
            .catch((error) => {
                alert(error);
            });
    });
    
    document.getElementById('logout-btn').addEventListener('click', logout);
});

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('form-modal')) {
        document.getElementById('form-modal').style.display = 'none';
    }
});