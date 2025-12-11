// Sistema de armazenamento local para motoristas
const DRIVERS_STORAGE_KEY = 'gotaxi_drivers';
const CURRENT_DRIVER_KEY = 'gotaxi_current_driver';
const DRIVER_STATS_KEY = 'gotaxi_driver_stats';

// Sistema de movimento suave
class SmoothMovementSystem {
    constructor() {
        this.cars = new Map();
        this.animationId = null;
        this.isAnimating = false;
    }

    updateCarPosition(carId, newPosition, newHeading) {
        if (!this.cars.has(carId)) {
            this.cars.set(carId, {
                marker: this.createCarMarker(newPosition, newHeading),
                currentPos: newPosition,
                targetPos: newPosition,
                currentHeading: newHeading,
                targetHeading: newHeading,
                startTime: Date.now(),
                duration: 0,
                lastUpdate: Date.now()
            });
        } else {
            const car = this.cars.get(carId);
            
            const distance = this.calculateDistance(car.currentPos, newPosition);
            const timeDiff = Date.now() - car.lastUpdate;
            const expectedDuration = this.calculateDuration(distance, timeDiff);
            
            car.currentPos = car.marker.getPosition();
            car.targetPos = newPosition;
            car.currentHeading = this.getCarRotation(car.marker);
            car.targetHeading = newHeading;
            car.startTime = Date.now();
            car.duration = Math.max(1000, Math.min(5000, expectedDuration));
            car.lastUpdate = Date.now();
        }

        if (!this.isAnimating) {
            this.startAnimationLoop();
        }
    }

    createCarMarker(position, heading) {
        return new google.maps.Marker({
            position: position,
            map: map,
            title: "Motorista",
            icon: {
                url: "https://i.postimg.cc/d37TyxgN/Screenshot-7-removebg-preview-(1).png",
                scaledSize: new google.maps.Size(50, 70),
                anchor: new google.maps.Point(25, 35),
                rotation: heading
            }
        });
    }

    getCarRotation(marker) {
        return marker.getIcon().rotation || 0;
    }

    startAnimationLoop() {
        this.isAnimating = true;
        
        const animate = () => {
            const currentTime = Date.now();
            let hasActiveAnimations = false;

            this.cars.forEach((car, carId) => {
                const elapsed = currentTime - car.startTime;
                let progress = Math.min(elapsed / car.duration, 1);

                if (progress < 1) {
                    hasActiveAnimations = true;
                    
                    progress = this.easeInOutCubic(progress);
                    
                    const newPos = this.interpolatePosition(
                        car.currentPos, 
                        car.targetPos, 
                        progress
                    );
                    
                    const newHeading = this.interpolateHeading(
                        car.currentHeading,
                        car.targetHeading,
                        progress
                    );
                    
                    car.marker.setPosition(newPos);
                    car.marker.setIcon({
                        url: "https://i.postimg.cc/d37TyxgN/Screenshot-7-removebg-preview-(1).png",
                        scaledSize: new google.maps.Size(50, 70),
                        anchor: new google.maps.Point(25, 35),
                        rotation: newHeading
                    });
                    
                    car.currentHeading = newHeading;
                } else {
                    car.marker.setPosition(car.targetPos);
                    car.marker.setIcon({
                        url: "https://i.postimg.cc/d37TyxgN/Screenshot-7-removebg-preview-(1).png",
                        scaledSize: new google.maps.Size(50, 70),
                        anchor: new google.maps.Point(25, 35),
                        rotation: car.targetHeading
                    });
                    
                    car.currentHeading = car.targetHeading;
                }
            });

            if (hasActiveAnimations) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };

        this.animationId = requestAnimationFrame(animate);
    }

    interpolatePosition(start, end, progress) {
        const lat1 = typeof start.lat === 'function' ? start.lat() : start.lat;
        const lng1 = typeof start.lng === 'function' ? start.lng() : start.lng;
        const lat2 = typeof end.lat === 'function' ? end.lat() : end.lat;
        const lng2 = typeof end.lng === 'function' ? end.lng() : end.lng;
        
        return {
            lat: lat1 + (lat2 - lat1) * progress,
            lng: lng1 + (lng2 - lng1) * progress
        };
    }

