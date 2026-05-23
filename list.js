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

const centerAlert = document.getElementById('centerAlert');
const alertMessageSpan = document.getElementById('alertMessage');
const alertImageContainer = document.getElementById('alertImageContainer');
const alertCloseBtn = document.getElementById('alertCloseBtn');

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showCenterAlert(message, imageUrl = null) {
    alertMessageSpan.textContent = message;
    if (imageUrl && imageUrl.trim()) {
        alertImageContainer.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="reminder image" onerror="this.style.display='none'">`;
    } else {
        alertImageContainer.innerHTML = '';
    }
    centerAlert.classList.add('show');
}

function closeCenterAlert() {
    centerAlert.classList.remove('show');
    alertImageContainer.innerHTML = '';
}

alertCloseBtn.addEventListener('click', closeCenterAlert);
centerAlert.addEventListener('click', (e) => { 
    if (e.target === centerAlert) closeCenterAlert(); 
});

function showReminderMessage(objective) {
    const messages = ["Don't forget:", "Remember:", "Important!", "Don't miss:", "You have pending:", "Don't forget about:"];
    const randomPrefix = messages[Math.floor(Math.random() * messages.length)];
    showCenterAlert(`${randomPrefix} "${objective.text}"`, objective.imageUrl);
}

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

function init() {
    loadFromLocalStorage();
    renderTasks();
    renderObjectives();

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

    window.addEventListener('beforeunload', () => {
        Object.values(objectiveIntervals).forEach(interval => clearInterval(interval));
    });
}

init();