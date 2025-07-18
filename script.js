// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBTbBOqnDmgLeKB4cxw2qA3SJ77BZFiJ2M",
    authDomain: "rede-social-c97fd.firebaseapp.com",
    projectId: "rede-social-c97fd",
    storageBucket: "rede-social-c97fd.appspot.com",
    messagingSenderId: "21884043176",
    appId: "1:21884043176:web:33fb052e44012d1355e79d",
    measurementId: "G-G9PL35GS9W"
};

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Elementos do DOM
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// Estado do usuário
const currentUser = {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    name: 'Usuário' + Math.floor(Math.random() * 1000)
};

// Carrega mensagens e já rola para baixo
function loadMessages() {
    db.collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            messagesContainer.innerHTML = '';
            snapshot.forEach(doc => {
                displayMessage(doc.data());
            });
            scrollToBottom();
        });
}

// Exibe uma mensagem
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `
        <strong>${message.userName}:</strong> ${message.content}
    `;
    messagesContainer.appendChild(messageElement);
}

// Envia mensagem
async function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (messageText) {
        try {
            await db.collection('messages').add({
                userId: currentUser.id,
                userName: currentUser.name,
                content: messageText,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            messageInput.value = '';
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    }
}

// Rola para a última mensagem
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Inicializa o chat
window.addEventListener('DOMContentLoaded', () => {
    loadMessages();
    
    // Garante que o scroll fique no fundo após carregar tudo
    setTimeout(scrollToBottom, 500);
    
    // Foca no input ao carregar
    messageInput.focus();
});