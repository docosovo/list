let tasks = [];
let objectives = [];
let currentEditId = null;
let currentEditObjectiveId = null;
let currentImageTarget = null;
let objectiveIntervals = {};

const tasksListEl = document.getElementById('tasksList');
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const statsCounter = document.getElementById('statsCounter');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const editModal = document.getElementById('editModal');
const editInput = document.getElementById('editInput');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const objectivesListEl = document.getElementById('objectivesList');
const newObjectiveInput = document.getElementById('newObjectiveInput');
const addObjectiveBtn = document.getElementById('addObjectiveBtn');
const editObjectiveModal = document.getElementById('editObjectiveModal');
const editObjectiveInput = document.getElementById('editObjectiveInput');
const saveObjectiveEditBtn = document.getElementById('saveObjectiveEditBtn');
const cancelObjectiveEditBtn = document.getElementById('cancelObjectiveEditBtn');

const imageModal = document.getElementById('imageModal');
const imageUrlInput = document.getElementById('imageUrlInput');
const imageFileInput = document.getElementById('imageFileInput');
const imagePreview = document.getElementById('imagePreview');
const saveImageBtn = document.getElementById('saveImageBtn');
const removeImageBtn = document.getElementById('removeImageBtn');
const cancelImageBtn = document.getElementById('cancelImageBtn');

const soundModal = document.getElementById('soundModal');
const presetSoundsContainer = document.getElementById('presetSounds');
const soundFileInput = document.getElementById('soundFileInput');
const saveSoundBtn = document.getElementById('saveSoundBtn');
const cancelSoundBtn = document.getElementById('cancelSoundBtn');
const currentSoundNameSpan = document.getElementById('currentSoundName');

const centerAlert = document.getElementById('centerAlert');
const alertMessageSpan = document.getElementById('alertMessage');
const alertImageContainer = document.getElementById('alertImageContainer');
const alertCloseBtn = document.getElementById('alertCloseBtn');

let currentAudio = null;
let isAlertActive = false;
let pendingAlert = null;
let isAudioPlaying = false;
let audioEnabled = false;

// Configuración de sonido actual
let currentSoundConfig = {
    type: 'preset',
    value: 'A_Toda_Velocidad',
    name: 'A Toda Velocidad',
    url: 'A_Toda_Velocidad.mp3'
};

// Sonidos predefinidos
const presetSoundsMap = {
    A_Toda_Velocidad: {
        url: 'A_Toda_Velocidad.mp3',
        name: 'A Toda Velocidad'
    },
    El_Templo_Del_adios: {
        url: 'El_Templo_Del_adios.mp3',
        name: 'El Templo del Adiós'
    }
};

// Variable para almacenar URL temporal del audio subido
let uploadedAudioUrl = null;
let uploadedAudioName = null;