    interpolateHeading(start, end, progress) {
        let diff = end - start;
        if (Math.abs(diff) > 180) {
            diff = diff > 0 ? diff - 360 : diff + 360;
        }
        return start + diff * progress;
    }

    calculateDistance(pos1, pos2) {
        const lat1 = typeof pos1.lat === 'function' ? pos1.lat() : pos1.lat;
        const lng1 = typeof pos1.lng === 'function' ? pos1.lng() : pos1.lng;
        const lat2 = typeof pos2.lat === 'function' ? pos2.lat() : pos2.lat;
        const lng2 = typeof pos2.lng === 'function' ? pos2.lng() : pos2.lng;
        
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateDuration(distance, timeDiff) {
        const averageSpeed = 8.33;
        const expectedTime = distance / averageSpeed * 1000;
        return Math.max(expectedTime, timeDiff * 1.2);
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    removeCar(carId) {
        if (this.cars.has(carId)) {
            const car = this.cars.get(carId);
            car.marker.setMap(null);
            this.cars.delete(carId);
        }
    }

    clearAll() {
        this.cars.forEach(car => car.marker.setMap(null));
        this.cars.clear();
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Variáveis globais
let map;
let driverMarker;
let currentLocation;
let currentDriver = null;
let isOnline = false;
let smoothMovement;
let currentRideRequest = null;
let rideTimer = null;
let rideTimerSeconds = 120;
let watchPositionId = null;
let directionRenderer = null;

// Inicializar sistema de armazenamento
function initializeDriversStorage() {
    if (!localStorage.getItem(DRIVERS_STORAGE_KEY)) {
        localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify({}));
    }
    if (!localStorage.getItem(DRIVER_STATS_KEY)) {
        localStorage.setItem(DRIVER_STATS_KEY, JSON.stringify({}));
    }
}

// Obter todos os motoristas
function getAllDrivers() {
    const drivers = localStorage.getItem(DRIVERS_STORAGE_KEY);
    return drivers ? JSON.parse(drivers) : {};
}

// Salvar motorista
function saveDriver(driverData) {
    const drivers = getAllDrivers();
    drivers[driverData.driverId] = driverData;
    localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
    return true;
}

// Verificar se motorista já existe
function driverExists(username) {
    const drivers = getAllDrivers();
    for (const driverId in drivers) {
        const driver = drivers[driverId];
        if (driver.username === username) {
            return true;
        }
    }
    return false;
}

// Salvar motorista atual
function saveCurrentDriver(driver) {
    localStorage.setItem(CURRENT_DRIVER_KEY, JSON.stringify(driver));
}

// Obter motorista atual
function getCurrentDriver() {
    const driver = localStorage.getItem(CURRENT_DRIVER_KEY);
    return driver ? JSON.parse(driver) : null;
}

// Remover motorista atual
function removeCurrentDriver() {
    localStorage.removeItem(CURRENT_DRIVER_KEY);
}

// Obter estatísticas do motorista
function getDriverStats(driverId) {
    const stats = localStorage.getItem(DRIVER_STATS_KEY);
    const allStats = stats ? JSON.parse(stats) : {};
    
    if (!allStats[driverId]) {
        allStats[driverId] = {
            totalRides: 0,
            totalEarnings: 0,
            rating: 5.0,
            lastReset: new Date().toDateString()
        };
        localStorage.setItem(DRIVER_STATS_KEY, JSON.stringify(allStats));
    }
    
    // Verificar se é um novo dia
    const today = new Date().toDateString();
    if (allStats[driverId].lastReset !== today) {
        allStats[driverId].totalRides = 0;
        allStats[driverId].totalEarnings = 0;
        allStats[driverId].lastReset = today;
        localStorage.setItem(DRIVER_STATS_KEY, JSON.stringify(allStats));
    }
    
    return allStats[driverId];
}

// Atualizar estatísticas
function updateDriverStats(driverId, earnings = 0) {
    const stats = getDriverStats(driverId);
    stats.totalRides++;
    stats.totalEarnings += earnings;
    
    const allStats = JSON.parse(localStorage.getItem(DRIVER_STATS_KEY) || '{}');
    allStats[driverId] = stats;
    localStorage.setItem(DRIVER_STATS_KEY, JSON.stringify(allStats));
    
    return stats;
}

// Mostrar notificação
function showNotification(title, message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icons[type]}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.4s forwards';
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, 400);
    });
    
    container.appendChild(notification);
    
    if (duration > 0) {
        setTimeout(() => {
            if (container.contains(notification)) {
                notification.style.animation = 'slideOut 0.4s forwards';
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 400);
            }
        }, duration);
    }
    
    return notification;
}

