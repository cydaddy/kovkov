// script.js
(function () {
  'use strict';

  // --- Global Error Reporting (For Debugging) ---
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorMsg = `Error: ${msg}\nLine: ${lineNo}`;
    console.error(errorMsg);
    // 화면에 에러 표시
    const errorBox = document.createElement('div');
    errorBox.style.position = 'fixed';
    errorBox.style.top = '0';
    errorBox.style.left = '0';
    errorBox.style.width = '100%';
    errorBox.style.background = 'red';
    errorBox.style.color = 'white';
    errorBox.style.padding = '10px';
    errorBox.style.zIndex = '999999';
    errorBox.style.fontWeight = 'bold';
    errorBox.textContent = `🚨 JS 오류 발생: ${msg} (Line ${lineNo})`;
    document.body.prepend(errorBox);
    return false;
  };

  // ============================================================
  // ==================== 설정 영역 (여기를 수정하세요) ====================
  // ============================================================

  // 특별 관리 학생 (과제 완료 체크 제외 - 대시보드에서 미완료로 표시되지 않음)
  const SPECIAL_STUDENTS = [];

  // 대시보드 자동 표시 트리거 과제
  const DASHBOARD_TRIGGER_TASK = '청소';

  // 기본 학생 명단 (유명인 가명)
  const DEFAULT_STUDENTS = [
    '유재석', '박명수', '아이유', '손흥민', '김연아',
    '차은우', '카리나', '장원영', '페이커', '봉준호',
    '마동석', '김혜수', '이정재', '송혜교', '강호동',
    '이효리', '지드래곤', '박보검', '김수현', '전지현',
    '공유', '현빈'
  ];

  // 기본 드롭다운 옵션
  const DEFAULT_OPTIONS = ['리드포스쿨', '풀리수학', '우유', '수학익힘책', '청소'];

  // ============================================================
  // ==================== 설정 영역 끝 ====================
  // ============================================================

  // --- LocalStorage Keys ---
  const KEYS = {
    STUDENTS: 'students_v2', // 명단 변경으로 인한 키 업데이트
    OPTIONS: 'todoOptions',
    FONT_SIZE: 'fontSize',
    LAST_DATE: 'lastDate',
    ABSENT: 'absentStudents',
    DAILY_RECORDS: 'dailyRecords',
    SETTINGS_VISIBLE: 'settingsVisible'
  };

  // --- State ---
  let students = [];
  let todoOptions = [];
  let fontSize = 20;
  let pendingConfirmStudent = null;
  let absentStudents = new Set();
  let dailyRecords = [];
  let currentTask = '';
  let currentTaskCompleted = new Set();
  let dashboardShownToday = false;
  let endBtnClickCount = 0;
  let endBtnClickTimer = null;

  // --- DOM Elements (Initialized in init) ---
  let inputView, taskView, dashboardView;
  let todoInput, todoSelect, startBtn;
  let currentTaskTitle, studentGrid, endBtn;
  let dashboardContent, closeDashboardBtn;
  let settingsBtn, settingsTrigger, settingsModal, todoOptionsInput, studentNamesInput, fontSizeSlider, fontSizeValue, closeSettingsBtn, showDashboardBtn;
  let confirmModal, confirmYes, confirmNo;
  let endConfirmModal, endConfirmYes, endConfirmNo;
  let toast;
  let toastTimer;

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    try {
      initDOM();
      init();
    } catch (e) {
      console.error(e);
      window.onerror(e.message, 'script.js', 0, 0, e);
    }
  });

  function initDOM() {
    inputView = document.getElementById('inputView');
    taskView = document.getElementById('taskView');
    dashboardView = document.getElementById('dashboardView');

    todoInput = document.getElementById('todoInput');
    todoSelect = document.getElementById('todoSelect');
    startBtn = document.getElementById('startBtn');

    currentTaskTitle = document.getElementById('currentTaskTitle');
    studentGrid = document.getElementById('studentGrid');
    endBtn = document.getElementById('endBtn');

    dashboardContent = document.getElementById('dashboardContent');
    closeDashboardBtn = document.getElementById('closeDashboardBtn');

    settingsBtn = document.getElementById('settingsBtn');
    settingsTrigger = document.getElementById('settingsTrigger');
    settingsModal = document.getElementById('settingsModal');
    todoOptionsInput = document.getElementById('todoOptionsInput');
    studentNamesInput = document.getElementById('studentNamesInput');
    fontSizeSlider = document.getElementById('fontSizeSlider');
    fontSizeValue = document.getElementById('fontSizeValue');
    closeSettingsBtn = document.getElementById('closeSettingsBtn');
    showDashboardBtn = document.getElementById('showDashboardBtn');

    confirmModal = document.getElementById('confirmModal');
    confirmYes = document.getElementById('confirmYes');
    confirmNo = document.getElementById('confirmNo');

    endConfirmModal = document.getElementById('endConfirmModal');
    endConfirmYes = document.getElementById('endConfirmYes');
    endConfirmNo = document.getElementById('endConfirmNo');

    toast = document.getElementById('toast');

    // 필수 요소 체크
    if (!endBtn) throw new Error("endBtn element not found!");
    if (!settingsTrigger) throw new Error("settingsTrigger element not found!");
  }

  function init() {
    checkDateReset();
    loadData();
    populateDropdown();
    bindEvents();
    showView('input');

    const isVisible = localStorage.getItem(KEYS.SETTINGS_VISIBLE) === 'true';
    if (isVisible && settingsBtn) {
      settingsBtn.classList.remove('hidden');
    }

    console.log('Class Manager Initialized');
    showToast('프로그램이 시작되었습니다.');
  }

  // --- Helper Functions ---
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  function getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function checkDateReset() {
    const lastDate = localStorage.getItem(KEYS.LAST_DATE);
    const today = getTodayString();
    if (lastDate !== today) {
      localStorage.removeItem(KEYS.ABSENT);
      localStorage.removeItem(KEYS.DAILY_RECORDS);
      localStorage.setItem(KEYS.LAST_DATE, today);
      dashboardShownToday = false;
    }
  }

  function loadData() {
    students = JSON.parse(localStorage.getItem(KEYS.STUDENTS)) || [...DEFAULT_STUDENTS];
    todoOptions = JSON.parse(localStorage.getItem(KEYS.OPTIONS)) || [...DEFAULT_OPTIONS];
    fontSize = parseInt(localStorage.getItem(KEYS.FONT_SIZE), 10) || 20;
    absentStudents = new Set(JSON.parse(localStorage.getItem(KEYS.ABSENT)) || []);
    dailyRecords = JSON.parse(localStorage.getItem(KEYS.DAILY_RECORDS)) || [];
    document.documentElement.style.setProperty('--student-font-size', fontSize + 'px');
  }

  function populateDropdown() {
    if (!todoSelect) return;
    todoSelect.innerHTML = '<option value="">선택...</option>';
    todoOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      todoSelect.appendChild(option);
    });
  }

  function showView(view) {
    if (inputView) inputView.classList.remove('active');
    if (taskView) taskView.classList.remove('active');
    if (dashboardView) dashboardView.classList.remove('active');

    switch (view) {
      case 'input':
        if (inputView) {
          inputView.classList.add('active');
          if (todoInput) {
            todoInput.value = '';
            todoInput.focus();
          }
        }
        break;
      case 'task':
        if (taskView) {
          taskView.classList.add('active');
          renderGrid();
        }
        break;
      case 'dashboard':
        if (dashboardView) {
          dashboardView.classList.add('active');
          renderDashboard();
        }
        break;
    }
  }

  function renderGrid() {
    if (!studentGrid) return;
    studentGrid.innerHTML = '';

    students.forEach(name => {
      const cell = document.createElement('div');
      cell.className = 'student-cell';
      cell.textContent = name;

      if (absentStudents.has(name)) {
        cell.classList.add('absent');
      } else if (currentTaskCompleted.has(name)) {
        cell.classList.add('done');
      }

      cell.addEventListener('click', (e) => {
        // Triple click logic for absent
        if (e.detail === 3) {
          if (absentStudents.has(name)) {
            absentStudents.delete(name);
          } else {
            absentStudents.add(name);
            currentTaskCompleted.delete(name);
          }
          saveLocalStorage();
          renderGrid();
          return;
        }

        if (absentStudents.has(name)) return;

        // Single click logic for completion
        if (e.detail === 1) {
          if (currentTaskCompleted.has(name)) {
            currentTaskCompleted.delete(name);
          } else {
            currentTaskCompleted.add(name);
          }
          renderGrid();
          checkCleanupComplete();
        }
      });

      // Touch handling
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
          saveLocalStorage();
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

  function saveLocalStorage() {
    localStorage.setItem(KEYS.ABSENT, JSON.stringify([...absentStudents]));
  }

  function checkCleanupComplete() {
    if (dashboardShownToday) return;
    if (currentTask !== DASHBOARD_TRIGGER_TASK) return;

    const activeStudents = students.filter(name =>
      !absentStudents.has(name) && !SPECIAL_STUDENTS.includes(name)
    );
    const allCompleted = activeStudents.every(name => currentTaskCompleted.has(name));

    if (allCompleted && activeStudents.length > 0) {
      dashboardShownToday = true;
      dailyRecords.push({ task: currentTask, incomplete: [] });
      localStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(dailyRecords));
      currentTask = '';
      currentTaskCompleted = new Set();
      showView('dashboard');
    }
  }

  function renderDashboard() {
    if (!dashboardContent) return;
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
        card.dataset.studentName = name;
        card.innerHTML = `<h3>👤 ${name}</h3><div class="tasks">${tasks.map(t => `<span class="task-tag">${t}</span>`).join('')}</div>`;
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          pendingConfirmStudent = name;
          if (confirmModal) confirmModal.classList.add('active');
        });
        dashboardContent.appendChild(card);
      });
    }
  }

  function bindEvents() {
    if (startBtn) {
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
    }

    if (todoInput) {
      todoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startBtn.click();
      });
    }

    if (todoSelect) {
      todoSelect.addEventListener('change', () => {
        if (todoSelect.value) todoInput.value = '';
      });
    }

    // End Button Logic
    if (endBtn) {
      endBtn.addEventListener('click', () => {
        endBtnClickCount++;
        showToast(`종료하려면 ${3 - endBtnClickCount}번 더 클릭`);

        if (endBtnClickCount >= 3) {
          if (endConfirmModal) endConfirmModal.classList.add('active');
          endBtnClickCount = 0;
          clearTimeout(endBtnClickTimer);
          return;
        }

        clearTimeout(endBtnClickTimer);
        endBtnClickTimer = setTimeout(() => {
          endBtnClickCount = 0;
          showToast('');
        }, 5000);
      });
    }

    if (endConfirmNo) {
      endConfirmNo.addEventListener('click', () => {
        endConfirmModal.classList.remove('active');
      });
    }

    if (endConfirmYes) {
      endConfirmYes.addEventListener('click', () => {
        const incomplete = students.filter(name =>
          !currentTaskCompleted.has(name) &&
          !absentStudents.has(name) &&
          !SPECIAL_STUDENTS.includes(name)
        );
        if (currentTask) {
          dailyRecords.push({ task: currentTask, incomplete: incomplete });
          localStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(dailyRecords));
        }
        currentTask = '';
        currentTaskCompleted = new Set();
        endConfirmModal.classList.remove('active');
        showView('input');
      });
    }

    if (endConfirmModal) {
      const backdrop = endConfirmModal.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => {
          endConfirmModal.classList.remove('active');
        });
      }
    }

    if (closeDashboardBtn) closeDashboardBtn.addEventListener('click', () => showView('input'));

    if (showDashboardBtn) {
      showDashboardBtn.addEventListener('click', () => {
        if (settingsModal) settingsModal.classList.remove('active');
        showView('dashboard');
      });
    }

    if (confirmNo) {
      confirmNo.addEventListener('click', () => {
        pendingConfirmStudent = null;
        confirmModal.classList.remove('active');
      });
    }

    if (confirmYes) {
      confirmYes.addEventListener('click', () => {
        if (pendingConfirmStudent) {
          dailyRecords.forEach(record => {
            const idx = record.incomplete.indexOf(pendingConfirmStudent);
            if (idx !== -1) {
              record.incomplete.splice(idx, 1);
            }
          });
          localStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(dailyRecords));
          pendingConfirmStudent = null;
          confirmModal.classList.remove('active');
          renderDashboard();
        }
      });
    }

    if (confirmModal) {
      const backdrop = confirmModal.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => {
          pendingConfirmStudent = null;
          confirmModal.classList.remove('active');
        });
      }
    }

    // Settings Trigger Logic (Manual counting)
    let triggerClickCount = 0;
    let triggerClickTimer;

    if (settingsTrigger) {
      settingsTrigger.addEventListener('click', (e) => {
        triggerClickCount++;
        showToast(`설정: ${triggerClickCount}/3 클릭 확인`);
        console.log('Settings Trigger Clicked');

        if (triggerClickCount >= 3) {
          if (settingsBtn) settingsBtn.classList.remove('hidden');
          localStorage.setItem(KEYS.SETTINGS_VISIBLE, 'true');
          triggerClickCount = 0;
          clearTimeout(triggerClickTimer);
          showToast('설정 버튼이 활성화되었습니다');
          return;
        }

        clearTimeout(triggerClickTimer);
        triggerClickTimer = setTimeout(() => {
          triggerClickCount = 0;
          console.log('Settings Trigger Reset');
        }, 1000);
      });
    }

    // Settings Button Logic
    let settingsClickTimer;
    let settingsClickCount = 0;

    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        settingsClickCount++;

        if (settingsClickCount >= 3) {
          settingsBtn.classList.add('hidden');
          localStorage.setItem(KEYS.SETTINGS_VISIBLE, 'false');
          clearTimeout(settingsClickTimer);
          settingsClickCount = 0;
          return;
        }

        clearTimeout(settingsClickTimer);
        settingsClickTimer = setTimeout(() => {
          if (settingsClickCount === 1) {
            if (todoOptionsInput) todoOptionsInput.value = todoOptions.join(', ');
            if (studentNamesInput) studentNamesInput.value = students.join(', ');
            if (fontSizeSlider) fontSizeSlider.value = fontSize;
            if (fontSizeValue) fontSizeValue.textContent = fontSize;
            if (settingsModal) settingsModal.classList.add('active');
          }
          settingsClickCount = 0;
        }, 300);
      });
    }

    if (settingsModal) {
      const backdrop = settingsModal.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => {
          settingsModal.classList.remove('active');
        });
      }
    }

    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', () => {
        fontSize = parseInt(fontSizeSlider.value, 10);
        if (fontSizeValue) fontSizeValue.textContent = fontSize;
        localStorage.setItem(KEYS.FONT_SIZE, fontSize);
        document.documentElement.style.setProperty('--student-font-size', fontSize + 'px');
      });
    }

    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => {
        const newOptions = todoOptionsInput.value.split(',').map(s => s.trim()).filter(Boolean);
        if (newOptions.length > 0) {
          todoOptions = newOptions;
          localStorage.setItem(KEYS.OPTIONS, JSON.stringify(todoOptions));
          populateDropdown();
        }
        const newStudents = studentNamesInput.value.split(',').map(s => s.trim()).filter(Boolean);
        if (newStudents.length > 0) {
          students = newStudents;
          localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
          absentStudents = new Set([...absentStudents].filter(n => students.includes(n)));
          localStorage.setItem(KEYS.ABSENT, JSON.stringify([...absentStudents]));
        }
        if (taskView.classList.contains('active')) renderGrid();
        settingsModal.classList.remove('active');
      });
    }
  }

})();