// Renderizar la lista de sonidos predefinidos
function renderSoundList() {
    if (!presetSoundsContainer) return;
    
    let html = '';
    
    // Sonidos predefinidos
    for (const [key, sound] of Object.entries(presetSoundsMap)) {
        const isActive = (currentSoundConfig.type === 'preset' && currentSoundConfig.value === key);
        html += `
            <button class="preset-sound-btn ${isActive ? 'active' : ''}" data-sound="${key}">
                🎵 ${sound.name}
            </button>
        `;
    }
    
    // Mostrar audio subido temporalmente si existe
    if (uploadedAudioUrl) {
        const isActive = (currentSoundConfig.type === 'uploaded');
        html += `<div style="width:100%; margin: 8px 0 4px; font-size:0.7rem; color:#b28ad0;"><i class="bi bi-music-note"></i> Uploaded</div>`;
        html += `
            <button class="preset-sound-btn ${isActive ? 'active' : ''}" data-sound="uploaded">
                📁 ${escapeHtml(uploadedAudioName || 'Custom Audio')}
            </button>
        `;
    }
    
    presetSoundsContainer.innerHTML = html;
    
    // Re-asignar eventos a los botones de sonido
    document.querySelectorAll('.preset-sound-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const soundKey = btn.dataset.sound;
            
            if (soundKey === 'uploaded' && uploadedAudioUrl) {
                currentSoundConfig = {
                    type: 'uploaded',
                    value: 'uploaded',
                    name: uploadedAudioName || 'Custom Audio',
                    url: uploadedAudioUrl
                };
                updateCurrentSoundDisplay();
                testSound(uploadedAudioUrl, uploadedAudioName || 'Custom Audio');
            } else if (presetSoundsMap[soundKey]) {
                const sound = presetSoundsMap[soundKey];
                currentSoundConfig = {
                    type: 'preset',
                    value: soundKey,
                    name: sound.name,
                    url: sound.url
                };
                updateCurrentSoundDisplay();
                testSound(sound.url, sound.name);
            }
            
            // Actualizar clase activa
            document.querySelectorAll('.preset-sound-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Función para obtener la URL del sonido actual
function getCurrentSoundUrl() {
    return currentSoundConfig.url || presetSoundsMap.A_Toda_Velocidad.url;
}

// Guardar configuración de sonido en localStorage (solo la selección, no el audio)
function saveSoundConfig() {
    const configToSave = {
        type: currentSoundConfig.type,
        value: currentSoundConfig.value,
        name: currentSoundConfig.name
    };
    // No guardamos la URL del audio subido porque es temporal
    localStorage.setItem('alertSoundConfig', JSON.stringify(configToSave));
}

// Cargar configuración de sonido desde localStorage
function loadSoundConfig() {
    const saved = localStorage.getItem('alertSoundConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            if (config.type === 'preset' && presetSoundsMap[config.value]) {
                currentSoundConfig = {
                    type: 'preset',
                    value: config.value,
                    name: config.name,
                    url: presetSoundsMap[config.value].url
                };
            } else if (config.type === 'uploaded' && uploadedAudioUrl) {
                currentSoundConfig = {
                    type: 'uploaded',
                    value: 'uploaded',
                    name: config.name || 'Custom Audio',
                    url: uploadedAudioUrl
                };
            }
            updateCurrentSoundDisplay();
        } catch(e) {
            console.log('Error loading sound config');
        }
    }
}

function updateCurrentSoundDisplay() {
    if (currentSoundNameSpan) {
        currentSoundNameSpan.textContent = currentSoundConfig.name || 'A Toda Velocidad';
    }
}

// Función para reproducir audio completo (para la alerta)
function playFullAudio() {
    stopAlertSound();
    isAudioPlaying = true;
    
    const soundUrl = getCurrentSoundUrl();
    
    if (!soundUrl) {
        console.error('No sound URL available');
        return;
    }
    
    try {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        
        currentAudio = new Audio(soundUrl);
        currentAudio.volume = 0.7;
        currentAudio.loop = true;
        
        currentAudio.addEventListener('error', (e) => {
            console.error('Error loading audio:', soundUrl, e);
            stopAlertSound();
        });
        
        const playPromise = currentAudio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Audio playback failed:', error);
                stopAlertSound();
            });
        }
        
    } catch (e) {
        console.error('Audio creation error:', e);
        stopAlertSound();
    }
}

function stopAlertSound() {
    isAudioPlaying = false;
    
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

// Probar un sonido (reproduce una breve muestra)
function testSound(url, name) {
    if (!url) {
        console.log('No sound URL provided');
        return;
    }
    
    const testAudio = new Audio(url);
    testAudio.volume = 0.5;
    
    const playPromise = testAudio.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(e => console.log('Test failed:', e));
    }
    
    // Detener después de 3 segundos
    setTimeout(() => {
        testAudio.pause();
        testAudio.currentTime = 0;
    }, 3000);
}

// Función para subir audio temporalmente
function uploadTemporaryAudio(file) {
    return new Promise((resolve, reject) => {
        // Limpiar URL anterior si existe
        if (uploadedAudioUrl) {
            URL.revokeObjectURL(uploadedAudioUrl);
        }
        
        const url = URL.createObjectURL(file);
        uploadedAudioUrl = url;
        uploadedAudioName = file.name.replace(/\.[^/.]+$/, '');
        
        // Seleccionar automáticamente el audio subido
        currentSoundConfig = {
            type: 'uploaded',
            value: 'uploaded',
            name: uploadedAudioName,
            url: uploadedAudioUrl
        };
        updateCurrentSoundDisplay();
        saveSoundConfig();
        renderSoundList();
        
        // Probar el sonido
        testSound(uploadedAudioUrl, uploadedAudioName);
        
        resolve({ url, name: uploadedAudioName });
    });
}

// Funciones del modal de sonido
function openSoundModal() {
    renderSoundList();
    soundModal.classList.add('active');
}

function closeSoundModal() {
    soundModal.classList.remove('active');
}