// Atualizar informações do motorista na interface
function updateDriverInfo() {
    if (!currentDriver) return;
    
    document.getElementById('driverNameDisplay').textContent = currentDriver.name;
    document.getElementById('driverPlateDisplay').textContent = currentDriver.licensePlate || 'Não informada';
    
    document.getElementById('infoName').textContent = currentDriver.name || '-';
    document.getElementById('infoPlate').textContent = currentDriver.licensePlate || '-';
    document.getElementById('infoPhone').textContent = currentDriver.phone || '-';
    document.getElementById('infoUsername').textContent = currentDriver.username || '-';
    
    // Atualizar avatar com iniciais
    const avatar = document.getElementById('driverAvatar');
    if (currentDriver.name) {
        const initials = currentDriver.name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        avatar.innerHTML = initials;
        avatar.style.fontSize = '20px';
    }
    
    // Atualizar estatísticas
    const stats = getDriverStats(currentDriver.driverId);
    document.getElementById('totalRides').textContent = stats.totalRides;
    document.getElementById('totalEarnings').textContent = `€${stats.totalEarnings.toFixed(2)}`;
    document.getElementById('rating').textContent = stats.rating.toFixed(1);
}

// Alternar painel do motorista
function toggleDriverPanel() {
    const panel = document.getElementById('driverPanel');
    const btn = document.getElementById('userProfileBtn');
    
    if (!currentDriver) {
        showAuthModal();
        return;
    }
    
    panel.classList.toggle('active');
    btn.classList.toggle('active');
    
    if (panel.classList.contains('active')) {
        updateDriverInfo();
    }
}

// Mostrar modal de autenticação
function showAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.add('active');
}

// Esconder modal de autenticação
function hideAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    document.getElementById('loginError').textContent = '';
}

// Login do motorista
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    errorElement.style.display = 'none';
    
    if (!username || !password) {
        errorElement.textContent = 'Por favor, preencha todos os campos';
        errorElement.style.display = 'block';
        return;
    }
    
    const drivers = getAllDrivers();
    let loginSuccess = false;
    let driverData = null;
    
    for (const driverId in drivers) {
        const driver = drivers[driverId];
        if (driver.username === username && driver.password === password) {
            loginSuccess = true;
            driverData = driver;
            break;
        }
    }
    
    if (loginSuccess) {
        currentDriver = driverData;
        saveCurrentDriver(currentDriver);
        hideAuthModal();
        updateDriverInfo();
        updateDriverStatusUI();
        showNotification('Login Bem-sucedido', `Bem-vindo, ${currentDriver.name}!`, 'success');
        
        // Limpar campos
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    } else {
        errorElement.textContent = 'Usuário ou senha incorretos';
        errorElement.style.display = 'block';
    }
}

// Logout
function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        if (isOnline) {
            stopTracking();
        }
        
        removeCurrentDriver();
        currentDriver = null;
        
        document.getElementById('driverPanel').classList.remove('active');
        document.getElementById('userProfileBtn').classList.remove('active');
        updateDriverStatusUI();
        
        showNotification('Logout', 'Você saiu da sua conta', 'info');
        
        // Mostrar tela de login
        showAuthModal();
    }
}

