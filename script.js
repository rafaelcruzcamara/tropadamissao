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
const storage = firebase.storage();

// Elementos do DOM
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const cameraButton = document.getElementById('cameraButton');
const userModal = document.getElementById('userModal');
const userNameInput = document.getElementById('userNameInput');
const saveUserButton = document.getElementById('saveUserButton');
const cameraModal = document.getElementById('cameraModal');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('captureButton');
const cancelCameraButton = document.getElementById('cancelCameraButton');
const sendPhotoButton = document.getElementById('sendPhotoButton');
const editUserButton = document.getElementById('editUserButton');

// Estado do aplicativo
let currentUser = {
    id: localStorage.getItem('userId') || 'user_' + Math.random().toString(36).substr(2, 9),
    name: localStorage.getItem('userName') || null
};
let stream = null;
let isEditingUser = false;

// Inicialização
function init() {
    setupEventListeners();
    
    if (!currentUser.name) {
        showUserModal(false);
    } else {
        loadMessages();
        messageInput.focus();
    }
}

// Configura todos os event listeners
function setupEventListeners() {
    // Envio de mensagem
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Câmera
    cameraButton.addEventListener('click', openCamera);
    captureButton.addEventListener('click', capturePhoto);
    sendPhotoButton.addEventListener('click', sendPhoto);
    cancelCameraButton.addEventListener('click', closeCamera);

    // Usuário
    saveUserButton.addEventListener('click', saveUser);
    editUserButton.addEventListener('click', () => showUserModal(true));
}

// Mostra o modal de usuário
function showUserModal(editing) {
    isEditingUser = editing;
    userModal.style.display = 'block';
    userNameInput.value = currentUser.name || '';
    saveUserButton.textContent = editing ? 'Salvar Alterações' : 'Entrar no Chat';
    userNameInput.focus();
    
    if (editing) {
        userNameInput.select();
    }
}

// Salva ou atualiza o usuário
async function saveUser() {
    const newName = userNameInput.value.trim();
    
    if (!newName) {
        alert('Por favor, digite um nome válido');
        return;
    }

    try {
        // Atualiza o localStorage
        currentUser.name = newName;
        localStorage.setItem('userId', currentUser.id);
        localStorage.setItem('userName', newName);

        // Se estiver editando, atualiza as mensagens existentes
        if (isEditingUser) {
            await updateExistingMessages(newName);
        }

        userModal.style.display = 'none';
        
        if (!isEditingUser) {
            loadMessages();
            messageInput.focus();
        }
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        alert('Erro ao salvar. Tente novamente.');
    }
}

// Atualiza mensagens existentes com novo nome
async function updateExistingMessages(newName) {
    try {
        const messages = await db.collection('messages')
            .where('userId', '==', currentUser.id)
            .get();

        const batch = db.batch();
        messages.forEach(doc => {
            batch.update(doc.ref, { userName: newName });
        });

        await batch.commit();
    } catch (error) {
        console.error('Erro ao atualizar mensagens:', error);
        throw error;
    }
}

// Envia mensagem de texto
async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text || !currentUser.name) return;

    try {
        await db.collection('messages').add({
            userId: currentUser.id,
            userName: currentUser.name,
            content: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        messageInput.value = '';
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem. Tente novamente.');
    }
}

// Carrega mensagens do chat
function loadMessages() {
    db.collection('messages')
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            messagesContainer.innerHTML = '';
            snapshot.forEach(doc => {
                displayMessage(doc.data());
            });
            scrollToBottom();
        });
}

// Exibe uma mensagem no chat
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `<strong>${message.userName}:</strong> ${message.content || ''}`;
    
    if (message.photoUrl) {
        const img = document.createElement('img');
        img.src = message.photoUrl;
        img.className = 'photo-message';
        img.alt = 'Foto enviada';
        messageElement.appendChild(img);
    }
    
    messagesContainer.appendChild(messageElement);
}

// Configura e abre a câmera
async function openCamera() {
    try {
        cameraModal.style.display = 'block';
        sendPhotoButton.style.display = 'none';
        captureButton.style.display = 'block';
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: 1280, height: 720 } 
        });
        video.srcObject = stream;
    } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        alert('Não foi possível acessar a câmera. Verifique as permissões.');
        closeCamera();
    }
}

// Captura foto da câmera
function capturePhoto() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    captureButton.style.display = 'none';
    sendPhotoButton.style.display = 'block';
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Envia foto capturada
async function sendPhoto() {
    if (!currentUser.name) return;

    try {
        // Converte canvas para blob
        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 0.8);
        });

        // Faz upload para o Storage
        const storageRef = storage.ref();
        const photoRef = storageRef.child(`photos/${Date.now()}_${currentUser.id}.jpg`);
        await photoRef.put(blob);
        
        // Obtém URL e envia mensagem
        const photoUrl = await photoRef.getDownloadURL();
        
        await db.collection('messages').add({
            userId: currentUser.id,
            userName: currentUser.name,
            photoUrl: photoUrl,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeCamera();
    } catch (error) {
        console.error('Erro ao enviar foto:', error);
        alert('Erro ao enviar foto. Tente novamente.');
    }
}

// Fecha a câmera
function closeCamera() {
    cameraModal.style.display = 'none';
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Rola chat para baixo
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Inicia o aplicativo
init();
