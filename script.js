/**
 * ============================================================================
 * Alexa+ Student Study Assistant - JavaScript
 * ============================================================================
 * A beginner-friendly script managing:
 * 1. Daily Study Task List (Add, Complete, Filter, Delete, and LocalStorage)
 * 2. Student Dashboard Statistics & Progress Bar
 * 3. Simulated AI Study Assistant (Offline conversational responses & prompt chips)
 *
 * NOTE: All AI responses are simulated locally using conditional logic
 * for educational and prototype demonstration purposes. No real AI or
 * Amazon Alexa+ service is connected.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. Initial State & Default Sample Data
// ----------------------------------------------------------------------------
const STORAGE_KEY = 'alexa_student_study_tasks';

// Default tasks for first-time visitors to demonstrate functionality
const DEFAULT_TASKS = [
  {
    id: 'task-1',
    title: 'Review Chapter 3 Biology notes on cell structures',
    subject: 'Science',
    priority: 'High',
    completed: false,
    createdAt: Date.now() - 3600000
  },
  {
    id: 'task-2',
    title: 'Practice 10 calculus derivatives problems',
    subject: 'Math',
    priority: 'Medium',
    completed: true,
    createdAt: Date.now() - 7200000
  },
  {
    id: 'task-3',
    title: 'Outline essay for World History presentation',
    subject: 'History',
    priority: 'Low',
    completed: false,
    createdAt: Date.now() - 10800000
  }
];

// App State
let tasks = [];
let currentFilter = 'all';

// ----------------------------------------------------------------------------
// 2. DOM Elements
// ----------------------------------------------------------------------------
// Dashboard & Stats
const greetingTextEl = document.getElementById('greeting-text');
const currentDateEl = document.getElementById('current-date');
const statTotalEl = document.getElementById('stat-total');
const statCompletedEl = document.getElementById('stat-completed');
const statPendingEl = document.getElementById('stat-pending');
const statProgressEl = document.getElementById('stat-progress');
const progressBarFillEl = document.getElementById('progress-bar-fill');
const taskCountBadgeEl = document.getElementById('task-count-badge');

// Task Form & List
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title-input');
const taskSubjectSelect = document.getElementById('task-subject-select');
const taskPrioritySelect = document.getElementById('task-priority-select');
const taskListEl = document.getElementById('task-list');
const emptyStateEl = document.getElementById('empty-state');
const filterBtns = document.querySelectorAll('.filter-btn');

// Chat Assistant
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatWindow = document.getElementById('chat-window');
const chatMessagesEl = document.getElementById('chat-messages');
const typingIndicatorEl = document.getElementById('typing-indicator');
const chipButtons = document.querySelectorAll('.chip-btn');

// ----------------------------------------------------------------------------
// 3. Local Storage Helpers
// ----------------------------------------------------------------------------

/**
 * Loads tasks from localStorage or falls back to default sample tasks
 */
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      tasks = JSON.parse(saved);
    } else {
      tasks = [...DEFAULT_TASKS];
      saveTasks();
    }
  } catch (error) {
    console.error('Error reading tasks from localStorage:', error);
    tasks = [...DEFAULT_TASKS];
  }
}

/**
 * Persists the current tasks array into the browser's localStorage
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
}

// ----------------------------------------------------------------------------
// 4. Date & Greeting Logic
// ----------------------------------------------------------------------------
function updateDateAndGreeting() {
  const now = new Date();
  
  // Format readable date (e.g. "Friday, October 24, 2026")
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDateEl.textContent = now.toLocaleDateString(undefined, options);

  // Dynamic greeting based on time of day
  const hour = now.getHours();
  let timeGreeting = 'Hello';
  if (hour < 12) {
    timeGreeting = 'Good morning';
  } else if (hour < 18) {
    timeGreeting = 'Good afternoon';
  } else {
    timeGreeting = 'Good evening';
  }
  greetingTextEl.textContent = `${timeGreeting}, Student! 👋`;
}

// ----------------------------------------------------------------------------
// 5. Dashboard Statistics
// ----------------------------------------------------------------------------
function updateDashboardStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotalEl.textContent = total;
  statCompletedEl.textContent = completed;
  statPendingEl.textContent = pending;
  statProgressEl.textContent = `${progressPercent}%`;
  progressBarFillEl.style.width = `${progressPercent}%`;

  taskCountBadgeEl.textContent = `${total} ${total === 1 ? 'task' : 'tasks'}`;
}

// ----------------------------------------------------------------------------
// 6. Task List Management (Add, Toggle, Delete, Filter)
// ----------------------------------------------------------------------------

/**
 * Renders the tasks list according to the active filter
 */