// Atualizar UI do status
function updateDriverStatusUI() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const startBtn = document.getElementById('startTrackingBtn');
    const stopBtn = document.getElementById('stopTrackingBtn');
    
    if (currentDriver) {
        if (isOnline) {
            statusDot.classList.add('online');
            statusText.textContent = 'Online';
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            statusDot.classList.remove('online');
            statusText.textContent = 'Offline';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
        document.getElementById('userProfileBtn').style.display = 'flex';
    } else {
        statusDot.classList.remove('online');
        statusText.textContent = 'Offline';
        startBtn.disabled = true;
        stopBtn.disabled = true;
        document.getElementById('userProfileBtn').style.display = 'none';
    }
}

// Editar campo do motorista
function editDriverField(field) {
    const infoValue = document.getElementById(`info${field.charAt(0).toUpperCase() + field.slice(1)}`);
    const value = infoValue.textContent;
    
    // Criar formulário de edição
    const form = document.createElement('div');
    form.className = 'edit-form active';
    
    let inputType = 'text';
    let placeholder = '';
    
    switch(field) {
        case 'name':
            placeholder = 'Digite seu nome completo';
            break;
        case 'plate':
            placeholder = 'Digite a matrícula do veículo';
            break;
        case 'phone':
            placeholder = 'Digite seu telefone';
            inputType = 'tel';
            break;
        case 'username':
            placeholder = 'Digite seu nome de usuário';
            break;
        case 'password':
            placeholder = 'Digite sua nova senha';
            inputType = 'password';
            break;
    }
    
    form.innerHTML = `
        <input type="${inputType}" class="edit-input" placeholder="${placeholder}" value="${value === '-' ? '' : value}">
        <div class="form-actions">
            <button class="save-btn">Salvar</button>
            <button class="cancel-btn">Cancelar</button>
        </div>
    `;
    
    // Inserir após o item de informação
    infoValue.parentElement.parentElement.appendChild(form);
    
    // Focar no input
    form.querySelector('.edit-input').focus();
    
    // Configurar eventos
    const saveBtn = form.querySelector('.save-btn');
    const cancelBtn = form.querySelector('.cancel-btn');
    const input = form.querySelector('.edit-input');
    
    saveBtn.addEventListener('click', () => saveDriverField(field, input.value));
    cancelBtn.addEventListener('click', () => form.remove());
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveDriverField(field, input.value);
        }
    });
}

// Salvar campo editado
function saveDriverField(field, value) {
    if (!currentDriver) return;
    
    // Validações básicas
    if (!value.trim()) {
        showNotification('Erro', 'O campo não pode estar vazio', 'error');
        return;
    }
    
    if (field === 'plate') {
        // Validação simples de matrícula
        const plateRegex = /^[A-Z]{2}-[0-9]{2}-[0-9]{2}$/;
        if (!plateRegex.test(value.toUpperCase())) {
            showNotification('Erro', 'Formato de matrícula inválido (ex: AA-00-00)', 'error');
            return;
        }
        value = value.toUpperCase();
    }
    
    if (field === 'phone') {
        // Validação simples de telefone
        const phoneRegex = /^[\d\s\-\+\(\)]{8,15}$/;
        if (!phoneRegex.test(value)) {
            showNotification('Erro', 'Digite um telefone válido', 'error');
            return;
        }
    }
    
    if (field === 'password') {
        if (value.length < 6) {
            showNotification('Erro', 'A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }
    }
    
    // Atualizar motorista
    currentDriver[field] = value;
    
    // Atualizar no armazenamento
    const drivers = getAllDrivers();
    drivers[currentDriver.driverId] = currentDriver;
    localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
    saveCurrentDriver(currentDriver);
    
    // Atualizar no Firebase se estiver online
    if (isOnline) {
        database.ref(`drivers/${currentDriver.driverId}`).update({
            name: currentDriver.name,
            licensePlate: currentDriver.licensePlate,
            phone: currentDriver.phone
        });
    }
    
    // Atualizar interface
    updateDriverInfo();
    
    // Remover formulário de edição
    const form = document.querySelector('.edit-form.active');
    if (form) {
        form.remove();
    }
    
    showNotification('Sucesso', `${field === 'password' ? 'Senha' : field} atualizado com sucesso!`, 'success');
}

// Inicializar mapa
function initMap() {
    // Posição inicial (Lisboa)
    const lisbon = { lat: 38.7223, lng: -9.1393 };
    
    // Criar mapa
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: lisbon,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        styles: [
            {
                "featureType": "poi.business",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "transit",
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            }
        ]
    });
    
    // Inicializar sistema de movimento
    smoothMovement = new SmoothMovementSystem();
    
    // Inicializar renderizador de direções
    directionRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 5,
            strokeOpacity: 0.7
        }
    });
    
    // Criar marcador do motorista
    driverMarker = new google.maps.Marker({
        position: lisbon,
        map: map,
        title: "Sua Localização",
        icon: {
            url: "https://i.postimg.cc/d37TyxgN/Screenshot-7-removebg-preview-(1).png",
            scaledSize: new google.maps.Size(50, 70),
            anchor: new google.maps.Point(25, 35)
        }
    });
    
    // Tentar obter localização atual
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                
                driverMarker.setPosition(currentLocation);
                map.setCenter(currentLocation);
                
                showNotification('Localização', 'Sua localização foi detectada', 'success');
            },
            () => {
                showNotification('Localização', 'Não foi possível obter sua localização', 'warning');
            }
        );
    }
    
    // Se estiver logado, escutar por corridas
    if (currentDriver) {
        listenForRides();
    }
}

