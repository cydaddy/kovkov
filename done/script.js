// script.js
(function() {
  'use strict';

  // --- Keys & Defaults ---
  const STUDENT_KEY           = 'studentNames';
  const TODO_KEY              = 'todoItems';
  const OPTS_KEY              = 'todoOptions';
  const TODO_FONT_SIZE_KEY    = 'todoFontSize';
  const NAME_FONT_SIZE_KEY    = 'nameFontSize';
  const ABSENT_KEY            = 'absentStudents';
  const SPECIAL_KEY           = 'specialStudents';
  const DASH_MAIN_TITLE_KEY   = 'dashMainTitleFontSize';
  const DASH_TITLE_SIZE_KEY   = 'dashTitleFontSize';
  const DASH_TEXT_SIZE_KEY    = 'dashTextFontSize';

  const defaultStudentNames = [
    '최명조','김가은','김라엘','김지후','신하은',
    '양하예','유하연','이채빈','전소율','전아인',
    '정예원','조하빈','최서연','한서아','노윤준',
    '여민준','이현서','정찬희','지우담','진재하',
    '한윤규','홍아준'
  ];
  const defaultOpts = ['리드포스쿨','풀리수학','우유','수학익힘책','청소'];

  // --- Load from localStorage ---
  let studentNames       = JSON.parse(localStorage.getItem(STUDENT_KEY))   || defaultStudentNames;
  let todoOptions        = JSON.parse(localStorage.getItem(OPTS_KEY))      || defaultOpts;
  let savedTodoFontSize  = parseInt(localStorage.getItem(TODO_FONT_SIZE_KEY), 10);
  if (isNaN(savedTodoFontSize)) savedTodoFontSize = 16;
  let savedNameFontSize  = parseInt(localStorage.getItem(NAME_FONT_SIZE_KEY), 10);
  if (isNaN(savedNameFontSize)) savedNameFontSize = 16;

  let absentStudents     = new Set(JSON.parse(localStorage.getItem(ABSENT_KEY))   || []);
  let specialStudents    = new Set(JSON.parse(localStorage.getItem(SPECIAL_KEY))  || []);

  let dashMainTitleSize  = parseInt(localStorage.getItem(DASH_MAIN_TITLE_KEY), 10);
  if (isNaN(dashMainTitleSize)) dashMainTitleSize = 32;
  let dashTitleFontSize  = parseInt(localStorage.getItem(DASH_TITLE_SIZE_KEY), 10);
  if (isNaN(dashTitleFontSize)) dashTitleFontSize = 24;
  let dashTextFontSize   = parseInt(localStorage.getItem(DASH_TEXT_SIZE_KEY), 10);
  if (isNaN(dashTextFontSize)) dashTextFontSize = 16;

  const rawTodos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
  let todoItems = rawTodos.map(item => {
    if (!item.id)            item.id = Date.now() + Math.random();
    if (!item.studentStates) item.studentStates = {};
    return item;
  });
  // Ensure at least one task
  if (todoItems.length === 0) {
    todoItems.push({
      id: Date.now() + Math.random(),
      text: '청소',
      color: randomPastel(),
      studentStates: {}
    });
    localStorage.setItem(TODO_KEY, JSON.stringify(todoItems));
  }

  // --- Save helpers ---
  const saveStudents    = () => localStorage.setItem(STUDENT_KEY, JSON.stringify(studentNames));
  const saveOpts        = () => localStorage.setItem(OPTS_KEY, JSON.stringify(todoOptions));
  const saveTodoFont    = () => localStorage.setItem(TODO_FONT_SIZE_KEY, savedTodoFontSize);
  const saveNameFont    = () => localStorage.setItem(NAME_FONT_SIZE_KEY, savedNameFontSize);
  const saveAbsent      = () => localStorage.setItem(ABSENT_KEY, JSON.stringify([...absentStudents]));
  const saveSpecial     = () => localStorage.setItem(SPECIAL_KEY, JSON.stringify([...specialStudents]));
  const saveTodos       = () => localStorage.setItem(TODO_KEY, JSON.stringify(todoItems));
  const saveDashSizes   = () => {
    localStorage.setItem(DASH_MAIN_TITLE_KEY, dashMainTitleSize);
    localStorage.setItem(DASH_TITLE_SIZE_KEY,  dashTitleFontSize);
    localStorage.setItem(DASH_TEXT_SIZE_KEY,   dashTextFontSize);
  };

  // --- Utils ---
  function randomPastel() {
    const h = Math.floor(Math.random() * 360),
          s = 70,
          l = 85;
    return `hsl(${h},${s}%,${l}%)`;
  }
  function parseHSL(str) {
    const m = str.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    return m ? { h: +m[1], s: +m[2], l: +m[3] } : null;
  }
  function blink(cell, cb) {
    let cnt = 0;
    const iv = setInterval(() => {
      cell.style.visibility = cell.style.visibility === 'hidden' ? 'visible' : 'hidden';
      if (++cnt >= 6) {
        clearInterval(iv);
        cell.style.visibility = 'visible';
        cb && cb();
      }
    }, 200);
  }

  // --- State & DOM refs ---
  let selectedTodoIndex = todoItems.length > 0 ? 0 : null;

  const mainApp           = document.getElementById('mainApp');
  const gridContainer     = document.querySelector('.grid');
  const todoInput         = document.getElementById('todoInput');
  const todoSelect        = document.getElementById('todoSelect');
  const addTodoBtn        = document.getElementById('addTodoBtn');
  const todoList          = document.getElementById('todoList');
  const settingBtn        = document.getElementById('settingBtn');
  const dashboardBtn      = document.getElementById('dashboardBtn');

  const settingsModal         = document.getElementById('settingsModal');
  const modalContent          = settingsModal.querySelector('.modal-content');
  const closeBtn              = document.getElementById('closeBtn');
  const resetCompletionBtn    = document.getElementById('resetCompletionBtn');
  const fontSizeSlider        = document.getElementById('fontSizeSlider');
  const fontSizeValue         = document.getElementById('fontSizeValue');
  const todoFontSizeSlider    = document.getElementById('todoFontSizeSlider');
  const todoFontSizeValue     = document.getElementById('todoFontSizeValue');
  const todoOptionsInput      = document.getElementById('todoOptionsInput');
  const studentNamesInput     = document.getElementById('studentNamesInput');

  const dashboardView         = document.getElementById('dashboardView');
  const dashMainTitle         = document.getElementById('dashMainTitle');
  const closeDashboardBtn     = document.getElementById('closeDashboardBtn');
  const dashSettingBtn        = document.getElementById('dashSettingBtn');
  const dashboardList         = document.getElementById('dashboardList');

  const dashSettingsModal     = document.getElementById('dashSettingsModal');
  const dashSettingsContent   = dashSettingsModal.querySelector('.modal-content');
  const dashSettingsCloseBtn  = document.getElementById('dashSettingsCloseBtn');
  const dashMainTitleSlider   = document.getElementById('dashMainTitleFontSlider');
  const dashMainTitleValue    = document.getElementById('dashMainTitleFontValue');
  const dashTitleFontSlider   = document.getElementById('dashTitleFontSlider');
  const dashTitleFontValue    = document.getElementById('dashTitleFontValue');
  const dashTextFontSlider    = document.getElementById('dashTextFontSlider');
  const dashTextFontValue     = document.getElementById('dashTextFontValue');

  addTodoBtn.addEventListener('touchstart', () => {
  todoInput.blur();
});
  
  // --- Renderers ---
  function populateSelect() {
    todoSelect.innerHTML = '';
    todoOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = o.textContent = opt;
      todoSelect.appendChild(o);
    });
  }

  function renderTodos() {
    todoList.innerHTML = '';

    todoItems.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'todo-item';
          if (i === selectedTodoIndex) {
      div.classList.add('selected');
    }
    div.textContent = item.text;
      div.textContent = item.text;
      div.style.backgroundColor = item.color;
      div.style.fontSize = savedTodoFontSize + 'px';

      // --- Drag & Drop ---
      div.draggable = true;
      div.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', i);
        div.classList.add('dragging');
      });
      div.addEventListener('dragover', e => { e.preventDefault(); });
      div.addEventListener('drop', e => {
        e.preventDefault();
        const fromIndex = Number(e.dataTransfer.getData('text/plain'));
        const toIndex   = i;
        if (fromIndex !== toIndex) {
          const [moved] = todoItems.splice(fromIndex, 1);
          todoItems.splice(toIndex, 0, moved);
          saveTodos();
          renderTodos();
          renderGrid();
        }
      });
      div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
      });

      // --- Click & Edit ---
      div.addEventListener('click', e => {
        if (e.target.classList.contains('delete-btn')) return;
        if (e.detail === 1) {
          selectedTodoIndex = i;
          renderTodos();
          renderGrid();
        } else if (e.detail === 3) {
          div.contentEditable = 'true';
          div.focus();
        }
      });
      div.addEventListener('blur', () => {
        if (div.isContentEditable) {
          item.text = div.textContent.trim();
          div.contentEditable = 'false';
          saveTodos();
          renderTodos();
        }
      });

      // --- 클릭(PC) & 터치(모바일)로 트리플 삭제 ---
      // 1회 클릭: 선택, 3회 클릭·터치: 삭제
      div.addEventListener('click', e => {
        if (e.detail === 3) {
          deleteTodo(i);
          return;
        }
        selectedTodoIndex = i;
        renderTodos();
        renderGrid();
      });
      let touchCount = 0, touchTimer;
      div.addEventListener('touchend', e => {
        touchCount++;
        if (touchCount === 3) {
          deleteTodo(i);
          touchCount = 0;
          clearTimeout(touchTimer);
          return;
        }
        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => touchCount = 0, 1000);
      });

      todoList.appendChild(div);
    });
  }

  function renderGrid() {
    gridContainer.innerHTML = '';
    let oddColor = '#ffffff', evenColor = '#f9f9f9';
    if (selectedTodoIndex != null) {
      const base = todoItems[selectedTodoIndex].color;
      const hsl  = parseHSL(base);
      if (hsl) {
        oddColor = base;
        evenColor = `hsl(${hsl.h},${hsl.s}%,${Math.max(hsl.l - 5, 0)}%)`;
      }
    }
    const cols = 4;
    studentNames.forEach((name, idx) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = name;
      cell.style.fontSize = savedNameFontSize + 'px';
      cell.dataset.name = name;

      if (absentStudents.has(name)) {
        cell.classList.add('absent');
      } else {
        const row = Math.floor(idx / cols), col = idx % cols;
        cell.style.backgroundColor = (row + col) % 2 === 0 ? oddColor : evenColor;
        const done = todoItems[selectedTodoIndex]?.studentStates[name];
        cell.style.color = done ? 'gray' : 'black';
      }

    // ====== 특수 아동 지정 (5초 롱클릭 & 롱터치) ======
    let lp;
    const startPress = () => {
      lp = setTimeout(() => {
        cell.dataset.longPressed = 'true';
        blink(cell, () => {
          if (specialStudents.has(name)) specialStudents.delete(name);
          else specialStudents.add(name);
          saveSpecial();
          delete cell.dataset.longPressed;
        });
      }, 5000); // 5초
    };
    // 마우스 & 터치 시작
    ['mousedown', 'touchstart'].forEach(evt =>
      cell.addEventListener(evt, startPress)
    );
    // 마우스 & 터치 종료 또는 이탈 시 타이머 취소
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt =>
      cell.addEventListener(evt, () => clearTimeout(lp))
    );
    // ================================================

      cell.addEventListener('click', e => {
        if (cell.dataset.longPressed) {
          delete cell.dataset.longPressed;
          return;
        }
        if (e.detail === 3) {
          if (absentStudents.has(name)) absentStudents.delete(name);
          else {
            absentStudents.add(name);
            todoItems.forEach(t => delete t.studentStates[name]);
            saveTodos();
          }
          saveAbsent();
          renderGrid();
          return;
        }
        if (e.detail === 1 && !absentStudents.has(name) && selectedTodoIndex != null) {
          const states = todoItems[selectedTodoIndex].studentStates;
          if (states[name]) delete states[name];
          else states[name] = true;
          saveTodos();
          renderGrid();
        }
      });

      gridContainer.appendChild(cell);
    });
  }

  function renderDashboard() {
    dashMainTitle.style.fontSize = dashMainTitleSize + 'px';
    dashboardList.innerHTML = '';
    todoItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'dash-item';
      const h = document.createElement('h2');
      h.className = 'dash-heading';
      h.textContent = item.text;
      h.style.fontSize = dashTitleFontSize + 'px';
      const p = document.createElement('p');
      p.className = 'dash-text';
      const pending = studentNames.filter(n =>
  !item.studentStates[n] &&
  !specialStudents.has(n) &&
  !absentStudents.has(n)    // 결석생은 제외
);
      p.textContent = pending.length ? pending.join(', ') : '모두 완료';
      p.style.fontSize = dashTextFontSize + 'px';
      div.appendChild(h);
      div.appendChild(p);
      dashboardList.appendChild(div);
    });
  }

  // --- Initialization & Binding ---
  populateSelect();
  fontSizeSlider.value      = savedNameFontSize;    fontSizeValue.textContent    = savedNameFontSize;
  todoFontSizeSlider.value  = savedTodoFontSize;    todoFontSizeValue.textContent = savedTodoFontSize;
  dashMainTitleSlider.value = dashMainTitleSize;    dashMainTitleValue.textContent= dashMainTitleSize;
  dashTitleFontSlider.value = dashTitleFontSize;    dashTitleFontValue.textContent= dashTitleFontSize;
  dashTextFontSlider.value  = dashTextFontSize;     dashTextFontValue.textContent = dashTextFontSize;
  renderTodos();
  renderGrid();

