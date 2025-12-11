// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAZ4YqmOZz0wUlhBvuSD_fBLcwq1av8yc8",
    authDomain: "gotaxi-4e391.firebaseapp.com",
    databaseURL: "https://gotaxi-4e391-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "gotaxi-4e391",
    storageBucket: "gotaxi-4e391.firebasestorage.app",
    messagingSenderId: "597857194128",
    appId: "1:597857194128:web:9b550abd9b5e98bb374815"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();