function applySound() {
    saveSoundConfig();
    closeSoundModal();
    if (currentAudio) {
        const wasPlaying = isAudioPlaying;
        stopAlertSound();
        if (wasPlaying && centerAlert.classList.contains('show')) {
            playFullAudio();
        }
    }
}

// ============ FUNCIONES DE ALERTA ============
function showCenterAlert(message, imageUrl = null) {
    if (isAlertActive) {
        pendingAlert = { message, imageUrl };
        return;
    }
    
    isAlertActive = true;
    
    alertMessageSpan.textContent = message;
    if (imageUrl && imageUrl.trim()) {
        alertImageContainer.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="reminder image" onerror="this.style.display='none'">`;
    } else {
        alertImageContainer.innerHTML = '';
    }
    centerAlert.classList.add('show');
    playFullAudio();
}

function closeCenterAlert() {
    centerAlert.classList.remove('show');
    alertImageContainer.innerHTML = '';
    stopAlertSound();
    
    isAlertActive = false;
    
    if (pendingAlert) {
        setTimeout(() => {
            showCenterAlert(pendingAlert.message, pendingAlert.imageUrl);
            pendingAlert = null;
        }, 300);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && centerAlert.classList.contains('show')) {
        closeCenterAlert();
    }
});

function enableAudioOnUserInteraction() {
    if (audioEnabled) return;
    
    const testAudio = new Audio(getCurrentSoundUrl());
    testAudio.play().then(() => {
        testAudio.pause();
        testAudio.currentTime = 0;
        audioEnabled = true;
    }).catch(e => console.log('Waiting for user interaction...'));
    
    document.removeEventListener('click', enableAudioOnUserInteraction);
    document.removeEventListener('keydown', enableAudioOnUserInteraction);
}

// ============ FUNCIONES UTILITARIAS ============
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showReminderMessage(objective) {
    const messages = ["Don't forget:", "Remember:", "Important!", "Don't miss:", "You have pending:", "Don't forget about:"];
    const randomPrefix = messages[Math.floor(Math.random() * messages.length)];
    showCenterAlert(`${randomPrefix} "${objective.text}"`, objective.imageUrl);
}

// ============ TIMER FUNCTIONS ============
function stopObjectiveTimer(objectiveId) {
    if (objectiveIntervals[objectiveId]) {
        clearInterval(objectiveIntervals[objectiveId]);
        delete objectiveIntervals[objectiveId];
    }
}

function startObjectiveTimer(objective) {
    stopObjectiveTimer(objective.id);
    if (objective.completed || !objective.reminderIntervalSeconds || objective.reminderIntervalSeconds <= 0 || !objective.reminderActive) return;
    const intervalMs = objective.reminderIntervalSeconds * 1000;
    objectiveIntervals[objective.id] = setInterval(() => {
        const currentObjective = objectives.find(obj => obj.id === objective.id);
        if (currentObjective && !currentObjective.completed && currentObjective.reminderActive) {
            showReminderMessage(currentObjective);
        } else if (currentObjective && (currentObjective.completed || !currentObjective.reminderActive)) {
            stopObjectiveTimer(objective.id);
        }
    }, intervalMs);
}

// ============ LOCAL STORAGE ============
function saveToLocalStorage() {
    localStorage.setItem('todoListPastel', JSON.stringify(tasks));
    localStorage.setItem('dontForgetList', JSON.stringify(objectives));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('todoListPastel');
    if (stored) {
        try {
            tasks = JSON.parse(stored);
            tasks = tasks.filter(t => t.text !== undefined);
        } catch(e) { tasks = []; }
    } else {
        tasks = [];
    }
    
    const storedObjectives = localStorage.getItem('dontForgetList');
    if (storedObjectives) {
        try {
            objectives = JSON.parse(storedObjectives);
            objectives = objectives.filter(obj => obj.text !== undefined);
        } catch(e) { objectives = []; }
    } else {
        objectives = [];
    }
    
    restartAllTimers();
}

function restartAllTimers() {
    Object.keys(objectiveIntervals).forEach(key => clearInterval(objectiveIntervals[key]));
    objectiveIntervals = {};
    objectives.forEach(obj => {
        if (!obj.completed && obj.reminderActive && obj.reminderIntervalSeconds > 0) {
            startObjectiveTimer(obj);
        }
    });
}

// ============ TASK FUNCTIONS ============
function updateStats() {
    const total = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;
    statsCounter.innerHTML = `<i class="bi bi-bar-chart-steps"></i> ${total} task${total !== 1 ? 's' : ''} · ${completedCount} completed${completedCount !== 1 ? 's' : ''}`;
    saveToLocalStorage();
}

function renderTasks() {
    if (!tasksListEl) return;
    if (tasks.length === 0) {
        tasksListEl.innerHTML = `<div class="empty-message"><i class="bi bi-flower1"></i> Empty list · add new goals <i class="bi bi-flower1"></i></div>`;
        updateStats();
        return;
    }
    let html = '';
    tasks.forEach(task => {
        const completedClass = task.completed ? 'completed' : '';
        html += `
            <div class="task-item ${completedClass}" data-id="${task.id}">
                <div class="task-main">
                    <div class="task-left" data-toggle="${task.id}">
                        <div class="task-check"></div>
                        <div class="task-text">${escapeHtml(task.text)}</div>
                    </div>
                    <div class="task-actions">
                        <button class="image-btn" data-image="${task.id}" title="Add image"><i class="bi bi-image"></i></button>
                        <button class="edit-btn" data-edit="${task.id}" title="Edit"><i class="bi bi-pencil"></i></button>
                        <button class="delete-btn" data-delete="${task.id}" title="Delete"><i class="bi bi-trash3"></i></button>
                    </div>
                </div>
                ${task.imageUrl ? `<div class="task-image"><img src="${escapeHtml(task.imageUrl)}" alt="task image" onclick="window.open('${escapeHtml(task.imageUrl)}', '_blank')"></div>` : ''}
            </div>
        `;
    });
    tasksListEl.innerHTML = html;
    updateStats();
}

function addNewTask() {
    let newText = newTaskInput.value.trim();
    if (newText === "") return;
    const newTask = { id: Date.now(), text: newText, completed: false, imageUrl: null };
    tasks.push(newTask);
    newTaskInput.value = "";
    renderTasks();
}

function deleteTaskById(id) {
    tasks = tasks.filter(task => task.id !== id);
    renderTasks();
}

function toggleCompleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        renderTasks();
    }
}

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    currentEditId = id;
    editInput.value = task.text;
    editModal.classList.add('active');
}

function saveEditTask() {
    if (currentEditId === null) return;
    const newText = editInput.value.trim();
    if (newText === "") return;
    const taskIndex = tasks.findIndex(t => t.id === currentEditId);
    if (taskIndex !== -1) {
        tasks[taskIndex].text = newText;
        renderTasks();
    }
    closeModal();
}

function closeModal() {
    editModal.classList.remove('active');
    currentEditId = null;
    editInput.value = "";
}

function clearCompletedTasks() {
    tasks = tasks.filter(task => !task.completed);
    renderTasks();
}

// ============ IMAGE FUNCTIONS ============
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function openImageModal(targetType, targetId) {
    currentImageTarget = { type: targetType, id: targetId };
    let currentImageUrl = '';
    if (targetType === 'task') {
        const task = tasks.find(t => t.id === targetId);
        currentImageUrl = task?.imageUrl || '';
    } else if (targetType === 'objective') {
        const obj = objectives.find(o => o.id === targetId);
        currentImageUrl = obj?.imageUrl || '';
    }
    imageUrlInput.value = currentImageUrl || '';
    updateImagePreview(currentImageUrl);
    imageModal.classList.add('active');
}

function updateImagePreview(url) {
    if (url && url.trim()) {
        imagePreview.innerHTML = `<img src="${escapeHtml(url)}" alt="preview" onerror="this.style.display='none'">`;
    } else {
        imagePreview.innerHTML = '<span style="color:#b59ad0; padding:20px;"><i class="bi bi-image"></i> Image preview</span>';
    }
}

async function saveImage() {
    if (!currentImageTarget) return;
    let imageUrl = imageUrlInput.value.trim();
    if (imageFileInput.files && imageFileInput.files[0]) {
        try {
            imageUrl = await convertFileToBase64(imageFileInput.files[0]);
        } catch (error) {
            console.error('Error converting image:', error);
        }
    }
    if (currentImageTarget.type === 'task') {
        const task = tasks.find(t => t.id === currentImageTarget.id);
        if (task) task.imageUrl = imageUrl || null;
        renderTasks();
    } else if (currentImageTarget.type === 'objective') {
        const obj = objectives.find(o => o.id === currentImageTarget.id);
        if (obj) obj.imageUrl = imageUrl || null;
        renderObjectives();
    }
    closeImageModal();
}

function removeImage() {
    if (!currentImageTarget) return;
    if (currentImageTarget.type === 'task') {
        const task = tasks.find(t => t.id === currentImageTarget.id);
        if (task) task.imageUrl = null;
        renderTasks();
    } else if (currentImageTarget.type === 'objective') {
        const obj = objectives.find(o => o.id === currentImageTarget.id);
        if (obj) obj.imageUrl = null;
        renderObjectives();
    }
    closeImageModal();
}

function closeImageModal() {
    imageModal.classList.remove('active');
    currentImageTarget = null;
    imageUrlInput.value = '';
    imageFileInput.value = '';
    imagePreview.innerHTML = '<span style="color:#b59ad0; padding:20px;"><i class="bi bi-image"></i> Image preview</span>';
}

// ============ OBJECTIVE FUNCTIONS ============
function renderObjectives() {
    if (!objectivesListEl) return;
    if (objectives.length === 0) {
        objectivesListEl.innerHTML = `<div class="empty-message"><i class="bi bi-heart"></i> Add things you shouldn't forget <i class="bi bi-heart"></i></div>`;
        return;
    }
    let html = '';
    objectives.forEach(obj => {
        const completedClass = obj.completed ? 'completed' : '';
        const timerStatusClass = (obj.reminderActive && !obj.completed) ? 'active' : '';
        const statusText = (obj.reminderActive && !obj.completed) ? `<i class="bi bi-clock-history"></i> every ${obj.reminderIntervalSeconds}s` : (obj.completed ? '<i class="bi bi-check-circle-fill"></i> completed' : '<i class="bi bi-pause-circle"></i> paused');
        
        html += `
            <div class="objective-card ${completedClass}" data-obj-id="${obj.id}">
                <div class="objective-main">
                    <div class="objective-left" data-toggle-obj="${obj.id}">
                        <div class="objective-check"></div>
                        <div class="objective-text">${escapeHtml(obj.text)}</div>
                    </div>
                    <div class="objective-actions">
                        <button class="obj-image-btn" data-image-obj="${obj.id}" title="Add image"><i class="bi bi-image"></i></button>
                        <button class="obj-edit-btn" data-edit-obj="${obj.id}" title="Edit"><i class="bi bi-pencil"></i></button>
                        <button class="obj-delete-btn" data-delete-obj="${obj.id}" title="Delete"><i class="bi bi-trash3"></i></button>
                    </div>
                </div>
                ${obj.imageUrl ? `<div class="objective-image"><img src="${escapeHtml(obj.imageUrl)}" alt="reminder image" onclick="window.open('${escapeHtml(obj.imageUrl)}', '_blank')"></div>` : ''}
                <div class="objective-timer">
                    <div class="timer-controls">
                        <label><i class="bi bi-hourglass-split"></i> every</label>
                        <input type="number" min="5" step="5" value="${obj.reminderIntervalSeconds || 30}" class="timer-interval-input" data-obj-id="${obj.id}" placeholder="seconds">
                        <button class="set-timer-btn" data-set-timer="${obj.id}"><i class="bi bi-check-lg"></i> Apply</button>
                    </div>
                    <div class="timer-status ${timerStatusClass}">
                        ${statusText}
                    </div>
                    <div class="timer-actions">
                        ${!obj.completed && obj.reminderActive ? `<button class="pause-timer-btn" data-pause-timer="${obj.id}"><i class="bi bi-pause-fill"></i> Pause</button>` : ''}
                        ${!obj.completed && !obj.reminderActive ? `<button class="start-timer-btn" data-start-timer="${obj.id}"><i class="bi bi-play-fill"></i> Start</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    objectivesListEl.innerHTML = html;
    saveToLocalStorage();
}

function addNewObjective() {
    let newText = newObjectiveInput.value.trim();
    if (newText === "") return;
    const newObjective = {
        id: Date.now(),
        text: newText,
        completed: false,
        reminderIntervalSeconds: 30,
        reminderActive: true,
        imageUrl: null
    };
    objectives.push(newObjective);
    newObjectiveInput.value = "";
    renderObjectives();
    startObjectiveTimer(newObjective);
}

function deleteObjectiveById(id) {
    stopObjectiveTimer(id);
    objectives = objectives.filter(obj => obj.id !== id);
    renderObjectives();
}

function toggleCompleteObjective(id) {
    const objective = objectives.find(obj => obj.id === id);
    if (objective) {
        objective.completed = !objective.completed;
        if (objective.completed) {
            stopObjectiveTimer(id);
            objective.reminderActive = false;
        } else if (objective.reminderIntervalSeconds > 0) {
            objective.reminderActive = true;
            startObjectiveTimer(objective);
        }
        renderObjectives();
    }
}

function setObjectiveTimer(id, seconds) {
    const objective = objectives.find(obj => obj.id === id);
    if (objective && !objective.completed) {
        objective.reminderIntervalSeconds = seconds;
        objective.reminderActive = true;
        stopObjectiveTimer(id);
        startObjectiveTimer(objective);
        renderObjectives();
    }
}

function toggleObjectiveTimerPause(id) {
    const objective = objectives.find(obj => obj.id === id);
    if (objective && !objective.completed) {
        if (objective.reminderActive) {
            stopObjectiveTimer(id);
            objective.reminderActive = false;
        } else {
            objective.reminderActive = true;
            startObjectiveTimer(objective);
        }
        renderObjectives();
    }
}

function openEditObjectiveModal(id) {
    const objective = objectives.find(obj => obj.id === id);
    if (!objective) return;
    currentEditObjectiveId = id;
    editObjectiveInput.value = objective.text;
    editObjectiveModal.classList.add('active');
}

function saveEditObjective() {
    if (currentEditObjectiveId === null) return;
    const newText = editObjectiveInput.value.trim();
    if (newText === "") return;
    const objIndex = objectives.findIndex(obj => obj.id === currentEditObjectiveId);
    if (objIndex !== -1) {
        objectives[objIndex].text = newText;
        renderObjectives();
    }
    closeObjectiveModal();
}

function closeObjectiveModal() {
    editObjectiveModal.classList.remove('active');
    currentEditObjectiveId = null;
    editObjectiveInput.value = "";
}

// ============ EVENT HANDLERS ============
function handleTaskListClick(e) {
    const target = e.target;
    if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
        const btn = target.classList.contains('delete-btn') ? target : target.closest('.delete-btn');
        if (btn && btn.dataset.delete) deleteTaskById(parseInt(btn.dataset.delete));
    } else if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
        const btn = target.classList.contains('edit-btn') ? target : target.closest('.edit-btn');
        if (btn && btn.dataset.edit) openEditModal(parseInt(btn.dataset.edit));
    } else if (target.classList.contains('image-btn') || target.closest('.image-btn')) {
        const btn = target.classList.contains('image-btn') ? target : target.closest('.image-btn');
        if (btn && btn.dataset.image) openImageModal('task', parseInt(btn.dataset.image));
    } else if (target.classList.contains('task-left') || target.closest('.task-left')) {
        const taskItem = target.closest('.task-item');
        if (taskItem && taskItem.dataset.id) toggleCompleteTask(parseInt(taskItem.dataset.id));
    }
}

