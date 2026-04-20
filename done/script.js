// script.js
(function () {
  'use strict';

  // --- Global Error Reporting (For Debugging) ---
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorMsg = `Error: ${msg}\nLine: ${lineNo}`;
    console.error(errorMsg);
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
  const SPECIAL_STUDENTS = ['박시윤'];

  // 기본 학생 명단
  const DEFAULT_STUDENTS = [
    '김서윤', '김재희', '민소담', '박도준', '박시윤',
    '백상원', '변민석', '신현우', '안지환', '어경인',
    '엄태양', '이루빈', '이소이', '이해령', '임나경',
    '최윤', '플러드규리', '플러드빌리'
  ];

  // 기본 드롭다운 옵션
  const DEFAULT_OPTIONS = ['수학익힘책', '알림장', '청소'];

  // 롱프레스 판정 시간 (ms)
  const LONG_PRESS_DURATION = 600;

  // ============================================================
  // ==================== 설정 영역 끝 ====================
  // ============================================================

  // --- LocalStorage Keys ---
  const KEYS = {
    STUDENTS: 'students_v3',
    OPTIONS: 'todoOptions_v2',
    FONT_SIZE: 'fontSize',
    LAST_DATE: 'lastDate',
    ABSENT: 'absentStudents',
    DAILY_RECORDS: 'dailyRecords_v2',
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
  let noonTimerId = null;

  // --- DOM Elements (Initialized in initDOM) ---
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

    startNoonTimer();

    const isVisible = localStorage.getItem(KEYS.SETTINGS_VISIBLE) === 'true';
    if (isVisible && settingsBtn) {
      settingsBtn.classList.remove('hidden');
    }

    console.log('Class Manager Initialized');
    showToast('프로그램이 시작되었습니다.');
  }

  // ============================================================
  // ==================== Helper Functions ====================
  // ============================================================

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
      if (lastDate !== null) {
        showToast('새로운 날짜입니다. 기록이 초기화되었습니다.');
      }

      // 스토리지 초기화
      localStorage.removeItem(KEYS.ABSENT);
      localStorage.removeItem(KEYS.DAILY_RECORDS);
      localStorage.setItem(KEYS.LAST_DATE, today);

      // 메모리 변수 초기화
      absentStudents = new Set();
      dailyRecords = [];
      dashboardShownToday = false;
      currentTask = '';
      currentTaskCompleted = new Set();

      // 어디에 있든 일단 입력 화면으로 이동
      showView('input');
      return true;
    }
    return false;
  }

  // 탭으로 다시 돌아왔을 때 날짜가 바뀌었는지 검사 (아이패드/모바일 등에서 특히 유용)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkDateReset();
    }
  });

  // 켜둔 상태로 자정이 넘어갈 경우를 대비해 1분마다 검사
  setInterval(() => {
    checkDateReset();
  }, 60000);

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

  // ============================================================
  // ==================== Data Helpers ====================
  // ============================================================

  /** 결석 학생 목록을 LocalStorage에 저장 */
  function saveAbsentStudents() {
    localStorage.setItem(KEYS.ABSENT, JSON.stringify([...absentStudents]));
  }

  /** 현재 과제의 미완료 학생 목록 반환 */
  function getIncompleteStudents() {
    return students.filter(name =>
      !currentTaskCompleted.has(name) &&
      !absentStudents.has(name) &&
      !SPECIAL_STUDENTS.includes(name)
    );
  }

  /** 현재 과제 진행 상황을 dailyRecords에 저장 */
  function saveCurrentTask() {
    if (!currentTask) return;
    const incomplete = getIncompleteStudents();
    const existingIdx = dailyRecords.findIndex(r => r.task === currentTask);
    if (existingIdx !== -1) {
      dailyRecords[existingIdx].incomplete = incomplete;
    } else {
      dailyRecords.push({ task: currentTask, incomplete });
    }
    localStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(dailyRecords));
  }

  /** 모든 학생이 완료(또는 결석) 상태인지 확인하고 자동 종료 */
  function checkAndFinishTaskAuto() {
    if (currentTask && taskView && taskView.classList.contains('active') && getIncompleteStudents().length === 0) {
      setTimeout(() => {
        if (!currentTask || getIncompleteStudents().length > 0) return;
        
        const finishedTask = currentTask;
        saveCurrentTask();
        currentTask = '';
        currentTaskCompleted = new Set();
        
        if (finishedTask === '청소') {
          showToast('모든 학생이 완료하여 청소 과제가 종료되었습니다.');
          showView('dashboard');
        } else {
          showToast('모든 학생이 완료하여 과제가 종료되었습니다.');
          showView('input');
        }
      }, 500);
    }
  }

  // ============================================================
  // ==================== View Management ====================
  // ============================================================

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

  // ============================================================
  // ==================== Grid Rendering ====================
  // Pointer Events 통합 + 롱프레스로 결석 처리
  // ============================================================

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

      // --- Pointer Events: 롱프레스 = 결석, 짧은 클릭 = 완료 토글 ---
      let pressTimer = null;
      let isLongPress = false;
      let startX = 0;
      let startY = 0;

      cell.addEventListener('pointerdown', (e) => {
        isLongPress = false;
        startX = e.clientX;
        startY = e.clientY;

        pressTimer = setTimeout(() => {
          isLongPress = true;

          if (absentStudents.has(name)) {
            absentStudents.delete(name);
            showToast(`${name}: 출석 복귀`);
          } else {
            absentStudents.add(name);
            currentTaskCompleted.delete(name);
            showToast(`${name}: 결석 처리`);
          }
          saveAbsentStudents();
          renderGrid();
          checkAndFinishTaskAuto();

          if (navigator.vibrate) navigator.vibrate(50);
        }, LONG_PRESS_DURATION);
      });

      cell.addEventListener('pointerup', () => {
        clearTimeout(pressTimer);
        if (isLongPress) return;
        if (absentStudents.has(name)) return;

        // 완료/미완료 토글
        if (currentTaskCompleted.has(name)) {
          currentTaskCompleted.delete(name);
        } else {
          currentTaskCompleted.add(name);
        }
        renderGrid();
        checkAndFinishTaskAuto();
      });

      cell.addEventListener('pointermove', (e) => {
        // 손가락이 많이 움직이면 롱프레스 취소 (스크롤 의도)
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > 10 || dy > 10) {
          clearTimeout(pressTimer);
        }
      });

      cell.addEventListener('pointerleave', () => {
        clearTimeout(pressTimer);
      });

      // 모바일 롱프레스 시 컨텍스트 메뉴 방지
      cell.addEventListener('contextmenu', (e) => e.preventDefault());

      // 터치 시 불필요한 지연 방지
      cell.style.touchAction = 'manipulation';

      studentGrid.appendChild(cell);
    });
  }

  // ============================================================
  // ==================== Noon Timer ====================
  // setTimeout으로 정확한 시각에 1회 실행
  // ============================================================

  function startNoonTimer() {
    if (noonTimerId) clearTimeout(noonTimerId);

    const now = new Date();
    const noon = new Date(now);
    noon.setHours(12, 0, 0, 0);

    // 이미 12시가 지났으면 스케줄링하지 않음
    if (now >= noon) return;

    const msUntilNoon = noon.getTime() - now.getTime();

    noonTimerId = setTimeout(() => {
      if (dashboardShownToday) return;
      dashboardShownToday = true;

      // 현재 진행 중인 과제가 있으면 저장 후 마감
      if (currentTask) {
        saveCurrentTask();
        currentTask = '';
        currentTaskCompleted = new Set();
      }

      // 열려있는 모달 모두 닫기
      if (confirmModal) confirmModal.classList.remove('active');
      if (endConfirmModal) endConfirmModal.classList.remove('active');
      if (settingsModal) settingsModal.classList.remove('active');

      showToast('낮 12시가 되어 대시보드로 이동합니다.');
      showView('dashboard');
    }, msUntilNoon);
  }

  // ============================================================
  // ==================== Dashboard Rendering ====================
  // 과제별 개별 완료 처리 지원
  // ============================================================

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

        const header = document.createElement('h3');
        header.textContent = `👤 ${name}`;
        card.appendChild(header);

        const tasksDiv = document.createElement('div');
        tasksDiv.className = 'tasks';

        tasks.forEach(taskName => {
          const tag = document.createElement('span');
          tag.className = 'task-tag removable';
          tag.innerHTML = `${taskName} <span class="tag-remove">✕</span>`;
          tag.title = '클릭하여 완료 처리';
          tag.addEventListener('click', (e) => {
            e.stopPropagation();
            const record = dailyRecords.find(r => r.task === taskName);
            if (record) {
              const idx = record.incomplete.indexOf(name);
              if (idx !== -1) {
                record.incomplete.splice(idx, 1);
                localStorage.setItem(KEYS.DAILY_RECORDS, JSON.stringify(dailyRecords));
                showToast(`${name}: "${taskName}" 완료 처리`);
                renderDashboard();
              }
            }
          });
          tasksDiv.appendChild(tag);
        });

        card.appendChild(tasksDiv);

        // 미완료 과제가 2개 이상이면 "모두 완료" 버튼 표시
        if (tasks.length > 1) {
          const allDoneBtn = document.createElement('button');
          allDoneBtn.className = 'btn-all-done';
          allDoneBtn.textContent = '모두 완료 처리';
          allDoneBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pendingConfirmStudent = name;
            if (confirmModal) confirmModal.classList.add('active');
          });
          card.appendChild(allDoneBtn);
        }

        dashboardContent.appendChild(card);
      });
    }
  }

  // ============================================================
  // ==================== Event Binding ====================
  // 기능별로 분리된 이벤트 바인딩
  // ============================================================

  function bindEvents() {
    bindInputEvents();
    bindTaskEvents();
    bindDashboardEvents();
    bindSettingsEvents();
  }

  // --- 입력 화면 이벤트 ---
  function bindInputEvents() {
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

        // 기존 기록이 있으면 완료 상태 복원
        const existingRecord = dailyRecords.find(r => r.task === task);
        if (existingRecord) {
          students.forEach(name => {
            if (!existingRecord.incomplete.includes(name) && !absentStudents.has(name) && !SPECIAL_STUDENTS.includes(name)) {
              currentTaskCompleted.add(name);
            }
          });
        }

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
  }

  // --- 과제 화면 이벤트 (종료 버튼) ---
  function bindTaskEvents() {
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
        const finishedTask = currentTask;
        saveCurrentTask();
        currentTask = '';
        currentTaskCompleted = new Set();
        endConfirmModal.classList.remove('active');

        if (finishedTask === '청소') {
          showToast('청소 과제가 종료되어 대시보드로 이동합니다.');
          showView('dashboard');
        } else {
          showView('input');
        }
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
  }

  // --- 대시보드 이벤트 ---
  function bindDashboardEvents() {
    if (closeDashboardBtn) {
      closeDashboardBtn.addEventListener('click', () => showView('input'));
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
  }

  // --- 설정 관련 이벤트 ---
  function bindSettingsEvents() {
    // Settings Trigger Logic (3번 클릭으로 설정 버튼 표시)
    let triggerClickCount = 0;
    let triggerClickTimer;

    if (settingsTrigger) {
      settingsTrigger.addEventListener('click', () => {
        triggerClickCount++;
        showToast(`설정: ${triggerClickCount}/3 클릭 확인`);

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
        }, 1000);
      });
    }

    // Settings Button Logic (1번 클릭 = 설정 열기, 3번 빠른 클릭 = 설정 버튼 숨기기)
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
          saveAbsentStudents();
        }
        if (taskView.classList.contains('active')) renderGrid();
        settingsModal.classList.remove('active');
      });
    }

    if (showDashboardBtn) {
      showDashboardBtn.addEventListener('click', () => {
        if (settingsModal) settingsModal.classList.remove('active');
        showView('dashboard');
      });
    }
  }

})();
