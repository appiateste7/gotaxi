// Sistema de movimento suave para motoristas
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

// Sistema de armazenamento local para clientes
const CLIENTS_STORAGE_KEY = 'gotaxi_clients';
const CURRENT_USER_KEY = 'gotaxi_current_user';
const RIDES_HISTORY_KEY = 'gotaxi_rides_history';

// Variáveis globais
let map;
let userMarker;
let userLocation;
let currentUser = null;
let clientId;
let smoothMovement;
let currentRequestId = null;
let isRequestActive = false;
let originAutocomplete;
let destinationAutocomplete;

// Inicializar sistema de armazenamento
function initializeClientsStorage() {
    if (!localStorage.getItem(CLIENTS_STORAGE_KEY)) {
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify({}));
    }
}

// Obter todos os clientes
function getAllClients() {
    const clients = localStorage.getItem(CLIENTS_STORAGE_KEY);
    return clients ? JSON.parse(clients) : {};
}

// Salvar cliente
function saveClient(clientData) {
    const clients = getAllClients();
    clients[clientData.clientId] = clientData;
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    return true;
}

// Verificar se usuário já existe
function userExists(username, email) {
    const clients = getAllClients();
    for (const clientId in clients) {
        const client = clients[clientId];
        if (client.username === username || client.email === email) {
            return true;
        }
    }
    return false;
}

// Salvar usuário atual
function saveCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

// Obter usuário atual
function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

// Remover usuário atual
function removeCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
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

// Atualizar informações do usuário na interface
function updateUserInfo() {
    if (!currentUser) return;
    
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userEmailDisplay').textContent = currentUser.email;
    
    document.getElementById('infoName').textContent = currentUser.name || '-';
    document.getElementById('infoPhone').textContent = currentUser.phone || '-';
    document.getElementById('infoAddress').textContent = currentUser.address || '-';
    document.getElementById('infoEmail').textContent = currentUser.email || '-';
    document.getElementById('infoUsername').textContent = currentUser.username || '-';
    
    // Atualizar avatar com iniciais
    const avatar = document.getElementById('userAvatar');
    if (currentUser.name) {
        const initials = currentUser.name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        avatar.innerHTML = initials;
        avatar.style.fontSize = '24px';
    }
}

// Alternar painel do usuário
function toggleUserPanel() {
    const panel = document.getElementById('userPanel');
    const btn = document.getElementById('userProfileBtn');
    
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    panel.classList.toggle('active');
    btn.classList.toggle('active');
    
    if (panel.classList.contains('active')) {
        updateUserInfo();
    }
}

// Mostrar modal de autenticação
function showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) {
        // Se não houver modal, redirecionar para página de registro
        window.location.href = 'registro-cliente.html';
        return;
    }
    
    modal.classList.add('active');
    switchAuthTab(tab);
}

// Esconder modal de autenticação
function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('loginError').textContent = '';
        document.getElementById('registerError').textContent = '';
    }
}

// Alternar entre login e registro
function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    document.querySelector(`.auth-tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Form`).classList.add('active');
    
    // Limpar erros
    document.getElementById(`${tabName}Error`).textContent = '';
}

// Login do cliente
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
    
    const clients = getAllClients();
    let loginSuccess = false;
    let clientData = null;
    
    for (const clientId in clients) {
        const client = clients[clientId];
        if ((client.username === username || client.email === username) && 
            client.password === password) {
            loginSuccess = true;
            clientData = client;
            break;
        }
    }
    
    if (loginSuccess) {
        currentUser = clientData;
        saveCurrentUser(currentUser);
        hideAuthModal();
        updateUserInfo();
        updateAuthUI();
        showNotification('Login Bem-sucedido', `Bem-vindo de volta, ${currentUser.name}!`, 'success');
        
        // Limpar campos
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    } else {
        errorElement.textContent = 'Usuário ou senha incorretos';
        errorElement.style.display = 'block';
    }
}