function handleObjectivesClick(e) {
    const target = e.target;
    if (target.classList.contains('obj-delete-btn') || target.closest('.obj-delete-btn')) {
        const btn = target.classList.contains('obj-delete-btn') ? target : target.closest('.obj-delete-btn');
        if (btn && btn.dataset.deleteObj) deleteObjectiveById(parseInt(btn.dataset.deleteObj));
    } else if (target.classList.contains('obj-edit-btn') || target.closest('.obj-edit-btn')) {
        const btn = target.classList.contains('obj-edit-btn') ? target : target.closest('.obj-edit-btn');
        if (btn && btn.dataset.editObj) openEditObjectiveModal(parseInt(btn.dataset.editObj));
    } else if (target.classList.contains('obj-image-btn') || target.closest('.obj-image-btn')) {
        const btn = target.classList.contains('obj-image-btn') ? target : target.closest('.obj-image-btn');
        if (btn && btn.dataset.imageObj) openImageModal('objective', parseInt(btn.dataset.imageObj));
    } else if (target.classList.contains('objective-left') || target.closest('.objective-left')) {
        const objCard = target.closest('.objective-card');
        if (objCard && objCard.dataset.objId) toggleCompleteObjective(parseInt(objCard.dataset.objId));
    } else if (target.classList.contains('set-timer-btn')) {
        const objId = parseInt(target.dataset.setTimer);
        const inputField = document.querySelector(`.timer-interval-input[data-obj-id="${objId}"]`);
        if (inputField) {
            let seconds = parseInt(inputField.value);
            if (isNaN(seconds) || seconds < 5) seconds = 5;
            setObjectiveTimer(objId, seconds);
        }
    } else if (target.classList.contains('pause-timer-btn') && target.dataset.pauseTimer) {
        toggleObjectiveTimerPause(parseInt(target.dataset.pauseTimer));
    } else if (target.classList.contains('start-timer-btn') && target.dataset.startTimer) {
        toggleObjectiveTimerPause(parseInt(target.dataset.startTimer));
    }
}

