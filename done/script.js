// script.js
(function () {
  'use strict';

  // ============================================================
  // ==================== 설정 영역 (여기를 수정하세요) ====================
  // ============================================================

  // 특별 관리 학생 (과제 완료 체크 제외 - 대시보드에서 미완료로 표시되지 않음)
  const SPECIAL_STUDENTS = [
    // 예: '홍길동', '김철수'
  ];

  // 대시보드 자동 표시 시간 (요일별, 24시간 형식 HH:MM)
  // 0=일요일, 1=월요일, 2=화요일, 3=수요일, 4=목요일, 5=금요일, 6=토요일
  const DASHBOARD_SCHEDULE = {
    1: '15:30', // 월요일
    2: '15:30', // 화요일
    3: '14:00', // 수요일 (단축 수업일 경우)
    4: '15:30', // 목요일
    5: '14:30', // 금요일
  };

  // 기본 학생 명단
  const DEFAULT_STUDENTS = [
    '최명조', '김가은', '김라엘', '김지후', '신하은',
    '양하예', '유하연', '이채빈', '전소율', '전아인',
    '정예원', '조하빈', '최서연', '한서아', '노윤준',
    '여민준', '이현서', '정찬희', '지우담', '진재하',
    '한윤규', '홍아준'
  ];

  // 기본 드롭다운 옵션
  const DEFAULT_OPTIONS = ['리드포스쿨', '풀리수학', '우유', '수학익힘책', '청소'];

  // ============================================================
  // ==================== 설정 영역 끝 ====================
  // ============================================================

  // --- LocalStorage Keys ---
  const KEYS = {
    STUDENTS: 'students',
    OPTIONS: 'todoOptions',
    FONT_SIZE: 'fontSize',
    LAST_DATE: 'lastDate',
    ABSENT: 'absentStudents',
    DAILY_RECORDS: 'dailyRecords',
    SETTINGS_VISIBLE: 'settingsVisible' // 설정 버튼 표시 여부 저장
  };

  // --- State ---
  let students = [];
  let todoOptions = [];
  let fontSize = 18;
  let absentStudents = new Set();
  let dailyRecords = []; // { task: string, incomplete: string[] }
  let currentTask = '';
  let currentTaskCompleted = new Set();
  let dashboardShownToday = false;

  // --- DOM Elements ---
  const inputView = document.getElementById('inputView');
  const taskView = document.getElementById('taskView');
  const dashboardView = document.getElementById('dashboardView');

  const todoInput = document.getElementById('todoInput');
  const todoSelect = document.getElementById('todoSelect');
  const startBtn = document.getElementById('startBtn');

  const currentTaskTitle = document.getElementById('currentTaskTitle');
  const studentGrid = document.getElementById('studentGrid');
  const endBtn = document.getElementById('endBtn');

  const dashboardContent = document.getElementById('dashboardContent');
  const closeDashboardBtn = document.getElementById('closeDashboardBtn');

  const settingsBtn = document.getElementById('settingsBtn');
  const settingsTrigger = document.getElementById('settingsTrigger');
  const settingsModal = document.getElementById('settingsModal');
  const todoOptionsInput = document.getElementById('todoOptionsInput');
  const studentNamesInput = document.getElementById('studentNamesInput');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');

  // --- Initialization ---
  function init() {
    checkDateReset();
    loadData();
    populateDropdown();
    bindEvents();
    startScheduler();
    showView('input');

    // 설정 버튼 표시 상태 복구
    const isVisible = localStorage.getItem(KEYS.SETTINGS_VISIBLE) === 'true';
    if (isVisible) {
      settingsBtn.classList.remove('hidden');
    }
  }

  // --- Date Reset Check ---
  function getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function checkDateReset() {
    const lastDate = localStorage.getItem(KEYS.LAST_DATE);
    const today = getTodayString();

    if (lastDate !== today) {
      // 새로운 날: 모든 일일 데이터 초기화
      localStorage.removeItem(KEYS.ABSENT);
      localStorage.removeItem(KEYS.DAILY_RECORDS);
      localStorage.setItem(KEYS.LAST_DATE, today);
      dashboardShownToday = false;
    }
  }

  // --- Data Management ---
  function loadData() {
    students = JSON.parse(localStorage.getItem(KEYS.STUDENTS)) || [...DEFAULT_STUDENTS];
    todoOptions = JSON.parse(localStorage.getItem(KEYS.OPTIONS)) || [...DEFAULT_OPTIONS];
    fontSize = parseInt(localStorage.getItem(KEYS.FONT_SIZE), 10) || 18;
    absentStudents = new Set(JSON.parse(localStorage.getItem(KEYS.ABSENT)) || []);
    dailyRecords = JSON.parse(localStorage.getItem(KEYS.DAILY_RECORDS)) || [];

    // CSS 변수 초기화
    document.documentElement.style.setProperty('--student-font-size', fontSize + 'px');
  }

  function saveStudents() {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  }

  function saveOptions() {
    localStorage.setItem(KEYS.OPTIONS, JSON.stringify(todoOptions));
  }

  function saveFontSize() {
    localStorage.setItem(KEYS.FONT_SIZE, fontSize);
    document.documentElement.style.setProperty('--student-font-size', fontSize + 'px');
  }

  function saveAbsent() {
    localStorage.setItem(KEYS.ABSENT, JSON.stringify([...absentStudents]));
  }

  function saveDailyRecords() {
    localStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(dailyRecords));
  }

  // --- View Management ---
  function showView(view) {
    inputView.classList.remove('active');
    taskView.classList.remove('active');
    dashboardView.classList.remove('active');

    switch (view) {
      case 'input':
        inputView.classList.add('active');
        todoInput.value = '';
        todoInput.focus();
        break;
      case 'task':
        taskView.classList.add('active');
        renderGrid();
        break;
      case 'dashboard':
        dashboardView.classList.add('active');
        renderDashboard();
        break;
    }
  }

  // --- Dropdown ---
  function populateDropdown() {
    todoSelect.innerHTML = '<option value="">선택...</option>';
    todoOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      todoSelect.appendChild(option);
    });
  }

  // --- Grid Rendering ---
  function renderGrid() {
    studentGrid.innerHTML = '';

    students.forEach(name => {
      const cell = document.createElement('div');
      cell.className = 'student-cell';
      cell.textContent = name;

      // 결석 상태 체크
      if (absentStudents.has(name)) {
        cell.classList.add('absent');
      } else if (currentTaskCompleted.has(name)) {
        cell.classList.add('done');
      }

      // 클릭 이벤트 (완료 토글)
      cell.addEventListener('click', (e) => {
        // 트리플 클릭: 결석 토글
        if (e.detail === 3) {
          if (absentStudents.has(name)) {
            absentStudents.delete(name);
          } else {
            absentStudents.add(name);
            currentTaskCompleted.delete(name);
          }
          saveAbsent();
          renderGrid();
          return;
        }

        if (absentStudents.has(name)) return;

        // 싱글 클릭: 완료 토글
        if (e.detail === 1) {
          if (currentTaskCompleted.has(name)) {
            currentTaskCompleted.delete(name);
          } else {
            currentTaskCompleted.add(name);
          }
          renderGrid();
        }
      });

      // 터치 트리플 탭 지원
      let tapCount = 0;
      let tapTimer;
      cell.addEventListener('touchend', (e) => {
        tapCount++;
        if (tapCount === 3) {
          if (absentStudents.has(name)) {
            absentStudents.delete(name);
          } else {
            absentStudents.add(name);
            currentTaskCompleted.delete(name);
          }
          saveAbsent();
          renderGrid();
          tapCount = 0;
          clearTimeout(tapTimer);
          e.preventDefault();
          return;
        }
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapCount = 0; }, 600);
      });

      studentGrid.appendChild(cell);
    });
  }

  // --- Dashboard Rendering ---
  function renderDashboard() {
    dashboardContent.innerHTML = '';

    const studentTasks = {};
    students.forEach(name => {
      if (SPECIAL_STUDENTS.includes(name) || absentStudents.has(name)) return;
      studentTasks[name] = [];
    });

    dailyRecords.forEach(record => {
      record.incomplete.forEach(name => {
        if (studentTasks[name] !== undefined) {
          studentTasks[name].push(record.task);
        }
      });
    });

    const studentsWithTasks = Object.entries(studentTasks)
      .filter(([_, tasks]) => tasks.length > 0)
      .sort((a, b) => b[1].length - a[1].length);

    const allDoneStudents = Object.entries(studentTasks)
      .filter(([_, tasks]) => tasks.length === 0)
      .map(([name]) => name);

    if (studentsWithTasks.length === 0 && dailyRecords.length > 0) {
      const card = document.createElement('div');
      card.className = 'dashboard-card all-done';
      card.innerHTML = `<h3>🎉 축하합니다!</h3><p class="status">모든 학생이 오늘의 과제를 완료했습니다.</p>`;
      dashboardContent.appendChild(card);
    } else if (dailyRecords.length === 0) {
      const card = document.createElement('div');
      card.className = 'dashboard-card';
      card.innerHTML = `<h3>📝 기록 없음</h3><p class="status" style="color: rgba(255,255,255,0.7);">오늘 완료된 과제가 없습니다.</p>`;
      dashboardContent.appendChild(card);
    } else {
      studentsWithTasks.forEach(([name, tasks]) => {
        const card = document.createElement('div');
        card.className = 'dashboard-card';
        card.innerHTML = `<h3>👤 ${name}</h3><div class="tasks">${tasks.map(t => `<span class="task-tag">${t}</span>`).join('')}</div>`;
        dashboardContent.appendChild(card);
      });
      if (allDoneStudents.length > 0) {
        const card = document.createElement('div');
        card.className = 'dashboard-card all-done';
        card.innerHTML = `<h3>✅ 모두 완료 (${allDoneStudents.length}명)</h3><p class="status">${allDoneStudents.join(', ')}</p>`;
        dashboardContent.appendChild(card);
      }
    }
  }

  // --- Dashboard Scheduler ---
  function startScheduler() {
    setInterval(() => {
      checkDateReset();
      checkDashboardSchedule();
    }, 60000);
    checkDashboardSchedule();
  }

  function checkDashboardSchedule() {
    if (dashboardShownToday) return;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const scheduledTime = DASHBOARD_SCHEDULE[dayOfWeek];
    if (!scheduledTime) return;
    const [hour, minute] = scheduledTime.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    if (currentHour > hour || (currentHour === hour && currentMinute >= minute)) {
      dashboardShownToday = true;
      showView('dashboard');
    }
  }

  // --- Event Bindings ---
  function bindEvents() {
    startBtn.addEventListener('click', () => {
      const task = todoInput.value.trim() || todoSelect.value;
      if (!task) {
        todoInput.focus();
        todoInput.classList.add('shake');
        setTimeout(() => todoInput.classList.remove('shake'), 500);
        return;
      }
      currentTask = task;
      currentTaskCompleted = new Set();
      currentTaskTitle.textContent = task;
      showView('task');
    });

    todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startBtn.click();
    });

    todoSelect.addEventListener('change', () => {
      if (todoSelect.value) todoInput.value = '';
    });

    endBtn.addEventListener('click', () => {
      const incomplete = students.filter(name =>
        !currentTaskCompleted.has(name) &&
        !absentStudents.has(name) &&
        !SPECIAL_STUDENTS.includes(name)
      );
      if (currentTask) {
        dailyRecords.push({ task: currentTask, incomplete: incomplete });
        saveDailyRecords();
      }
      currentTask = '';
      currentTaskCompleted = new Set();
      showView('input');
    });

    closeDashboardBtn.addEventListener('click', () => showView('input'));

    // =======================================================
    // 설정 버튼 노출/숨김 트리플 클릭 로직
    // =======================================================

    // 1. 트리거 클릭 로직 (숨겨진 상태일 때 동작)
    settingsTrigger.addEventListener('click', (e) => {
      if (e.detail === 3) {
        settingsBtn.classList.remove('hidden');
        localStorage.setItem(KEYS.SETTINGS_VISIBLE, 'true');
      }
    });

    // 2. 설정 버튼 로직 (보이는 상태)
    let settingsClickTimer;
    let settingsClickCount = 0;

    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      settingsClickCount++;

      // 트리플 클릭 감지 (숨기기)
      if (settingsClickCount === 3) {
        settingsBtn.classList.add('hidden');
        localStorage.setItem(KEYS.SETTINGS_VISIBLE, 'false');
        clearTimeout(settingsClickTimer);
        settingsClickCount = 0;
        return;
      }

      // 싱글 클릭 액션 (모달 열기) - 지연 실행
      clearTimeout(settingsClickTimer);
      settingsClickTimer = setTimeout(() => {
        if (settingsClickCount === 1) {
          // 모달 오픈 로직
          todoOptionsInput.value = todoOptions.join(', ');
          studentNamesInput.value = students.join(', ');
          fontSizeSlider.value = fontSize;
          fontSizeValue.textContent = fontSize;
          settingsModal.classList.add('active');
        }
        settingsClickCount = 0;
      }, 300); // 0.3초 대기
    });

    // 설정 모달 배경 클릭
    settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => {
      settingsModal.classList.remove('active');
    });

    fontSizeSlider.addEventListener('input', () => {
      fontSize = parseInt(fontSizeSlider.value, 10);
      fontSizeValue.textContent = fontSize;
      saveFontSize();
    });

    closeSettingsBtn.addEventListener('click', () => {
      const newOptions = todoOptionsInput.value.split(',').map(s => s.trim()).filter(Boolean);
      if (newOptions.length > 0) {
        todoOptions = newOptions;
        saveOptions();
        populateDropdown();
      }
      const newStudents = studentNamesInput.value.split(',').map(s => s.trim()).filter(Boolean);
      if (newStudents.length > 0) {
        students = newStudents;
        saveStudents();
        absentStudents = new Set([...absentStudents].filter(n => students.includes(n)));
        saveAbsent();
      }
      if (taskView.classList.contains('active')) renderGrid();
      settingsModal.classList.remove('active');
    });
  }

  // --- Start ---
  init();
})();