// Registrar novo cliente
function register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorElement = document.getElementById('registerError');
    
    errorElement.style.display = 'none';
    
    // Validações
    if (!name || !email || !phone || !username || !password || !confirmPassword) {
        errorElement.textContent = 'Todos os campos são obrigatórios';
        errorElement.style.display = 'block';
        return;
    }
    
    if (password !== confirmPassword) {
        errorElement.textContent = 'As senhas não coincidem';
        errorElement.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        errorElement.textContent = 'A senha deve ter pelo menos 6 caracteres';
        errorElement.style.display = 'block';
        return;
    }
    
    if (userExists(username, email)) {
        errorElement.textContent = 'Usuário ou email já cadastrados';
        errorElement.style.display = 'block';
        return;
    }
    
    // Criar novo cliente
    const clientId = 'client_' + Date.now();
    
    const clientData = {
        clientId: clientId,
        name: name,
        email: email,
        phone: phone,
        username: username,
        password: password,
        address: '',
        createdAt: new Date().toISOString(),
        rides: 0
    };
    
    // Salvar cliente
    saveClient(clientData);
    
    // Fazer login automaticamente
    currentUser = clientData;
    saveCurrentUser(currentUser);
    
    hideAuthModal();
    updateUserInfo();
    updateAuthUI();
    
    showNotification('Conta Criada', `Bem-vindo ao GoTáxi, ${name}!`, 'success');
    
    // Limpar campos
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPhone').value = '';
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
}

// Atualizar UI de autenticação
function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const userProfileBtn = document.getElementById('userProfileBtn');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userProfileBtn.style.display = 'flex';
        document.getElementById('mainFloatingBtn').classList.add('pulse');
    } else {
        authButtons.style.display = 'flex';
        userProfileBtn.style.display = 'none';
        document.getElementById('mainFloatingBtn').classList.remove('pulse');
    }
}

// Logout
function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        removeCurrentUser();
        currentUser = null;
        
        document.getElementById('userPanel').classList.remove('active');
        document.getElementById('userProfileBtn').classList.remove('active');
        updateAuthUI();
        
        showNotification('Logout', 'Você saiu da sua conta', 'info');
        
        // Resetar informações do usuário
        document.getElementById('userNameDisplay').textContent = 'Convidado';
        document.getElementById('userEmailDisplay').textContent = 'Entre para continuar';
        document.getElementById('userAvatar').innerHTML = '<i class="fas fa-user"></i>';
        document.getElementById('userAvatar').style.fontSize = '32px';
    }
}

// Editar campo do usuário
function editUserField(field) {
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
        case 'phone':
            placeholder = 'Digite seu telefone';
            inputType = 'tel';
            break;
        case 'address':
            placeholder = 'Digite seu endereço';
            break;
        case 'email':
            placeholder = 'Digite seu email';
            inputType = 'email';
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
    
    saveBtn.addEventListener('click', () => saveUserField(field, input.value));
    cancelBtn.addEventListener('click', () => form.remove());
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveUserField(field, input.value);
        }
    });
}

// Salvar campo editado
function saveUserField(field, value) {
    if (!currentUser) return;
    
    // Validações básicas
    if (!value.trim()) {
        showNotification('Erro', 'O campo não pode estar vazio', 'error');
        return;
    }
    
    if (field === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showNotification('Erro', 'Digite um email válido', 'error');
            return;
        }
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
    
    // Atualizar usuário
    currentUser[field] = value;
    
    // Atualizar no armazenamento
    const clients = getAllClients();
    clients[currentUser.clientId] = currentUser;
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    saveCurrentUser(currentUser);
    
    // Atualizar interface
    updateUserInfo();
    
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
    
    // Criar marcador do usuário
    userMarker = new google.maps.Marker({
        position: lisbon,
        map: map,
        title: "Sua Localização",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2
        }
    });
    
    // Tentar obter localização atual
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                
                userMarker.setPosition(userLocation);
                map.setCenter(userLocation);
                
                // Preencher automaticamente o campo de origem
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: userLocation }, (results, status) => {
                    if (status === "OK" && results[0]) {
                        document.getElementById('origin').value = results[0].formatted_address;
                    }
                });
                
                showNotification('Localização', 'Sua localização foi detectada', 'success');
            },
            () => {
                showNotification('Localização', 'Não foi possível obter sua localização', 'warning');
            }
        );
    }
    
    // Inicializar autocomplete
    originAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('origin'),
        { types: ['geocode'] }
    );
    
    destinationAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('destination'),
        { types: ['geocode'] }
    );
    
    // Escutar por motoristas online
    listenForDrivers();
}