function onEnterKey(e) { if (e.key === 'Enter') addNewTask(); }
function onObjectiveEnterKey(e) { if (e.key === 'Enter') addNewObjective(); }

// ============ FUNCIÓN PRINCIPAL INIT ============
function init() {
    loadSoundConfig();
    loadFromLocalStorage();
    renderTasks();
    renderObjectives();
    renderSoundList();

    addTaskBtn.addEventListener('click', addNewTask);
    newTaskInput.addEventListener('keypress', onEnterKey);
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    tasksListEl.addEventListener('click', handleTaskListClick);
    saveEditBtn.addEventListener('click', saveEditTask);
    cancelEditBtn.addEventListener('click', closeModal);
    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeModal(); });
    
    addObjectiveBtn.addEventListener('click', addNewObjective);
    newObjectiveInput.addEventListener('keypress', onObjectiveEnterKey);
    objectivesListEl.addEventListener('click', handleObjectivesClick);
    saveObjectiveEditBtn.addEventListener('click', saveEditObjective);
    cancelObjectiveEditBtn.addEventListener('click', closeObjectiveModal);
    editObjectiveModal.addEventListener('click', (e) => { if (e.target === editObjectiveModal) closeObjectiveModal(); });
    
    saveImageBtn.addEventListener('click', saveImage);
    removeImageBtn.addEventListener('click', removeImage);
    cancelImageBtn.addEventListener('click', closeImageModal);
    imageModal.addEventListener('click', (e) => { if (e.target === imageModal) closeImageModal(); });
    imageUrlInput.addEventListener('input', (e) => updateImagePreview(e.target.value));
    
    imageFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await convertFileToBase64(e.target.files[0]);
            updateImagePreview(base64);
            imageUrlInput.value = '';
        }
    });

    // Evento para subir archivo de audio temporalmente
    soundFileInput?.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            console.log('Subiendo archivo temporal:', file.name);
            await uploadTemporaryAudio(file);
            soundFileInput.value = '';
            
            // Mostrar mensaje de éxito
            const successMsg = document.createElement('div');
            successMsg.textContent = '✓ Audio uploaded! Select it from the list above';
            successMsg.style.cssText = 'color:#6a4e7e; font-size:0.7rem; margin-top:5px; background:#f0e8ff; padding:4px 10px; border-radius:20px; text-align:center;';
            const uploadArea = document.querySelector('.upload-sound-area');
            const oldMsg = uploadArea.querySelector('.upload-success-msg');
            if (oldMsg) oldMsg.remove();
            successMsg.className = 'upload-success-msg';
            uploadArea.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);
        }
    });

    saveSoundBtn?.addEventListener('click', applySound);
    cancelSoundBtn?.addEventListener('click', closeSoundModal);
    soundModal?.addEventListener('click', (e) => { if (e.target === soundModal) closeSoundModal(); });

    alertCloseBtn.addEventListener('click', closeCenterAlert);
    centerAlert.addEventListener('click', (e) => { 
        if (e.target === centerAlert) closeCenterAlert(); 
    });

    if (!audioEnabled) {
        document.addEventListener('click', enableAudioOnUserInteraction);
        document.addEventListener('keydown', enableAudioOnUserInteraction);
    }

    window.addEventListener('beforeunload', () => {
        Object.values(objectiveIntervals).forEach(interval => clearInterval(interval));
        stopAlertSound();
        // Limpiar URL temporal del audio
        if (uploadedAudioUrl) {
            URL.revokeObjectURL(uploadedAudioUrl);
        }
    });
}

// Botón para abrir configuración de sonido
const openSoundBtn = document.getElementById('openSoundSettingsBtn');
if (openSoundBtn) {
    openSoundBtn.addEventListener('click', openSoundModal);
}

init();