// Sistema de usuários local
const localUsers = {
    'Mega': { 
        password: '12345', 
        type: 'driver', 
        phone: '939354112',
        name: 'Mega'
    },
    'Heitor': { 
        password: '12345', 
        type: 'driver', 
        phone: '351910603136',
        name: 'Heitor'
    },
    'Marcelo': { 
        password: '12345', 
        type: 'driver', 
        phone: '351939057350',
        name: 'Marcelo'
    },
    'cliente': { 
        password: '12345', 
        type: 'client',
        name: 'Cliente Demo'
    }
};

const registeredUsers = JSON.parse(localStorage.getItem('gotaxi_users') || '{}');
let currentUser = null;
let userType = null;

function loginUser(username, password, type) {
    return new Promise((resolve, reject) => {
        if (localUsers[username] && localUsers[username].password === password && localUsers[username].type === type) {
            const userData = localUsers[username];
            currentUser = {
                uid: 'predef_' + username,
                displayName: userData.name || username,
                ...userData
            };
            userType = type;
            resolve(currentUser);
            return;
        }
        
        if (registeredUsers[username] && registeredUsers[username].password === password && registeredUsers[username].type === type) {
            const userData = registeredUsers[username];
            currentUser = {
                uid: 'local_' + username,
                displayName: userData.name || username,
                ...userData
            };
            userType = type;
            resolve(currentUser);
            return;
        }
        
        reject('Usuário não encontrado ou senha incorreta. Use as credenciais de demonstração.');
    });
}

function logout() {
    currentUser = null;
    userType = null;
    window.location.href = 'index.html';
}