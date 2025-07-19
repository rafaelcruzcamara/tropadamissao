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
const elements = {
    userModal: document.getElementById('userModal'),
    userNameInput: document.getElementById('userNameInput'),
    saveUserBtn: document.getElementById('saveUserBtn'),
    avatarUpload: document.getElementById('avatarUpload'),
    avatarPreview: document.getElementById('avatarPreview'),
    currentUserAvatar: document.getElementById('currentUserAvatar'),
    currentUserName: document.getElementById('currentUserName'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    cameraBtn: document.getElementById('cameraBtn')
};

// Estado do usuário
const user = {
    id: localStorage.getItem('userId') || 'user_' + Math.random().toString(36).substr(2, 9),
    name: localStorage.getItem('userName') || null,
    avatar: localStorage.getItem('userAvatar') || null
};

// Inicialização
function init() {
    setupEventListeners();
    
    if (!user.name) {
        showUserModal();
    } else {
        updateUserUI();
        loadMessages();
    }
}

// Configura listeners
function setupEventListeners() {
    // Usuário
    elements.saveUserBtn.addEventListener('click', saveUser);
    elements.editProfileBtn.addEventListener('click', () => showUserModal(true));
    elements.avatarUpload.addEventListener('change', uploadAvatar);
    
    // Mensagens
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Câmera
    elements.cameraBtn.addEventListener('click', () => {
        alert('Funcionalidade de câmera será implementada na próxima versão');
    });
}

// Funções do usuário
function showUserModal(isEditing = false) {
    elements.userModal.style.display = 'flex';
    elements.userNameInput.value = user.name || '';
    updateAvatarPreview();
    
    if (isEditing) {
        elements.userNameInput.select();
    }
}

function updateAvatarPreview() {
    if (user.avatar) {
        elements.avatarPreview.style.backgroundImage = `url(${user.avatar})`;
        elements.avatarPreview.textContent = '';
    } else {
        elements.avatarPreview.style.backgroundImage = '';
        elements.avatarPreview.textContent = getInitials(user.name);
    }
}

function updateUserUI() {
    elements.currentUserName.textContent = user.name || 'Usuário';
    
    if (user.avatar) {
        elements.currentUserAvatar.style.backgroundImage = `url(${user.avatar})`;
        elements.currentUserAvatar.textContent = '';
    } else {
        elements.currentUserAvatar.style.backgroundImage = '';
        elements.currentUserAvatar.textContent = getInitials(user.name);
    }
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
        .filter(part => part.length > 0)
        .map(part => part[0].toUpperCase())
        .join('')
        .substring(0, 2);
}

async function saveUser() {
    const name = elements.userNameInput.value.trim();
    if (!name) {
        alert('Por favor, digite um nome válido');
        return;
    }

    try {
        // Atualiza o usuário
        user.name = name;
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userName', name);
        
        if (user.avatar) {
            localStorage.setItem('userAvatar', user.avatar);
        }

        // Fecha o modal e atualiza a UI
        elements.userModal.style.display = 'none';
        updateUserUI();
        
        // Se for novo usuário, carrega as mensagens
        if (!elements.messagesContainer.hasChildNodes()) {
            loadMessages();
        }
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        alert('Erro ao salvar. Tente novamente.');
    }
}

async function uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        // Mostra preview
        const reader = new FileReader();
        reader.onload = (event) => {
            user.avatar = event.target.result;
            updateAvatarPreview();
        };
        reader.readAsDataURL(file);

        // Faz upload para o Firebase Storage
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`avatars/${user.id}`);
        await fileRef.put(file);
        const downloadURL = await fileRef.getDownloadURL();
        user.avatar = downloadURL;
        localStorage.setItem('userAvatar', downloadURL);
    } catch (error) {
        console.error('Erro ao carregar avatar:', error);
        alert('Erro ao carregar foto. Tente novamente.');
    }
}

// Funções de mensagem
function loadMessages() {
    db.collection('messages')
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            elements.messagesContainer.innerHTML = '';
            snapshot.forEach(doc => {
                displayMessage(doc.data());
            });
            scrollToBottom();
        }, error => {
            console.error('Erro ao carregar mensagens:', error);
        });
}

function displayMessage(message) {
    const isCurrentUser = message.userId === user.id;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    
    // Avatar (para mensagens recebidas)
    if (!isCurrentUser) {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (message.userAvatar) {
            avatar.style.backgroundImage = `url(${message.userAvatar})`;
        } else {
            avatar.textContent = getInitials(message.userName);
        }
        
        messageElement.appendChild(avatar);
    }
    
    // Conteúdo da mensagem
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.content;
    messageElement.appendChild(content);
    
    // Timestamp
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(message.timestamp?.toDate() || new Date());
    messageElement.appendChild(time);
    
    elements.messagesContainer.appendChild(messageElement);
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function sendMessage() {
    const text = elements.messageInput.value.trim();
    if (!text || !user.name) return;

    try {
        await db.collection('messages').add({
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            content: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        elements.messageInput.value = '';
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem. Tente novamente.');
    }
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Inicia o app
init();