// Escutar por motoristas online
function listenForDrivers() {
    database.ref('drivers').on('value', (snapshot) => {
        const drivers = snapshot.val();
        let onlineDriversCount = 0;
        
        if (drivers) {
            for (const driverId in drivers) {
                const driver = drivers[driverId];
                
                if (driver.status === 'online' && driver.location && map) {
                    onlineDriversCount++;
                    
                    smoothMovement.updateCarPosition(
                        driverId,
                        driver.location,
                        driver.heading || 0
                    );
                } else {
                    smoothMovement.removeCar(driverId);
                }
            }
        }
        
        smoothMovement.cars.forEach((car, carId) => {
            if (!drivers || !drivers[carId] || drivers[carId].status !== 'online') {
                smoothMovement.removeCar(carId);
            }
        });
        
        // Atualizar contador
        document.getElementById('driversCount').textContent = onlineDriversCount;
        
        // Mostrar/ocultar indicador
        const driversOnline = document.getElementById('driversOnline');
        if (onlineDriversCount > 0) {
            driversOnline.style.display = 'flex';
        } else {
            driversOnline.style.display = 'none';
        }
    });
}

// Obter localização atual
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showNotification('Erro', 'Seu navegador não suporta geolocalização', 'error');
        return;
    }
    
    showNotification('Localização', 'Obtendo sua localização...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            
            userMarker.setPosition(userLocation);
            map.setCenter(userLocation);
            map.setZoom(16);
            
            // Preencher campo de origem
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: userLocation }, (results, status) => {
                if (status === "OK" && results[0]) {
                    document.getElementById('origin').value = results[0].formatted_address;
                }
            });
            
            showNotification('Localização', 'Localização atualizada!', 'success');
        },
        () => {
            showNotification('Erro', 'Não foi possível obter sua localização', 'error');
        }
    );
}