// --- 텍스트 입력용 추가 버튼 ---
const addTextBtn = document.getElementById('addTextBtn');
addTextBtn.addEventListener('click', () => {
  const txt = todoInput.value.trim();
  if (!txt) return;
  const color = randomPastel();
  const id = Date.now() + Math.random();
  todoItems.push({ id, text: txt, color, studentStates: {} });
  saveTodos();
  todoInput.value = '';
  selectedTodoIndex = todoItems.length - 1;
  renderTodos();
  renderGrid();
});
// --- 드롭다운 선택용 추가 버튼 ---
addTodoBtn.addEventListener('click', () => {
  const txt = todoSelect.value;
  if (!txt) return;
  const color = randomPastel();
  const id = Date.now() + Math.random();
  todoItems.push({ id, text: txt, color, studentStates: {} });
  saveTodos();
  selectedTodoIndex = todoItems.length - 1;
  renderTodos();
  renderGrid();
});

  // Main settings modal
  settingBtn.addEventListener('click', () => {
    todoOptionsInput.value  = todoOptions.join(',');
    studentNamesInput.value = studentNames.join(',');
    settingsModal.style.display = 'block';
    const b = settingBtn.getBoundingClientRect(), m = modalContent.getBoundingClientRect();
    modalContent.style.left = `${b.left}px`;
    modalContent.style.top  = `${b.top - m.height - 5}px`;
  });
  closeBtn.addEventListener('click', () => {
    todoOptions = todoOptionsInput.value.split(',').map(s => s.trim()).filter(Boolean) || defaultOpts;
    saveOpts(); populateSelect();
    studentNames = studentNamesInput.value.split(',').map(s => s.trim()).filter(Boolean) || defaultStudentNames;
    saveStudents();
    absentStudents  = new Set([...absentStudents].filter(n => studentNames.includes(n)));
    specialStudents = new Set([...specialStudents].filter(n => studentNames.includes(n)));
    saveAbsent(); saveSpecial();
    settingsModal.style.display = 'none';
    renderGrid();
  });
  resetCompletionBtn.addEventListener('click', () => {
    // 모든 할 일의 완료 기록을 초기화
    todoItems.forEach(item => {
      item.studentStates = {};
    });
    saveTodos();
    renderGrid();
    alert('모든 과제 완료 기록이 초기화되었습니다.');
  });

  window.addEventListener('click', e => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
    if (e.target === dashSettingsModal) dashSettingsModal.style.display = 'none';
  });

  fontSizeSlider.addEventListener('input', () => {
    savedNameFontSize = +fontSizeSlider.value;
    fontSizeValue.textContent = savedNameFontSize;
    saveNameFont();
    document.querySelectorAll('.cell').forEach(c => c.style.fontSize = savedNameFontSize + 'px');
  });
  todoFontSizeSlider.addEventListener('input', () => {
    savedTodoFontSize = +todoFontSizeSlider.value;
    todoFontSizeValue.textContent = savedTodoFontSize;
    saveTodoFont();
    document.querySelectorAll('.todo-item').forEach(d => d.style.fontSize = savedTodoFontSize + 'px');
  });

  // Dashboard open/close
  dashboardBtn.addEventListener('click', () => {
    renderDashboard();
    mainApp.style.display      = 'none';
    dashboardView.style.display = 'block';
  });
  closeDashboardBtn.addEventListener('click', () => {
    dashboardView.style.display = 'none';
    mainApp.style.display       = 'flex';
  });

  // Dashboard settings modal
  dashSettingBtn.addEventListener('click', () => {
    dashSettingsModal.style.display = 'block';
    const b = dashSettingBtn.getBoundingClientRect();
    // 왼쪽 아래 배치
    dashSettingsContent.style.left = `${b.left + b.width - dashSettingsContent.offsetWidth}px`;
    dashSettingsContent.style.top  = `${b.bottom + 5}px`;
  });
  dashSettingsCloseBtn.addEventListener('click', () => {
    dashSettingsModal.style.display = 'none';
  });

  dashMainTitleSlider.addEventListener('input', () => {
    dashMainTitleSize = +dashMainTitleSlider.value;
    dashMainTitleValue.textContent = dashMainTitleSize;
    saveDashSizes();
    dashMainTitle.style.fontSize = dashMainTitleSize + 'px';
  });
  dashTitleFontSlider.addEventListener('input', () => {
    dashTitleFontSize = +dashTitleFontSlider.value;
    dashTitleFontValue.textContent = dashTitleFontSize;
    saveDashSizes();
    document.querySelectorAll('.dash-heading')
      .forEach(h => h.style.fontSize = dashTitleFontSize + 'px');
  });
  dashTextFontSlider.addEventListener('input', () => {
    dashTextFontSize = +dashTextFontSlider.value;
    dashTextFontValue.textContent = dashTextFontSize;
    saveDashSizes();
    document.querySelectorAll('.dash-text')
      .forEach(p => p.style.fontSize = dashTextFontSize + 'px');
  });
function deleteTodo(i) {
  if (todoItems.length <= 1) {
    alert('할 일은 최소 한 개는 있어야 합니다.');
    return;
  }

  // 어떤 항목을 삭제하는지 알려주는 확인 창을 추가
  const itemText = todoItems[i].text;
  const isConfirmed = confirm(`'${itemText}' 할 일을 정말 삭제하시겠습니까?`);

  // 사용자가 '확인'을 눌렀을 때만 아래의 삭제 로직을 실행
  if (isConfirmed) {
    // i번째 항목 삭제
    todoItems.splice(i, 1);
    // 선택 인덱스 보정
    if (selectedTodoIndex === i) {
      selectedTodoIndex = i > 0 ? i - 1 : 0;
    } else if (selectedTodoIndex > i) {
      selectedTodoIndex--;
    }
    saveTodos();
    renderTodos();
    renderGrid();
  }
  // '취소'를 누르면 아무 일도 일어나지 않습니다.
}
})();