function renderTasks() {
  // Clear the list
  taskListEl.innerHTML = '';

  // Filter tasks based on the active tab
  const filteredTasks = tasks.filter(task => {
    if (currentFilter === 'pending') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true; // 'all'
  });

  // Handle empty state visibility
  if (filteredTasks.length === 0) {
    emptyStateEl.style.display = 'block';
  } else {
    emptyStateEl.style.display = 'none';
  }

  // Generate HTML for each task
  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    // Priority class for badge styling
    const priorityClass = `priority-${task.priority.toLowerCase()}`;

    li.innerHTML = `
      <div class="task-left">
        <input 
          type="checkbox" 
          class="task-checkbox" 
          aria-label="Mark task as completed" 
          ${task.completed ? 'checked' : ''}
        >
        <div class="task-details">
          <span class="task-title">${escapeHTML(task.title)}</span>
          <div class="task-meta">
            <span class="tag tag-subject">${escapeHTML(task.subject)}</span>
            <span class="tag ${priorityClass}">${escapeHTML(task.priority)}</span>
          </div>
        </div>
      </div>
      <button 
        type="button" 
        class="btn-delete" 
        title="Delete task" 
        aria-label="Delete ${escapeHTML(task.title)}"
      >
        🗑️
      </button>
    `;

    taskListEl.appendChild(li);
  });

  // Always keep dashboard stats in sync
  updateDashboardStats();
}

/**
 * Adds a new task to the list
 */
function handleAddTask(e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const subject = taskSubjectSelect.value;
  const priority = taskPrioritySelect.value;

  if (!title) {
    alert('Please enter a task description.');
    taskTitleInput.focus();
    return;
  }

  const newTask = {
    id: 'task-' + Date.now(),
    title,
    subject,
    priority,
    completed: false,
    createdAt: Date.now()
  };

  // Add new task to the beginning of the array
  tasks.unshift(newTask);
  saveTasks();
  renderTasks();

  // Reset input field and refocus
  taskTitleInput.value = '';
  taskTitleInput.focus();
}

/**
 * Handles clicks inside the task list (delegation for toggle & delete)
 */
function handleTaskListClick(e) {
  const taskItem = e.target.closest('.task-item');
  if (!taskItem) return;

  const taskId = taskItem.dataset.id;

  // 1. Delete button clicked
  if (e.target.closest('.btn-delete')) {
    deleteTask(taskId);
    return;
  }

  // 2. Checkbox toggled
  if (e.target.classList.contains('task-checkbox')) {
    toggleTaskStatus(taskId);
    return;
  }
}

/**
 * Toggles a task between completed and pending
 */
function toggleTaskStatus(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}

/**
 * Removes a task from the list
 */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

/**
 * Filter button click handler
 */
function handleFilterClick(e) {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;

  filterBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  currentFilter = btn.dataset.filter;
  renderTasks();
}

// ----------------------------------------------------------------------------
// 7. Simulated AI Study Assistant Logic
// ----------------------------------------------------------------------------

/**
 * Helper to escape HTML and prevent basic injection
 */
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Formats time string (e.g. "08:15 PM")
 */
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Appends a message bubble to the chat conversation
 */
function appendMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg msg-${sender}`;

  const avatar = sender === 'assistant' ? '🤖' : '🎓';
  const time = formatTime(new Date());

  msgDiv.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-bubble">
      ${text}
      <span class="msg-time">${time}</span>
    </div>
  `;

  chatMessagesEl.appendChild(msgDiv);
  scrollChatToBottom();
}

/**
 * Scrolls the chat box to the latest message
 */
function scrollChatToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Generates an offline simulated AI response based on student keywords.
 * Clearly educational: explains study techniques and reminds that it is simulated.
 */
function generateSimulatedResponse(rawInput) {
  const input = rawInput.toLowerCase().trim();

  // Keyword Matching Rules

  // 1. Pomodoro Technique
  if (input.includes('pomodoro') || input.includes('timer') || input.includes('25 min')) {
    return `
      <p><strong>⏱️ The Pomodoro Technique:</strong></p>
      <ul>
        <li><strong>Step 1:</strong> Pick a study task from your list.</li>
        <li><strong>Step 2:</strong> Set a timer for <strong>25 minutes</strong> and focus with zero distractions.</li>
        <li><strong>Step 3:</strong> Take a <strong>5-minute break</strong> (stretch, hydrate, rest your eyes).</li>
        <li><strong>Step 4:</strong> After 4 Pomodoros, reward yourself with a longer <strong>15–30 minute break</strong>!</li>
      </ul>
      <p><em>(Simulated reply: Try setting a timer for your highest priority task now!)</em></p>
    `;
  }

  // 2. Study tips / active recall / Feynman
  if (input.includes('study tip') || input.includes('technique') || input.includes('method') || input.includes('how to study')) {
    return `
      <p><strong>💡 3 Powerful Study Techniques:</strong></p>
      <ul>
        <li><strong>Active Recall:</strong> Test yourself instead of just re-reading notes. Close the book and write down everything you remember.</li>
        <li><strong>The Feynman Technique:</strong> Explain the concept in simple words as if teaching it to a 10-year-old.</li>
        <li><strong>Spaced Repetition:</strong> Review material at increasing intervals (Day 1, Day 3, Day 7) to lock it in long-term memory.</li>
      </ul>
      <p><em>(Simulated reply)</em></p>
    `;
  }

  // 3. Daily Schedule & Planning
  if (input.includes('schedule') || input.includes('plan') || input.includes('organize') || input.includes('routine')) {
    return `
      <p><strong>📅 Smart Daily Study Planning:</strong></p>
      <ul>
        <li><strong>"Eat the Frog":</strong> Tackle your most challenging subject first when your willpower is fresh.</li>
        <li><strong>Time-Blocking:</strong> Group your study hours into specific 45-minute blocks with defined outcomes.</li>
        <li><strong>Leave Buffer Time:</strong> Don't schedule every minute; leave 30 minutes open for review or catching up.</li>
      </ul>
      <p><em>(Simulated reply)</em></p>
    `;
  }

  // 4. Motivation & Encouragement
  if (input.includes('motivat') || input.includes('tired') || input.includes('lazy') || input.includes('give up') || input.includes('stress')) {
    return `
      <p><strong>⚡ Motivation Boost:</strong></p>
      <p><em>"Success is the sum of small efforts, repeated day in and day out."</em></p>
      <p>You don't have to finish everything right now. Just commit to doing <strong>5 focused minutes</strong> on one task. Often, starting is the hardest part!</p>
      <p><em>(Simulated reply)</em></p>
    `;
  }

  // 5. Current Task Summary
  if (input.includes('task') || input.includes('todo') || input.includes('left') || input.includes('pending')) {
    const pendingCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;
    return `
      <p><strong>📝 Your Current Study Status:</strong></p>
      <p>You have <strong>${pendingCount} pending task(s)</strong> and have completed <strong>${completedCount} task(s)</strong>.</p>
      ${pendingCount > 0 
        ? `<p>Focus on your next pending task: <em>"${escapeHTML(tasks.find(t => !t.completed).title)}"</em>.</p>` 
        : `<p>🎉 Awesome job! You've completed all tasks on your list!</p>`}
      <p><em>(Simulated reply connected to your local task list)</em></p>
    `;
  }

  // 6. Questions regarding Alexa+ or real AI backend
  if (input.includes('alexa') || input.includes('real ai') || input.includes('chatgpt') || input.includes('api') || input.includes('backend')) {
    return `
      <p><strong>ℹ️ About Alexa+ & AI Integration:</strong></p>
      <p>This application is currently a frontend beginner project running locally in your browser. All responses are simulated using pattern-matching rules.</p>
      <p>In a future upgrade, you can connect a backend server (like Node.js or Python) with a real AI API (such as Amazon Bedrock, Gemini, or OpenAI) to get live AI-generated responses!</p>
      <p><em>(Simulated reply)</em></p>
    `;
  }

  // 7. Math / Coding / Science specific tips
  if (input.includes('math') || input.includes('calculus') || input.includes('coding') || input.includes('code') || input.includes('science')) {
    return `
      <p><strong>📐 STEM & Coding Study Tip:</strong></p>
      <p>For technical subjects like Math and Coding, passive reading doesn't build skill. The golden rule is <strong>learning by doing</strong>:</p>
      <ul>
        <li>Solve problems without looking at solutions first.</li>
        <li>When an error or mistake occurs, write down why it happened before fixing it.</li>
        <li>Build mini-projects or write practice formulas from memory.</li>
      </ul>
      <p><em>(Simulated reply)</em></p>
    `;
  }

  // Fallback response
  return `
    <p>That's a thoughtful question! Here is a study tip:</p>
    <p>Try breaking this topic into smaller sub-questions, and test your understanding by explaining it out loud.</p>
    <p><em>Note: This is an offline prototype with simulated replies. Try asking about the <strong>Pomodoro technique</strong>, <strong>study tips</strong>, <strong>daily schedule</strong>, or <strong>motivation</strong>!</em></p>
  `;
}

/**
 * Handles sending a message in the chat
 */
function handleSendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  // 1. Display User Message
  appendMessage('user', escapeHTML(trimmed));
  chatInput.value = '';

  // 2. Show Typing Indicator
  typingIndicatorEl.style.display = 'flex';
  scrollChatToBottom();

  // 3. Disable send button temporarily during simulated delay
  const sendBtn = document.getElementById('send-chat-btn');
  sendBtn.disabled = true;

  // 4. Simulate a realistic response delay (500ms - 800ms)
  const delay = Math.floor(Math.random() * 300) + 500;
  setTimeout(() => {
    typingIndicatorEl.style.display = 'none';
    sendBtn.disabled = false;

    const responseHTML = generateSimulatedResponse(trimmed);
    appendMessage('assistant', responseHTML);
  }, delay);
}

// ----------------------------------------------------------------------------
// 8. Event Listeners & Initialization
// ----------------------------------------------------------------------------

function initializeApp() {
  // 1. Update Date and Greeting
  updateDateAndGreeting();

  // 2. Load Tasks and Render
  loadTasks();
  renderTasks();

  // 3. Initial Welcome Message in Chat
  appendMessage(
    'assistant',
    `
      <p>👋 <strong>Welcome to Alexa+ Student Study Assistant!</strong></p>
      <p>I'm your simulated study companion prototype. You can manage your daily study tasks on the left, or ask me for study tips, scheduling advice, and motivation!</p>
      <p><small><em>⚠️ Notice: Responses are simulated offline for educational practice. No live AI service is connected.</em></small></p>
    `
  );

  // 4. Task Form Submission
  taskForm.addEventListener('submit', handleAddTask);

  // 5. Task List Click Delegation (Checkboxes & Delete Buttons)
  taskListEl.addEventListener('click', handleTaskListClick);

  // 6. Filter Buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });

  // 7. Chat Form Submission
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    handleSendMessage(chatInput.value);
  });

  // 8. Suggestion Chips Clicks
  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.dataset.prompt;
      if (promptText) {
        handleSendMessage(promptText);
      }
    });
  });
}

// Start app once DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
