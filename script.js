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

// Estado do usuário e câmera
let currentUser = {
    id: localStorage.getItem('userId') || 'user_' + Math.random().toString(36).substr(2, 9),
    name: localStorage.getItem('userName') || null
};
let stream = null;

// Inicialização
if (!currentUser.name) {
    userModal.style.display = 'block';
} else {
    loadMessages();
}

// Função para salvar usuário
saveUserButton.addEventListener('click', () => {
    const name = userNameInput.value.trim();
    if (name) {
        currentUser.name = name;
        localStorage.setItem('userId', currentUser.id);
        localStorage.setItem('userName', name);
        userModal.style.display = 'none';
        loadMessages();
        messageInput.focus();
    } else {
        alert('Por favor, digite um nome válido');
    }
});

// Função para enviar mensagem de texto
async function sendMessage() {
    const text = messageInput.value.trim();
    if (text && currentUser.name) {
        try {
            await db.collection('messages').add({
                userId: currentUser.id,
                userName: currentUser.name,
                content: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            messageInput.value = '';
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            alert("Erro ao enviar mensagem. Tente novamente.");
        }
    }
}

// Função para carregar mensagens
function loadMessages() {
    db.collection('messages')
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            messagesContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const messageElement = document.createElement('div');
                messageElement.className = 'message';
                messageElement.innerHTML = `<strong>${msg.userName}:</strong> ${msg.content || ''}`;
                
                if (msg.photoUrl) {
                    const img = document.createElement('img');
                    img.src = msg.photoUrl;
                    img.className = 'photo-message';
                    img.alt = 'Foto enviada';
                    messageElement.appendChild(img);
                }
                
                messagesContainer.appendChild(messageElement);
            });
            scrollToBottom();
        });
}

// Função para abrir a câmera
cameraButton.addEventListener('click', async () => {
    cameraModal.style.display = 'block';
    sendPhotoButton.style.display = 'none';
    captureButton.style.display = 'block';
    
    try {
        // Para qualquer stream anterior
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Inicia nova stream de vídeo
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = stream;
    } catch (error) {
        console.error("Erro ao acessar a câmera:", error);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
        cameraModal.style.display = 'none';
    }
});

// Função para capturar foto
captureButton.addEventListener('click', () => {
    // Ajusta o canvas para o tamanho do vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Desenha o frame atual no canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Mostra o botão de enviar e esconde o de capturar
    captureButton.style.display = 'none';
    sendPhotoButton.style.display = 'block';
    
    // Para a câmera
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// Função para enviar foto
sendPhotoButton.addEventListener('click', async () => {
    if (!currentUser.name) return;
    
    try {
        // Converte canvas para blob
        canvas.toBlob(async (blob) => {
            try {
                // Faz upload para o Storage
                const storageRef = storage.ref();
                const photoRef = storageRef.child(`photos/${Date.now()}_${currentUser.id}.jpg`);
                await photoRef.put(blob);
                
                // Obtém URL da foto
                const photoUrl = await photoRef.getDownloadURL();
                
                // Envia mensagem com a foto
                await db.collection('messages').add({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    photoUrl: photoUrl,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Fecha o modal
                cameraModal.style.display = 'none';
                
            } catch (error) {
                console.error("Erro no upload:", error);
                alert("Erro ao enviar foto. Tente novamente.");
            }
        }, 'image/jpeg', 0.8);
        
    } catch (error) {
        console.error("Erro ao processar foto:", error);
    }
});

// Função para cancelar foto
cancelCameraButton.addEventListener('click', () => {
    cameraModal.style.display = 'none';
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
});

// Função para rolar para baixo
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Foco automático
if (currentUser.name) {
    messageInput.focus();
} else {
    userNameInput.focus();
}
