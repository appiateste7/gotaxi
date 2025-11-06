// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB2ljIwjmbPF1vfCgth4bLd3d7hhLdxKIk",
    authDomain: "lisboago-app.firebaseapp.com",
    projectId: "lisboago-app",
    storageBucket: "lisboago-app.firebasestorage.app",
    messagingSenderId: "467502556237",
    appId: "1:467502556237:web:ff0074a42a664f7efba804"
};

// Inicializar Firebase
let firebaseApp;
let auth;
let db;
let rtdb;
let firebaseInitialized = false;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    rtdb = firebase.database();
    firebaseInitialized = true;
    console.log('Firebase inicializado com sucesso');
} catch (error) {
    console.warn('Erro ao inicializar Firebase, usando modo de demonstração:', error);
    firebaseInitialized = false;
}