// Chamar táxi
function callTaxi() {
    if (!currentUser) {
        showNotification('Atenção', 'Faça login para chamar um táxi', 'warning');
        showAuthModal();
        return;
    }
    
    const origin = document.getElementById('origin').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const passengers = document.getElementById('passengers').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    // Validações
    if (!origin || !destination) {
        showNotification('Erro', 'Preencha origem e destino', 'error');
        return;
    }
    
    if (isRequestActive) {
        showNotification('Atenção', 'Você já tem uma solicitação em andamento', 'warning');
        return;
    }
    
    // Desabilitar botão
    const callBtn = document.getElementById('callTaxiBtn');
    callBtn.disabled = true;
    callBtn.classList.add('loading');
    
    // Gerar ID da solicitação
    currentRequestId = 'request_' + Date.now();
    isRequestActive = true;
    
    // Criar dados da solicitação
    const requestData = {
        requestId: currentRequestId,
        clientId: currentUser.clientId,
        clientName: currentUser.name,
        clientPhone: currentUser.phone,
        origin: origin,
        destination: destination,
        passengers: passengers,
        paymentMethod: paymentMethod,
        clientLocation: userLocation,
        status: 'pending',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Enviar para o Firebase
    database.ref(`ride_requests/${currentRequestId}`).set(requestData)
        .then(() => {
            // Enviar notificação para todos os motoristas
            database.ref('notifications/drivers').push({
                type: 'new_request_all',
                requestId: currentRequestId,
                clientName: currentUser.name,
                origin: origin,
                destination: destination,
                passengers: passengers,
                contact: currentUser.phone,
                clientLocation: userLocation,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                note: 'Nova solicitação disponível'
            });
            
            showNotification('Solicitação Enviada', 'Buscando motoristas disponíveis...', 'info');
            
            // Escutar por resposta
            listenForDriverResponse();
            
            // Configurar timeout
            setTimeout(() => {
                if (isRequestActive) {
                    cancelRequest();
                    showNotification('Tempo Esgotado', 'Nenhum motorista disponível no momento', 'warning');
                }
            }, 120000); // 2 minutos
        })
        .catch((error) => {
            console.error('Erro ao enviar solicitação:', error);
            showNotification('Erro', 'Não foi possível enviar a solicitação', 'error');
            callBtn.disabled = false;
            callBtn.classList.remove('loading');
            isRequestActive = false;
        });
}

// Escutar por resposta do motorista
function listenForDriverResponse() {
    database.ref(`ride_requests/${currentRequestId}`).on('value', (snapshot) => {
        const request = snapshot.val();
        
        if (!request) return;
        
        if (request.status === 'accepted') {
            // Motorista aceitou a corrida
            handleRequestAccepted(request);
        } else if (request.status === 'rejected') {
            // Solicitação rejeitada
            handleRequestRejected();
        }
    });
}

// Lidar com solicitação aceita
function handleRequestAccepted(request) {
    isRequestActive = false;
    
    // Buscar informações do motorista
    database.ref(`drivers/${request.driverId}`).once('value')
        .then((driverSnapshot) => {
            const driver = driverSnapshot.val();
            
            // Mostrar modal de confirmação
            showConfirmationModal(request, driver);
            
            // Mostrar notificação
            showNotification('🎉 Táxi Confirmado!', `Motorista ${driver.name} está a caminho`, 'success');
            
            // Atualizar botão
            const callBtn = document.getElementById('callTaxiBtn');
            callBtn.disabled = false;
            callBtn.classList.remove('loading');
            
            // Esconder painel de solicitação
            document.getElementById('requestPanel').classList.add('hidden');
        })
        .catch((error) => {
            console.error('Erro ao buscar dados do motorista:', error);
            showNotification('Erro', 'Erro ao processar a corrida', 'error');
        });
}

// Lidar com solicitação rejeitada
function handleRequestRejected() {
    isRequestActive = false;
    
    // Reativar botão
    const callBtn = document.getElementById('callTaxiBtn');
    callBtn.disabled = false;
    callBtn.classList.remove('loading');
    
    showNotification('Atenção', 'Motorista não disponível. Buscando outro...', 'warning');
}

// Cancelar solicitação
function cancelRequest() {
    if (!currentRequestId || !isRequestActive) return;
    
    database.ref(`ride_requests/${currentRequestId}`).update({
        status: 'cancelled',
        cancelledAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    isRequestActive = false;
    currentRequestId = null;
    
    const callBtn = document.getElementById('callTaxiBtn');
    callBtn.disabled = false;
    callBtn.classList.remove('loading');
}

// Mostrar modal de confirmação
function showConfirmationModal(request, driver) {
    document.getElementById('driverName').textContent = driver.name;
    document.getElementById('driverLicense').textContent = driver.licensePlate || 'Não informada';
    document.getElementById('driverVehicle').textContent = 'Táxi Standard';
    
    // Calcular distância estimada
    if (userLocation && driver.location) {
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            driver.location.lat, driver.location.lng
        );
        document.getElementById('driverDistance').textContent = distance.toFixed(1) + ' km';
        document.getElementById('driverTime').textContent = Math.ceil(distance * 3) + ' minutos';
    }
    
    // Atualizar avatar do motorista
    const driverAvatar = document.getElementById('driverAvatar');
    if (driver.name) {
        const initials = driver.name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        driverAvatar.innerHTML = initials;
        driverAvatar.style.fontSize = '30px';
    }
    
    // Mostrar modal
    document.getElementById('confirmationModal').classList.add('active');
}

// Fechar modal de confirmação
function closeConfirmationModal() {
    document.getElementById('confirmationModal').classList.remove('active');
    currentRequestId = null;
}

// Acompanhar corrida
function trackRide() {
    // Aqui você implementaria o acompanhamento da corrida
    // Por enquanto, apenas fechar o modal e mostrar uma mensagem
    closeConfirmationModal();
    showNotification('Acompanhamento', 'Acompanhamento ativado. O motorista está a caminho.', 'info');
}

// Calcular distância entre dois pontos
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Configurar eventos
function setupEventListeners() {
    // Botões de autenticação
    document.getElementById('loginBtn')?.addEventListener('click', () => showAuthModal('login'));
    document.getElementById('registerBtn')?.addEventListener('click', () => showAuthModal('register'));
    
    // Botão do perfil do usuário
    document.getElementById('userProfileBtn').addEventListener('click', toggleUserPanel);
    
    // Botões de autenticação no modal
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchAuthTab(tab.dataset.tab);
        });
    });
    
    document.getElementById('loginBtnModal')?.addEventListener('click', login);
    document.getElementById('registerBtnModal')?.addEventListener('click', register);
    
    // Permitir login com Enter
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('regConfirmPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') register();
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Botões de edição
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            editUserField(btn.dataset.field);
        });
    });
    
    // Botão flutuante principal
    document.getElementById('mainFloatingBtn').addEventListener('click', () => {
        if (!currentUser) {
            showNotification('Atenção', 'Faça login para chamar um táxi', 'warning');
            showAuthModal();
            return;
        }
        
        document.getElementById('requestPanel').classList.toggle('hidden');
    });
    
    // Botões flutuantes secundários
    document.getElementById('locationBtn').addEventListener('click', getCurrentLocation);
    
    document.getElementById('infoBtn').addEventListener('click', () => {
        showNotification('Informações', 'GoTáxi - Seu táxi em Lisboa\nVersão 2.0', 'info');
    });
    
    document.getElementById('historyBtn').addEventListener('click', () => {
        showNotification('Histórico', 'Em breve: Histórico de corridas', 'info');
    });
    
    // Fechar painel
    document.getElementById('closePanel').addEventListener('click', () => {
        document.getElementById('requestPanel').classList.add('hidden');
    });
    
    // Métodos de pagamento
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', () => {
            document.querySelectorAll('.payment-method').forEach(m => {
                m.classList.remove('selected');
            });
            method.classList.add('selected');
            document.getElementById('paymentMethod').value = method.dataset.method;
        });
    });
    
    // Chamar táxi
    document.getElementById('callTaxiBtn').addEventListener('click', callTaxi);
    
    // Modal de confirmação
    document.getElementById('closeConfirmationBtn').addEventListener('click', closeConfirmationModal);
    document.getElementById('trackRideBtn').addEventListener('click', trackRide);
    
    // Permitir fechar modal clicando fora
    document.getElementById('confirmationModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirmationModal')) {
            closeConfirmationModal();
        }
    });
    
    // Fechar modal de autenticação
    document.getElementById('authModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('authModal')) {
            hideAuthModal();
        }
    });
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar sistema de armazenamento
    initializeClientsStorage();
    
    // Verificar se há usuário logado
    currentUser = getCurrentUser();
    if (currentUser) {
        updateUserInfo();
        updateAuthUI();
    }
    
    // Gerar ID do cliente
    clientId = 'client_' + Date.now();
    
    // Configurar eventos
    setupEventListeners();
});