// Iniciar rastreamento
function startTracking() {
    if (!currentDriver) {
        showNotification('Erro', 'Faça login primeiro', 'error');
        return;
    }
    
    if (!navigator.geolocation) {
        showNotification('Erro', 'Seu navegador não suporta geolocalização', 'error');
        return;
    }
    
    showNotification('Status', 'Iniciando trabalho...', 'info');
    
    // Obter localização inicial
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            
            // Atualizar marcador
            driverMarker.setPosition(currentLocation);
            map.setCenter(currentLocation);
            
            // Registrar no Firebase
            database.ref(`drivers/${currentDriver.driverId}`).set({
                driverId: currentDriver.driverId,
                name: currentDriver.name,
                licensePlate: currentDriver.licensePlate || 'Não informada',
                phone: currentDriver.phone || 'Não informado',
                status: 'online',
                location: currentLocation,
                heading: 0,
                available: true,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });
            
            isOnline = true;
            updateDriverStatusUI();
            
            // Iniciar watchPosition para atualização contínua
            watchPositionId = navigator.geolocation.watchPosition(
                (position) => {
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    
                    // Calcular direção
                    const heading = position.coords.heading || 0;
                    
                    // Atualizar localização no Firebase
                    if (isOnline) {
                        database.ref(`drivers/${currentDriver.driverId}`).update({
                            location: newLocation,
                            heading: heading,
                            lastUpdate: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    
                    // Atualizar marcador no mapa
                    driverMarker.setPosition(newLocation);
                    driverMarker.setIcon({
                        url: "https://i.postimg.cc/d37TyxgN/Screenshot-7-removebg-preview-(1).png",
                        scaledSize: new google.maps.Size(50, 70),
                        anchor: new google.maps.Point(25, 35),
                        rotation: heading
                    });
                    
                    currentLocation = newLocation;
                },
                (error) => {
                    console.error('Erro ao obter localização:', error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 30000,
                    timeout: 27000
                }
            );
            
            // Escutar por corridas
            listenForRides();
            
            showNotification('Sucesso', 'Agora você está online! Aguardando corridas...', 'success');
        },
        (error) => {
            console.error('Erro ao obter localização:', error);
            showNotification('Erro', 'Não foi possível obter sua localização', 'error');
        }
    );
}

// Parar rastreamento
function stopTracking() {
    if (!isOnline) return;
    
    if (watchPositionId) {
        navigator.geolocation.clearWatch(watchPositionId);
        watchPositionId = null;
    }
    
    // Remover do Firebase
    database.ref(`drivers/${currentDriver.driverId}`).update({
        status: 'offline',
        available: false,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    isOnline = false;
    updateDriverStatusUI();
    
    // Cancelar corrida atual se houver
    if (currentRideRequest) {
        rejectRide();
    }
    
    showNotification('Status', 'Você está offline', 'info');
}

// Escutar por corridas
function listenForRides() {
    if (!currentDriver) return;
    
    database.ref('notifications/drivers').on('child_added', (snapshot) => {
        const notification = snapshot.val();
        
        if (notification.type === 'new_request_all' && isOnline) {
            // Verificar se já há uma corrida em andamento
            if (currentRideRequest) return;
            
            // Buscar detalhes da solicitação
            database.ref(`ride_requests/${notification.requestId}`).once('value')
                .then((requestSnapshot) => {
                    const request = requestSnapshot.val();
                    
                    if (request && request.status === 'pending') {
                        // Mostrar painel de corrida
                        showRidePanel(request, notification);
                    }
                })
                .catch((error) => {
                    console.error('Erro ao buscar solicitação:', error);
                });
        }
    });
}

// Mostrar painel de corrida
function showRidePanel(request, notification) {
    currentRideRequest = {
        requestId: request.requestId,
        ...request
    };
    
    // Preencher detalhes
    document.getElementById('clientName').textContent = request.clientName;
    document.getElementById('rideOrigin').textContent = request.origin;
    document.getElementById('rideDestination').textContent = request.destination;
    document.getElementById('ridePassengers').textContent = request.passengers;
    document.getElementById('clientPhone').textContent = request.clientPhone || 'Não informado';
    document.getElementById('ridePayment').textContent = getPaymentMethodText(request.paymentMethod);
    
    // Mostrar painel
    document.getElementById('ridePanel').classList.add('active');
    
    // Iniciar timer
    rideTimerSeconds = 120;
    startRideTimer();
    
    // Calcular rota para o cliente
    calculateRouteToClient(request.clientLocation);
}

// Obter texto do método de pagamento
function getPaymentMethodText(method) {
    const methods = {
        'cash': 'Dinheiro',
        'card': 'Cartão',
        'mbway': 'MBWay'
    };
    return methods[method] || method;
}

// Iniciar timer da corrida
function startRideTimer() {
    if (rideTimer) {
        clearInterval(rideTimer);
    }
    
    updateTimerDisplay();
    
    rideTimer = setInterval(() => {
        rideTimerSeconds--;
        updateTimerDisplay();
        
        if (rideTimerSeconds <= 0) {
            clearInterval(rideTimer);
            rejectRide('Tempo esgotado');
        }
    }, 1000);
}

// Atualizar display do timer
function updateTimerDisplay() {
    const minutes = Math.floor(rideTimerSeconds / 60);
    const seconds = rideTimerSeconds % 60;
    document.getElementById('rideTimer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Mudar cor quando estiver acabando
    if (rideTimerSeconds <= 30) {
        document.getElementById('rideTimer').style.color = 'var(--danger)';
    } else if (rideTimerSeconds <= 60) {
        document.getElementById('rideTimer').style.color = 'var(--accent)';
    } else {
        document.getElementById('rideTimer').style.color = 'var(--dark)';
    }
}

// Calcular rota para o cliente
function calculateRouteToClient(clientLocation) {
    if (!currentLocation || !clientLocation) return;
    
    const directionsService = new google.maps.DirectionsService();
    
    directionsService.route(
        {
            origin: currentLocation,
            destination: clientLocation,
            travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
            if (status === 'OK') {
                directionRenderer.setDirections(result);
                
                // Mostrar rota no mapa
                const route = result.routes[0];
                const leg = route.legs[0];
                
                showNotification('Rota', `Distância: ${leg.distance.text} | Tempo: ${leg.duration.text}`, 'info');
            } else {
                console.error('Erro ao calcular rota:', status);
            }
        }
    );
}

// Aceitar corrida
function acceptRide() {
    if (!currentRideRequest) return;
    
    clearInterval(rideTimer);
    
    // Atualizar status da solicitação
    database.ref(`ride_requests/${currentRideRequest.requestId}`).update({
        status: 'accepted',
        driverId: currentDriver.driverId,
        driverName: currentDriver.name,
        driverPhone: currentDriver.phone,
        driverLicense: currentDriver.licensePlate,
        acceptedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Atualizar status do motorista
    database.ref(`drivers/${currentDriver.driverId}`).update({
        available: false
    });
    
    // Esconder painel
    document.getElementById('ridePanel').classList.remove('active');
    directionRenderer.setDirections({routes: []}); // Limpar rota
    
    showNotification('🎉 Corrida Aceita!', 'Dirija-se até o cliente', 'success');
    
    // Aqui você poderia iniciar o acompanhamento da corrida
    // Por enquanto, vamos simular o fim da corrida após 30 segundos
    setTimeout(() => {
        completeRide();
    }, 30000);
    
    currentRideRequest = null;
}

// Rejeitar corrida
function rejectRide(reason = 'Motorista indisponível') {
    if (!currentRideRequest) return;
    
    clearInterval(rideTimer);
    
    // Atualizar status da solicitação
    database.ref(`ride_requests/${currentRideRequest.requestId}`).update({
        status: 'rejected',
        rejectedAt: firebase.database.ServerValue.TIMESTAMP,
        rejectionReason: reason
    });
    
    // Enviar notificação para outros motoristas
    database.ref('notifications/drivers').push({
        type: 'request_rejected',
        requestId: currentRideRequest.requestId,
        clientName: currentRideRequest.clientName,
        origin: currentRideRequest.origin,
        destination: currentRideRequest.destination,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        note: reason
    });
    
    // Esconder painel
    document.getElementById('ridePanel').classList.remove('active');
    directionRenderer.setDirections({routes: []}); // Limpar rota
    
    showNotification('Corrida Recusada', reason, 'warning');
    
    currentRideRequest = null;
}

// Completar corrida
function completeRide() {
    if (!currentDriver) return;
    
    // Calcular valor da corrida (simulação)
    const rideValue = 5 + Math.random() * 15; // Entre 5 e 20 euros
    
    // Atualizar estatísticas
    const stats = updateDriverStats(currentDriver.driverId, rideValue);
    
    // Atualizar UI
    document.getElementById('totalRides').textContent = stats.totalRides;
    document.getElementById('totalEarnings').textContent = `€${stats.totalEarnings.toFixed(2)}`;
    
    // Atualizar status do motorista
    if (isOnline) {
        database.ref(`drivers/${currentDriver.driverId}`).update({
            available: true
        });
    }
    
    showNotification('💰 Corrida Concluída!', `Você ganhou €${rideValue.toFixed(2)}`, 'success');
}

// Configurar eventos
function setupEventListeners() {
    // Botões de autenticação
    document.getElementById('loginBtn')?.addEventListener('click', login);
    
    // Permitir login com Enter
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    // Botão do perfil
    document.getElementById('userProfileBtn').addEventListener('click', toggleDriverPanel);
    
    // Fechar painel do motorista
    document.getElementById('closeDriverPanel').addEventListener('click', () => {
        document.getElementById('driverPanel').classList.remove('active');
    });
    
    // Botões de edição
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            editDriverField(btn.dataset.field);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Controles
    document.getElementById('startTrackingBtn').addEventListener('click', startTracking);
    document.getElementById('stopTrackingBtn').addEventListener('click', stopTracking);
    
    // Ações de corrida
    document.getElementById('acceptRideBtn').addEventListener('click', acceptRide);
    document.getElementById('rejectRideBtn').addEventListener('click', () => rejectRide());
    
    // Fechar modal de autenticação clicando fora
    document.getElementById('authModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('authModal')) {
            hideAuthModal();
        }
    });
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar sistema de armazenamento
    initializeDriversStorage();
    
    // Verificar se há motorista logado
    currentDriver = getCurrentDriver();
    if (currentDriver) {
        updateDriverInfo();
        updateDriverStatusUI();
    } else {
        showAuthModal();
    }
    
    // Configurar eventos
    setupEventListeners();
});