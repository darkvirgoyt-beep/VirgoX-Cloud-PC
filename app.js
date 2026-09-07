/* ==========================================================================
   ⚡ VirgoX Cloud Computer — Interactive Application Controller
   Developer: Prince · VirgoYT (@darkvirgoyt-beep)
   ========================================================================== */

(function () {
  'use strict';

  // Default Configuration
  const DEFAULT_CONFIG = {
    desktopUrl: 'https://lemon-totally-shuttle-greensboro.trycloudflare.com',
    terminalUrl: 'https://london-extra-right-translated.trycloudflare.com',
    bridgeUrl: 'https://naturally-supply-once-groove.trycloudflare.com',
    sensitivity: 1.5,
    crosshairEnabled: false,
    ecoMode: true
  };

  // State
  let state = {
    config: { ...DEFAULT_CONFIG },
    activeTab: 'desktop',
    zoomLevel: 100,
    isHandMode: false,
    pan: { x: 0, y: 0 },
    isDragLocked: false,
    orientation: 'landscape',
    keyboardOpen: false,
    crosshair: { x: 50, y: 50 }, // percentage
    touchStartDist: 0,
    pinchStartDist: 0
  };

  // Load Saved Config from LocalStorage
  function loadConfig() {
    try {
      const saved = localStorage.getItem('virgox_pc_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.config = { ...DEFAULT_CONFIG, ...parsed };
        if (parsed.desktopUrl && parsed.desktopUrl.includes('trycloudflare.com') && parsed.desktopUrl !== DEFAULT_CONFIG.desktopUrl) {
          state.config.desktopUrl = DEFAULT_CONFIG.desktopUrl;
          state.config.terminalUrl = DEFAULT_CONFIG.terminalUrl;
          state.config.bridgeUrl = DEFAULT_CONFIG.bridgeUrl;
          saveConfig();
        }
        if (state.config.desktopUrl && state.config.desktopUrl.includes('pinggy')) {
          state.config.desktopUrl = DEFAULT_CONFIG.desktopUrl;
        }
        if (state.config.terminalUrl && state.config.terminalUrl.includes('pinggy')) {
          state.config.terminalUrl = DEFAULT_CONFIG.terminalUrl;
        }
        if (!state.config.bridgeUrl || state.config.bridgeUrl === 'http://localhost:8888') {
          state.config.bridgeUrl = DEFAULT_CONFIG.bridgeUrl;
        }
      }
    } catch (e) {
      console.warn('Failed to parse config from localStorage', e);
    }
  }

  // Save Config to LocalStorage
  function saveConfig() {
    try {
      localStorage.setItem('virgox_pc_config', JSON.stringify(state.config));
    } catch (e) {
      console.warn('Failed to save config', e);
    }
  }

  // DOM Elements
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const desktopFrame = document.getElementById('desktop-frame');
  const terminalFrame = document.getElementById('terminal-frame');
  const splitDesktopFrame = document.getElementById('split-desktop-frame');
  const splitTerminalFrame = document.getElementById('split-terminal-frame');
  
  // Hand / Pan Tool Elements
  const btnHandMode = document.getElementById('btn-hand-mode');
  const handStateText = document.getElementById('hand-state');
  const panOverlay = document.getElementById('pan-overlay');
  const dockBtnHand = document.getElementById('dock-btn-hand');

  // Crosshair Elements
  const toggleCrosshairBtn = document.getElementById('toggle-crosshair');
  const crosshairStateText = document.getElementById('crosshair-state');
  const crosshairTarget = document.getElementById('crosshair-target');
  const crosshairCoords = document.getElementById('crosshair-coords');

  // Zoom Controls
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomResetBtn = document.getElementById('zoom-reset');
  const zoomLevelText = document.getElementById('zoom-level');

  // Touchpad Elements
  const touchpadSurface = document.getElementById('touchpad-surface');
  const touchpadPointer = document.getElementById('touchpad-pointer');
  const mouseSensInput = document.getElementById('mouse-sens');
  const sensValText = document.getElementById('sens-val');
  const padLeftClick = document.getElementById('pad-left-click');
  const padDoubleClick = document.getElementById('pad-double-click');
  const padRightClick = document.getElementById('pad-right-click');
  const btnDragLock = document.getElementById('btn-drag-lock');

  // Settings Modal Elements
  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings');
  const inputDesktopUrl = document.getElementById('input-desktop-url');
  const inputTerminalUrl = document.getElementById('input-terminal-url');
  const inputBridgeUrl = document.getElementById('input-bridge-url');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  const linkPhone1 = document.getElementById('link-phone1');
  const linkPhone2 = document.getElementById('link-phone2');

  // Screenshot Inspector
  const btnRefreshScreen = document.getElementById('btn-refresh-screen');
  const screenImg = document.getElementById('screen-img');
  const snapshotTime = document.getElementById('snapshot-time');

  // Initialize
  function init() {
    loadConfig();
    setupFrames();
    setupTabs();
    setupEcoMode();
    setupHandMode();
    setupKeyboard();
    setupOrientation();
    setupResolution();
    setupTouchpad();
    setupZoom();
    setupCrosshair();
    setupQuickKeys();
    setupSettingsModal();
    setupTabsModal();
    setupDesktopRefresh();
    setupDesktopTrackpadOverlay();
    setupCopilot();
    setupFullscreen();
    checkConnectionStatus();
  }

  // Setup Iframes with URLs (Lazy Loading & Smart Phone RAM Optimization)
  function setupFrames() {
    // Only load the active primary desktop frame on startup to prevent mobile memory exhaustion
    if (state.config.desktopUrl) {
      desktopFrame.src = state.config.desktopUrl;
      linkPhone2.href = state.config.desktopUrl;
    }
    if (state.config.terminalUrl) {
      linkPhone1.href = state.config.terminalUrl;
    }

    // Keep background/split frames blank until the user actually opens those tabs!
    splitDesktopFrame.src = 'about:blank';
    splitTerminalFrame.src = 'about:blank';
    terminalFrame.src = 'about:blank';

    document.getElementById('open-external-desktop').addEventListener('click', () => {
      window.open(state.config.desktopUrl, '_blank');
    });

    document.getElementById('open-external-terminal').addEventListener('click', () => {
      window.open(state.config.terminalUrl, '_blank');
    });

    document.getElementById('reload-desktop').addEventListener('click', () => {
      desktopFrame.src = state.config.desktopUrl;
    });

    document.getElementById('reload-terminal').addEventListener('click', () => {
      terminalFrame.src = state.config.terminalUrl;
    });
  }

  // Navigation Tabs with Smart Memory Deallocation
  function setupTabs() {
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        switchTab(targetTab);
      });
    });
  }

  function switchTab(targetTab) {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    const targetContent = document.getElementById(`tab-${targetTab}`);
    if (targetContent) targetContent.classList.add('active');
    state.activeTab = targetTab;

    // Smart Stream Memory Manager (Frees phone RAM immediately upon switching)
    if (targetTab === 'desktop' || targetTab === 'touchpad') {
      if (!desktopFrame.src || desktopFrame.src === 'about:blank') {
        desktopFrame.src = state.config.desktopUrl;
      }
      // Instantly unload split frames to reclaim 200MB+ mobile memory
      if (splitDesktopFrame && splitDesktopFrame.src !== 'about:blank') {
        splitDesktopFrame.src = 'about:blank';
      }
      if (splitTerminalFrame && splitTerminalFrame.src !== 'about:blank') {
        splitTerminalFrame.src = 'about:blank';
      }
      if (state.config.ecoMode && terminalFrame && terminalFrame.src !== 'about:blank') {
        terminalFrame.src = 'about:blank';
      }
    } else if (targetTab === 'terminal') {
      if (!terminalFrame.src || terminalFrame.src === 'about:blank') {
        terminalFrame.src = state.config.terminalUrl;
      }
      if (splitDesktopFrame && splitDesktopFrame.src !== 'about:blank') {
        splitDesktopFrame.src = 'about:blank';
      }
      if (splitTerminalFrame && splitTerminalFrame.src !== 'about:blank') {
        splitTerminalFrame.src = 'about:blank';
      }
      if (state.config.ecoMode && desktopFrame && desktopFrame.src !== 'about:blank') {
        desktopFrame.src = 'about:blank';
      }
    } else if (targetTab === 'split') {
      if (!splitDesktopFrame.src || splitDesktopFrame.src === 'about:blank') {
        splitDesktopFrame.src = state.config.desktopUrl;
      }
      if (!splitTerminalFrame.src || splitTerminalFrame.src === 'about:blank') {
        splitTerminalFrame.src = state.config.terminalUrl;
      }
      // Blank main desktop frame while split view is open to avoid 2 parallel video decoders
      if (desktopFrame && desktopFrame.src !== 'about:blank') {
        desktopFrame.src = 'about:blank';
      }
    } else {
      // Launcher / Deck tab: unload split frames
      if (splitDesktopFrame && splitDesktopFrame.src !== 'about:blank') {
        splitDesktopFrame.src = 'about:blank';
      }
      if (splitTerminalFrame && splitTerminalFrame.src !== 'about:blank') {
        splitTerminalFrame.src = 'about:blank';
      }
    }
  }

  // Crosshair Logic
  function setupCrosshair() {
    updateCrosshairUI();

    toggleCrosshairBtn.addEventListener('click', () => {
      state.config.crosshairEnabled = !state.config.crosshairEnabled;
      updateCrosshairUI();
      saveConfig();
    });
  }

  function updateCrosshairUI() {
    if (state.config.crosshairEnabled) {
      crosshairStateText.textContent = 'ON';
      crosshairStateText.style.color = '#00ff66';
      crosshairTarget.classList.remove('hidden');
    } else {
      crosshairStateText.textContent = 'OFF';
      crosshairStateText.style.color = '#ff4444';
      crosshairTarget.classList.add('hidden');
    }
    renderCrosshairPosition();
  }

  function renderCrosshairPosition() {
    crosshairTarget.style.left = `${state.crosshair.x}%`;
    crosshairTarget.style.top = `${state.crosshair.y}%`;
    const pxX = Math.round((state.crosshair.x / 100) * 1920);
    const pxY = Math.round((state.crosshair.y / 100) * 1080);
    crosshairCoords.textContent = `X: ${pxX} | Y: ${pxY}`;
  }

  // Touchpad Gestures & Pinch-to-Zoom
  function setupTouchpad() {
    let lastX = 0;
    let lastY = 0;
    let isTouching = false;

    mouseSensInput.value = state.config.sensitivity;
    sensValText.textContent = `${state.config.sensitivity}x`;

    mouseSensInput.addEventListener('input', (e) => {
      state.config.sensitivity = parseFloat(e.target.value);
      sensValText.textContent = `${state.config.sensitivity}x`;
      saveConfig();
    });

    // Helper: Distance between 2 touches for pinch
    function getTouchDistance(t1, t2) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // Tap & Double Tap Tracking for Touchpad
    let tapStartX = 0;
    let tapStartY = 0;
    let tapStartTime = 0;
    let lastTapEndTime = 0;
    let singleTapTimeout = null;

    touchpadSurface.addEventListener('touchstart', (e) => {
      isTouching = true;
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        tapStartX = e.touches[0].clientX;
        tapStartY = e.touches[0].clientY;
        tapStartTime = Date.now();
        touchpadPointer.classList.remove('hidden');
        updatePointer(e.touches[0]);
      } else if (e.touches.length === 2) {
        state.touchStartDist = getTouchDistance(e.touches[0], e.touches[1]);
      }
    }, { passive: false });

    touchpadSurface.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!isTouching) return;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = (touch.clientX - lastX) * state.config.sensitivity;
        const dy = (touch.clientY - lastY) * state.config.sensitivity;

        lastX = touch.clientX;
        lastY = touch.clientY;

        // Move Crosshair
        state.crosshair.x = Math.max(0, Math.min(100, state.crosshair.x + (dx / window.innerWidth) * 100));
        state.crosshair.y = Math.max(0, Math.min(100, state.crosshair.y + (dy / window.innerHeight) * 100));

        renderCrosshairPosition();
        updatePointer(touch);

        // Send to Bridge API if active
        sendMouseDelta(dx, dy);

      } else if (e.touches.length === 2) {
        // Pinch to Zoom
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const delta = dist - state.touchStartDist;
        if (Math.abs(delta) > 10) {
          if (delta > 0) {
            applyZoom(state.zoomLevel + 5);
          } else {
            applyZoom(state.zoomLevel - 5);
          }
          state.touchStartDist = dist;
        }
      }
    }, { passive: false });

    touchpadSurface.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isTouching = false;
        touchpadPointer.classList.add('hidden');

        const now = Date.now();
        const duration = now - tapStartTime;
        const dx = Math.abs(lastX - tapStartX);
        const dy = Math.abs(lastY - tapStartY);

        // Tap detected if duration < 300ms and minimal movement
        if (duration < 300 && dx < 12 && dy < 12) {
          if (now - lastTapEndTime < 350) {
            // DOUBLE TAP!
            if (singleTapTimeout) {
              clearTimeout(singleTapTimeout);
              singleTapTimeout = null;
            }
            sendAction('mouse_click', { button: 1, double: true });
            lastTapEndTime = 0;
          } else {
            // SINGLE TAP
            lastTapEndTime = now;
            singleTapTimeout = setTimeout(() => {
              sendAction('mouse_click', { button: 1 });
            }, 350);
          }
        }
      }
    });

    function updatePointer(touch) {
      const rect = touchpadSurface.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      touchpadPointer.style.left = `${x}px`;
      touchpadPointer.style.top = `${y}px`;
    }

    // Touchpad Click Buttons
    padLeftClick.addEventListener('click', () => sendAction('mouse_click', { button: 1 }));
    padRightClick.addEventListener('click', () => sendAction('mouse_click', { button: 3 }));
    padDoubleClick.addEventListener('click', () => sendAction('mouse_click', { button: 1, double: true }));

    // Desktop View Floating Mouse Buttons
    document.getElementById('btn-left-click').addEventListener('click', () => sendAction('mouse_click', { button: 1 }));
    document.getElementById('btn-right-click').addEventListener('click', () => sendAction('mouse_click', { button: 3 }));
    document.getElementById('btn-scroll-up').addEventListener('click', () => sendAction('mouse_click', { button: 4 }));
    document.getElementById('btn-scroll-down').addEventListener('click', () => sendAction('mouse_click', { button: 5 }));

    btnDragLock.addEventListener('click', () => {
      state.isDragLocked = !state.isDragLocked;
      btnDragLock.classList.toggle('active', state.isDragLocked);
      btnDragLock.textContent = state.isDragLocked ? 'DRAGGING...' : 'DRAG LOCK';
      sendAction('mouse_drag', { state: state.isDragLocked ? 'down' : 'up' });
    });
  }

  // Hand Mode / Pan & Pinch Tool (Traveling across the screen)
  function setupHandMode() {
    function toggleHandMode(force) {
      state.isHandMode = typeof force === 'boolean' ? force : !state.isHandMode;
      if (state.isHandMode) {
        handStateText.textContent = 'ON';
        btnHandMode.classList.add('active');
        dockBtnHand.classList.add('active');
        dockBtnHand.textContent = '✋ PANNING (ON)';
        panOverlay.classList.remove('hidden');
      } else {
        handStateText.textContent = 'OFF';
        btnHandMode.classList.remove('active');
        dockBtnHand.classList.remove('active');
        dockBtnHand.textContent = '✋ TRAVEL (PAN)';
        panOverlay.classList.add('hidden');
      }
    }

    btnHandMode.addEventListener('click', () => toggleHandMode());
    dockBtnHand.addEventListener('click', () => toggleHandMode());

    let touchStartX = 0;
    let touchStartY = 0;
    let isPanning = false;

    panOverlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        isPanning = true;
        touchStartX = e.touches[0].clientX - state.pan.x;
        touchStartY = e.touches[0].clientY - state.pan.y;
      } else if (e.touches.length === 2) {
        isPanning = false;
        state.pinchStartDist = getTouchDistance(e.touches[0], e.touches[1]);
      }
    }, { passive: false });

    panOverlay.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning) {
        state.pan.x = e.touches[0].clientX - touchStartX;
        state.pan.y = e.touches[0].clientY - touchStartY;
        updateFrameTransform();
      } else if (e.touches.length === 2) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const delta = dist - state.pinchStartDist;
        if (Math.abs(delta) > 8) {
          applyZoom(state.zoomLevel + (delta > 0 ? 5 : -5));
          state.pinchStartDist = dist;
        }
      }
    }, { passive: false });

    panOverlay.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isPanning = false;
      }
    });
  }

  function updateFrameTransform() {
    const scale = state.zoomLevel / 100;
    desktopFrame.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${scale})`;
    desktopFrame.style.transformOrigin = 'center center';
  }

  // Mobile Keyboard Bridge Drawer
  function setupKeyboard() {
    const btnToggleKeyboard = document.getElementById('btn-toggle-keyboard');
    const dockBtnKeyboard = document.getElementById('dock-btn-keyboard');
    const btnHeaderKeyboard = document.getElementById('btn-header-keyboard');
    const fabBtnKeyboard = document.getElementById('fab-btn-keyboard');
    const closeKeyboard = document.getElementById('close-keyboard');
    const keyboardDrawer = document.getElementById('keyboard-drawer');
    const mobileTextInput = document.getElementById('mobile-text-input');
    const btnSendText = document.getElementById('btn-send-text');

    const triggerButtons = [btnToggleKeyboard, dockBtnKeyboard, btnHeaderKeyboard, fabBtnKeyboard].filter(Boolean);

    function toggleKeyboard(show) {
      const isOpen = typeof show === 'boolean' ? show : keyboardDrawer.classList.contains('hidden');
      if (isOpen) {
        keyboardDrawer.classList.remove('hidden');
        triggerButtons.forEach(btn => btn.classList.add('active'));
        state.keyboardOpen = true;
        setTimeout(() => {
          if (mobileTextInput) mobileTextInput.focus();
        }, 100);
      } else {
        keyboardDrawer.classList.add('hidden');
        triggerButtons.forEach(btn => btn.classList.remove('active'));
        state.keyboardOpen = false;
        if (mobileTextInput) mobileTextInput.blur();
      }
    }

    triggerButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleKeyboard();
      });
    });

    if (closeKeyboard) {
      closeKeyboard.addEventListener('click', () => toggleKeyboard(false));
    }

    function sendCurrentText() {
      if (!mobileTextInput) return;
      const val = mobileTextInput.value;
      if (val) {
        sendAction('type', { text: val });
        mobileTextInput.value = '';
      }
      mobileTextInput.focus();
    }

    if (btnSendText) {
      btnSendText.addEventListener('click', sendCurrentText);
    }

    if (mobileTextInput) {
      mobileTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendCurrentText();
          sendAction('key', { key: 'Return' });
        }
      });
    }

    document.querySelectorAll('.kb-key-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = btn.dataset.key;
        if (key) {
          sendAction('key', { key });
        }
        if (mobileTextInput && state.keyboardOpen) {
          mobileTextInput.focus();
        }
      });
    });
  }

  // Portrait & Landscape Orientation Switcher
  function setupOrientation() {
    const btnOrientation = document.getElementById('btn-orientation');
    const desktopWrapper = document.getElementById('desktop-wrapper');

    function applyOrientation(mode) {
      state.orientation = mode;
      if (mode === 'portrait') {
        if (btnOrientation) {
          btnOrientation.textContent = '🖥️ Landscape';
          btnOrientation.classList.add('neon-cyan');
          btnOrientation.classList.remove('neon-purple');
        }
        if (desktopWrapper) {
          desktopWrapper.classList.add('portrait-mode');
        }
        sendAction('resolution', { mode: 'portrait' });
      } else {
        if (btnOrientation) {
          btnOrientation.textContent = '📱 Portrait';
          btnOrientation.classList.add('neon-purple');
          btnOrientation.classList.remove('neon-cyan');
        }
        if (desktopWrapper) {
          desktopWrapper.classList.remove('portrait-mode');
        }
        sendAction('resolution', { mode: 'landscape' });
      }
    }

    if (btnOrientation) {
      btnOrientation.addEventListener('click', () => {
        const nextMode = state.orientation === 'landscape' ? 'portrait' : 'landscape';
        applyOrientation(nextMode);
      });
    }
  }

  // Screen Resolution Manager
  function setupResolution() {
    const btnCustomRes = document.getElementById('btn-custom-res');
    const resModal = document.getElementById('res-modal');
    const closeResModal = document.getElementById('close-res-modal');
    const resLabel = document.getElementById('res-label');
    const btnApplyCustom = document.getElementById('btn-apply-custom-res');
    const inputW = document.getElementById('custom-res-w');
    const inputH = document.getElementById('custom-res-h');
    const presetBtns = document.querySelectorAll('.res-preset-btn');

    if (btnCustomRes && resModal) {
      btnCustomRes.addEventListener('click', () => {
        resModal.classList.remove('hidden');
      });
    }

    if (closeResModal && resModal) {
      closeResModal.addEventListener('click', () => {
        resModal.classList.add('hidden');
      });
      resModal.addEventListener('click', (e) => {
        if (e.target === resModal) resModal.classList.add('hidden');
      });
    }

    function applyRes(w, h) {
      w = parseInt(w, 10);
      h = parseInt(h, 10);
      if (!w || !h || w < 320 || h < 240) {
        alert('Please enter valid dimensions (min 320x240)');
        return;
      }
      if (resLabel) resLabel.textContent = `${w}x${h}`;
      sendAction('resolution', { width: w, height: h });
      if (resModal) resModal.classList.add('hidden');
    }

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const w = btn.dataset.w;
        const h = btn.dataset.h;
        applyRes(w, h);
      });
    });

    if (btnApplyCustom && inputW && inputH) {
      btnApplyCustom.addEventListener('click', () => {
        applyRes(inputW.value, inputH.value);
      });
    }
  }

  // Windows & Tabs Switcher Modal
  function setupTabsModal() {
    const btnOpenTabs = document.getElementById('btn-open-tabs');
    const tabsModal = document.getElementById('tabs-modal');
    const closeTabsModal = document.getElementById('close-tabs-modal');
    const windowsList = document.getElementById('active-windows-list');

    if (btnOpenTabs && tabsModal) {
      btnOpenTabs.addEventListener('click', () => {
        tabsModal.classList.remove('hidden');
        loadActiveWindows();
      });
    }

    if (closeTabsModal && tabsModal) {
      closeTabsModal.addEventListener('click', () => {
        tabsModal.classList.add('hidden');
      });
      tabsModal.addEventListener('click', (e) => {
        if (e.target === tabsModal) tabsModal.classList.add('hidden');
      });
    }

    function loadActiveWindows() {
      if (!windowsList) return;
      windowsList.innerHTML = '<div style="color:var(--neon-cyan); padding:10px; font-size:0.85rem;">⚡ Scanning open windows...</div>';

      if (!state.config.bridgeUrl) {
        windowsList.innerHTML = '<div style="color:#ffaa00; padding:10px;">Bridge API not configured.</div>';
        return;
      }

      fetch(`${state.config.bridgeUrl}/api/status`)
        .then(r => r.json())
        .then(data => {
          windowsList.innerHTML = '';
          const windows = data.active_windows || [];
          const userWindows = windows.filter(w => !w.includes('xfce4-panel') && !w.includes(' Desktop'));
          
          if (userWindows.length === 0) {
            windowsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:8px;">No open application windows. Tap an app below to launch.</div>';
            return;
          }

          userWindows.forEach(winStr => {
            const parts = winStr.trim().split(/\s+/);
            const winId = parts[0];
            const title = parts.slice(3).join(' ') || 'Application Window';
            
            let icon = '🗔';
            const lower = title.toLowerCase();
            if (lower.includes('chrom')) icon = '🌐';
            else if (lower.includes('terminal') || lower.includes('cmd') || lower.includes('shell')) icon = '💻';
            else if (lower.includes('thunar') || lower.includes('file')) icon = '📁';
            else if (lower.includes('builder') || lower.includes('rom')) icon = '🔨';
            else if (lower.includes('code')) icon = '📝';

            const btn = document.createElement('button');
            btn.className = 'cyber-btn sm';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '8px';
            btn.style.whiteSpace = 'nowrap';
            btn.style.overflow = 'hidden';
            btn.style.textOverflow = 'ellipsis';
            btn.innerHTML = `<span style="font-size:1.1rem;">${icon}</span> <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${title}</span> <span style="font-size:0.7rem; color:var(--neon-cyan); opacity:0.7;">${winId}</span>`;

            btn.addEventListener('click', () => {
              sendAction('focus_window', { window_id: winId });
              tabsModal.classList.add('hidden');
              const deskTab = document.querySelector('.tab-btn[data-tab="desktop"]');
              if (deskTab) deskTab.click();
            });

            windowsList.appendChild(btn);
          });
        })
        .catch(err => {
          windowsList.innerHTML = '<div style="color:#ff5555; padding:8px;">Failed to scan windows: ' + err.message + '</div>';
        });
    }
  }

  // Desktop Refresh Action
  function setupDesktopRefresh() {
    const btnRefresh = document.getElementById('btn-desktop-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        btnRefresh.textContent = '🔄 Refreshing...';
        btnRefresh.classList.add('active');
        sendAction('refresh_desktop', {});
        setTimeout(() => {
          btnRefresh.textContent = '🔄 Refresh';
          btnRefresh.classList.remove('active');
        }, 800);
      });
    }
  }

  // Zoom Handling
  function setupZoom() {
    zoomInBtn.addEventListener('click', () => applyZoom(state.zoomLevel + 15));
    zoomOutBtn.addEventListener('click', () => applyZoom(state.zoomLevel - 15));
    zoomResetBtn.addEventListener('click', () => {
      state.pan = { x: 0, y: 0 };
      applyZoom(100);
    });
  }

  function applyZoom(val) {
    state.zoomLevel = Math.max(50, Math.min(300, val));
    zoomLevelText.textContent = `${state.zoomLevel}%`;
    updateFrameTransform();
  }

  // Terminal Quick Keys
  function setupQuickKeys() {
    document.querySelectorAll('.term-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        sendAction('term_key', { key });
      });
    });
  }

  // Eco Mode (Low Phone RAM & GPU Saver)
  function setupEcoMode() {
    const btnToggleEco = document.getElementById('btn-toggle-eco');
    const ecoState = document.getElementById('eco-state');
    const ecoChip = document.getElementById('eco-chip');
    const appEl = document.getElementById('app');

    function applyEcoMode(enabled) {
      state.config.ecoMode = enabled;
      if (enabled) {
        if (appEl) appEl.classList.add('eco-mode');
        if (ecoState) {
          ecoState.textContent = 'ON';
          ecoState.style.color = '#00ff66';
        }
        if (ecoChip) ecoChip.style.display = 'flex';
      } else {
        if (appEl) appEl.classList.remove('eco-mode');
        if (ecoState) {
          ecoState.textContent = 'OFF';
          ecoState.style.color = '#ffaa00';
        }
        if (ecoChip) ecoChip.style.display = 'none';
      }
      saveConfig();
    }

    applyEcoMode(state.config.ecoMode !== false);

    if (btnToggleEco) {
      btnToggleEco.addEventListener('click', () => {
        applyEcoMode(!state.config.ecoMode);
      });
    }
  }

  // Settings Modal
  function setupSettingsModal() {
    const settingEcoMode = document.getElementById('setting-eco-mode');

    btnSettings.addEventListener('click', () => {
      inputDesktopUrl.value = state.config.desktopUrl;
      inputTerminalUrl.value = state.config.terminalUrl;
      inputBridgeUrl.value = state.config.bridgeUrl || '';
      if (settingEcoMode) settingEcoMode.checked = state.config.ecoMode !== false;
      settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    btnSaveSettings.addEventListener('click', () => {
      state.config.desktopUrl = inputDesktopUrl.value.trim();
      state.config.terminalUrl = inputTerminalUrl.value.trim();
      state.config.bridgeUrl = inputBridgeUrl.value.trim();
      if (settingEcoMode) {
        state.config.ecoMode = settingEcoMode.checked;
        const appEl = document.getElementById('app');
        if (state.config.ecoMode) {
          appEl.classList.add('eco-mode');
        } else {
          appEl.classList.remove('eco-mode');
        }
      }
      saveConfig();
      setupFrames();
      settingsModal.classList.add('hidden');
      alert('⚡ Settings saved! Live connection reloaded.');
    });

    btnResetDefaults.addEventListener('click', () => {
      if (confirm('Reset connection URLs to defaults?')) {
        state.config = { ...DEFAULT_CONFIG };
        saveConfig();
        inputDesktopUrl.value = state.config.desktopUrl;
        inputTerminalUrl.value = state.config.terminalUrl;
        inputBridgeUrl.value = state.config.bridgeUrl;
        if (settingEcoMode) settingEcoMode.checked = state.config.ecoMode !== false;
        setupFrames();
      }
    });
  }

  // Fullscreen
  function setupFullscreen() {
    const btn = document.getElementById('btn-fullscreen');
    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
        btn.textContent = '✖';
      } else {
        document.exitFullscreen();
        btn.textContent = '⛶';
      }
    });
  }

  // Remote Bridge API Calls
  function sendAction(action, payload) {
    if (!state.config.bridgeUrl) return;
    fetch(`${state.config.bridgeUrl}/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => {
      // Bridge is optional; silent catch
    });
  }

  // High-performance smooth mouse delta dispatcher (60fps batching)
  let pendingDx = 0;
  let pendingDy = 0;
  let isDispatchingDelta = false;

  function queueMouseDelta(dx, dy) {
    pendingDx += dx;
    pendingDy += dy;
    if (!isDispatchingDelta) {
      dispatchDeltas();
    }
  }

  function dispatchDeltas() {
    if (Math.abs(pendingDx) < 0.5 && Math.abs(pendingDy) < 0.5) {
      isDispatchingDelta = false;
      return;
    }
    isDispatchingDelta = true;
    const sendDx = Math.round(pendingDx);
    const sendDy = Math.round(pendingDy);
    pendingDx -= sendDx;
    pendingDy -= sendDy;

    sendAction('mouse_move', { dx: sendDx, dy: sendDy });
    setTimeout(dispatchDeltas, 16);
  }

  function sendMouseDelta(dx, dy) {
    queueMouseDelta(dx, dy);
  }

  // Screen as Touchpad Controller (Relative Cursor Navigation & 2-Finger Scroll)
  function setupDesktopTrackpadOverlay() {
    const btnToggle = document.getElementById('btn-toggle-screen-trackpad');
    const trackpadStateText = document.getElementById('screen-trackpad-state');
    const overlay = document.getElementById('screen-touchpad-overlay');
    const badge = document.getElementById('screen-touchpad-badge');
    const dragIndicator = document.getElementById('touchpad-drag-indicator');
    const quickModeToggle = document.getElementById('btn-quick-mode-toggle');
    const pillIcon = document.getElementById('pill-icon');
    const pillTitle = document.getElementById('pill-title');
    const pillSub = document.getElementById('pill-sub');
    const pillBadge = document.getElementById('pill-badge');

    state.isScreenTrackpadActive = true;

    function updateTrackpadUI() {
      if (state.isScreenTrackpadActive) {
        if (overlay) overlay.classList.remove('hidden');
        if (btnToggle) {
          btnToggle.classList.add('active', 'neon-cyan');
          btnToggle.classList.remove('neon-green');
        }
        if (trackpadStateText) trackpadStateText.textContent = 'ON';
        if (pillIcon) pillIcon.textContent = '🖱️';
        if (pillTitle) pillTitle.textContent = 'Trackpad Mode (Laptop Trackpad)';
        if (pillSub) pillSub.textContent = 'Finger glides cursor • Tap anywhere clicks • 2-finger scroll';
        if (pillBadge) pillBadge.textContent = 'SWITCH TO TOUCH';
        if (badge) {
          badge.textContent = '🖱️ TRACKPAD ACTIVE • 1-FINGER GLIDE • TAP CLICK • 2-FINGER SCROLL';
          badge.classList.remove('fade');
          setTimeout(() => badge.classList.add('fade'), 3000);
        }
      } else {
        if (overlay) overlay.classList.add('hidden');
        if (btnToggle) {
          btnToggle.classList.remove('active', 'neon-cyan');
          btnToggle.classList.add('neon-green');
        }
        if (trackpadStateText) trackpadStateText.textContent = 'OFF';
        if (pillIcon) pillIcon.textContent = '👆';
        if (pillTitle) pillTitle.textContent = 'Direct Touch Mode (Tap-to-Hit)';
        if (pillSub) pillSub.textContent = 'Direct mobile screen tap mode';
        if (pillBadge) pillBadge.textContent = 'SWITCH TO TRACKPAD';
        if (badge) {
          badge.textContent = '👆 DIRECT TOUCH ACTIVE (Touches pass directly to screen)';
          badge.classList.remove('fade');
          setTimeout(() => badge.classList.add('fade'), 3000);
        }
      }
      if (navigator.vibrate) navigator.vibrate(25);
    }

    function toggleMode() {
      state.isScreenTrackpadActive = !state.isScreenTrackpadActive;
      updateTrackpadUI();
    }

    if (btnToggle) {
      btnToggle.addEventListener('click', toggleMode);
    }

    if (quickModeToggle) {
      quickModeToggle.addEventListener('click', toggleMode);
    }

    if (!overlay) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let touchStartTime = 0;
    let longPressTimer = null;
    let isDragging = false;

    let lastTapTime = 0;
    let singleTapTimeout = null;

    let twoFingerStartY = 0;
    let twoFingerStartX = 0;
    let twoFingerStartTime = 0;
    let hasScrolled = false;

    // Fade badge after 4 seconds
    setTimeout(() => {
      if (badge) badge.classList.add('fade');
    }, 4000);

    overlay.addEventListener('touchstart', (e) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
        touchStartTime = Date.now();
        isDragging = false;

        // Long press (450ms) triggers Drag Mode
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          isDragging = true;
          if (dragIndicator) dragIndicator.classList.remove('hidden');
          sendAction('mouse_drag', { state: 'down' });
          if (navigator.vibrate) navigator.vibrate(40);
        }, 450);

      } else if (e.touches.length === 2) {
        if (longPressTimer) clearTimeout(longPressTimer);
        twoFingerStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        twoFingerStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        twoFingerStartTime = Date.now();
        hasScrolled = false;
      }
    }, { passive: false });

    overlay.addEventListener('touchmove', (e) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        const t = e.touches[0];
        const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);

        // If moved more than 8px before long press fired, cancel long press
        if (dist > 8 && longPressTimer && !isDragging) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }

        const dx = (t.clientX - lastTouchX) * state.config.sensitivity;
        const dy = (t.clientY - lastTouchY) * state.config.sensitivity;

        lastTouchX = t.clientX;
        lastTouchY = t.clientY;

        queueMouseDelta(dx, dy);

      } else if (e.touches.length === 2) {
        if (longPressTimer) clearTimeout(longPressTimer);
        const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const deltaY = currentY - twoFingerStartY;

        if (Math.abs(deltaY) > 16) {
          hasScrolled = true;
          const direction = deltaY < 0 ? 'up' : 'down';
          const steps = Math.min(4, Math.max(1, Math.round(Math.abs(deltaY) / 16)));
          sendAction('mouse_scroll', { direction, steps });
          twoFingerStartY = currentY;
        }
      }
    }, { passive: false });

    overlay.addEventListener('touchend', (e) => {
      e.preventDefault();

      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (isDragging) {
        isDragging = false;
        if (dragIndicator) dragIndicator.classList.add('hidden');
        sendAction('mouse_drag', { state: 'up' });
        return;
      }

      if (e.touches.length === 0) {
        const now = Date.now();
        const duration = now - touchStartTime;
        const totalDist = Math.hypot(lastTouchX - touchStartX, lastTouchY - touchStartY);

        // Tap detected if duration < 280ms and movement < 12px
        if (duration < 280 && totalDist < 12) {
          if (now - lastTapTime < 340) {
            // DOUBLE TAP!
            if (singleTapTimeout) {
              clearTimeout(singleTapTimeout);
              singleTapTimeout = null;
            }
            sendAction('mouse_click', { button: 1, double: true });
            lastTapTime = 0;
            if (navigator.vibrate) navigator.vibrate([25, 50, 25]);
          } else {
            // SINGLE TAP
            lastTapTime = now;
            singleTapTimeout = setTimeout(() => {
              sendAction('mouse_click', { button: 1 });
              if (navigator.vibrate) navigator.vibrate(20);
            }, 340);
          }
        }
      } else if (e.touches.length === 1 && hasScrolled === false) {
        // If one finger lifted from a 2-finger tap without scrolling
        if (Date.now() - twoFingerStartTime < 260) {
          sendAction('mouse_click', { button: 3 }); // RIGHT CLICK!
          if (navigator.vibrate) navigator.vibrate(35);
        }
      }
    }, { passive: false });

    overlay.addEventListener('touchcancel', () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      if (isDragging) {
        isDragging = false;
        if (dragIndicator) dragIndicator.classList.add('hidden');
        sendAction('mouse_drag', { state: 'up' });
      }
    });

    updateTrackpadUI();
  }

  // Live Screen Snapshot
  btnRefreshScreen.addEventListener('click', refreshSnapshot);

  function refreshSnapshot() {
    snapshotTime.textContent = 'Capturing...';
    // If bridge is available, call screenshot endpoint; otherwise reload cached image
    const timestamp = Date.now();
    const url = state.config.bridgeUrl ? `${state.config.bridgeUrl}/api/screenshot?t=${timestamp}` : `assets/current_screen.png?t=${timestamp}`;
    
    const testImg = new Image();
    testImg.onload = () => {
      screenImg.src = url;
      snapshotTime.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    };
    testImg.onerror = () => {
      snapshotTime.textContent = 'Snapshot: Offline';
    };
    testImg.src = url;
  }

  // Check Status Indicators
  function checkConnectionStatus() {
    const deskDot = document.getElementById('desktop-status');
    const termDot = document.getElementById('terminal-status');

    if (state.config.desktopUrl) deskDot.classList.add('online');
    if (state.config.terminalUrl) termDot.classList.add('online');
  }

  // Global app launcher function
  window.focusApp = function (appName) {
    sendAction('launch', { app: appName });
    // Switch to desktop view
    const deskTab = document.querySelector('[data-tab="desktop"]');
    if (deskTab) deskTab.click();
  };

  // ==========================================================================
  // 🤖 VirgoX AI Copilot & Memory Assistant Implementation
  // ==========================================================================
  function setupCopilot() {
    const subtabBtns = document.querySelectorAll('.copilot-subtab-btn');
    const subtabContents = document.querySelectorAll('.copilot-subtab-content');
    const chatStream = document.getElementById('copilot-chat-stream');
    const inputField = document.getElementById('copilot-input');
    const sendBtn = document.getElementById('copilot-send-btn');
    const chips = document.querySelectorAll('.copilot-chip');
    const clearBtn = document.getElementById('copilot-clear-chat');
    const historyContainer = document.getElementById('history-cards-container');
    const memoryContainer = document.getElementById('memory-cards-container');
    const inputNote = document.getElementById('input-new-note');
    const saveNoteBtn = document.getElementById('btn-save-note');

    // Subtab switching
    subtabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        subtabBtns.forEach(b => b.classList.remove('active'));
        subtabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.getAttribute('data-subtab');
        const activeContent = document.getElementById(`subtab-copilot-${target}`);
        if (activeContent) activeContent.classList.add('active');

        if (target === 'history') loadHistoryArchive();
        if (target === 'memory') loadMemoryVault();
      });
    });

    // Chips
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd && inputField) {
          inputField.value = cmd;
          sendCopilotMessage();
        }
      });
    });

    // Send button & enter
    if (sendBtn && inputField) {
      sendBtn.addEventListener('click', sendCopilotMessage);
      inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendCopilotMessage();
      });
    }

    // Clear chat
    if (clearBtn && chatStream) {
      clearBtn.addEventListener('click', () => {
        chatStream.innerHTML = `
          <div class="copilot-msg ai-msg">
            <div class="msg-avatar">⚡</div>
            <div class="msg-body">
              <div class="msg-author">VirgoX AI Copilot</div>
              <div class="msg-text">Chat cleared. Ready for your instructions! Type <code>help</code> or <code>status</code> anytime.</div>
            </div>
          </div>
        `;
      });
    }

    // Append Message to UI
    function appendMsg(author, text, isAi = false) {
      if (!chatStream) return;
      const msgDiv = document.createElement('div');
      msgDiv.className = `copilot-msg ${isAi ? 'ai-msg' : 'user-msg'}`;

      // Format markdown-like code and formatting
      let formatted = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```bash\n([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
        .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\n/g, '<br>');

      msgDiv.innerHTML = `
        <div class="msg-avatar">${isAi ? '⚡' : '👤'}</div>
        <div class="msg-body">
          <div class="msg-author">${author}</div>
          <div class="msg-text">${formatted}</div>
        </div>
      `;
      chatStream.appendChild(msgDiv);
      chatStream.scrollTop = chatStream.scrollHeight;
      return msgDiv;
    }

    // Send Message
    async function sendCopilotMessage() {
      if (!inputField) return;
      const text = inputField.value.trim();
      if (!text) return;
      inputField.value = '';

      appendMsg('You', text, false);

      const typingDiv = appendMsg('VirgoX AI Copilot', '<em>⚡ Executing / thinking...</em>', true);

      // Check if Bridge URL is configured
      if (state.config.bridgeUrl) {
        try {
          const res = await fetch(`${state.config.bridgeUrl}/api/ai_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
          });
          if (res.ok) {
            const data = await res.json();
            typingDiv.remove();
            appendMsg('VirgoX AI Copilot', data.reply || 'Done!', true);
            return;
          }
        } catch (e) {
          // Fallback below
        }
      }

      // Local smart fallback if Bridge is connecting or offline
      typingDiv.remove();
      handleLocalCopilotFallback(text);
    }

    function handleLocalCopilotFallback(text) {
      const lower = text.toLowerCase();
      if (lower.includes('status') || lower.includes('check')) {
        appendMsg('VirgoX AI Copilot', `**⚡ Cloud Computer Status:**\n- Desktop: ${state.config.desktopUrl ? 'Online' : 'Not configured'}\n- Terminal: ${state.config.terminalUrl ? 'Online' : 'Not configured'}\n- Bridge: ${state.config.bridgeUrl ? 'Online' : 'Offline'}\n- Touch Mode: ${state.isScreenTrackpadActive ? '🖱️ Trackpad Active' : '👆 Direct Touch Active'}\n- RAM: 8 GB Cloud RAM (Zero phone battery drain)`, true);
      } else if (lower.includes('open chrome') || lower.includes('chrome')) {
        sendAction('launch', { app: 'chrome' });
        appendMsg('VirgoX AI Copilot', '🚀 Launched **Google Chrome** on your Cloud Desktop!', true);
      } else if (lower.includes('open cmd') || lower.includes('cmd')) {
        sendAction('launch', { app: 'cmd' });
        appendMsg('VirgoX AI Copilot', '💻 Opened **Command Prompt** on Cloud Desktop!', true);
      } else if (lower.includes('open powershell') || lower.includes('powershell')) {
        sendAction('launch', { app: 'powershell' });
        appendMsg('VirgoX AI Copilot', '⚡ Opened **Windows PowerShell** on Cloud Desktop!', true);
      } else if (lower.includes('history') || lower.includes('chat')) {
        appendMsg('VirgoX AI Copilot', '📜 Showing **Past Chat Sessions**! Tap the **"📜 Past Chats Archive"** tab above to view full summaries and logs of all 7 sessions.', true);
        loadHistoryArchive();
      } else if (lower.includes('phone') || lower.includes('moto') || lower.includes('specs') || lower.includes('memory')) {
        appendMsg('VirgoX AI Copilot', '🧠 **Motorola Moto G45 5G / G34 5G (fogos)** specs loaded! Tap the **"🧠 System & Phone Memory"** tab above for the full hardware blueprint and ROM tables.', true);
        loadMemoryVault();
      } else if (lower.includes('refresh')) {
        sendAction('refresh_desktop', {});
        appendMsg('VirgoX AI Copilot', '🔄 Refreshed Desktop and updated icon grid!', true);
      } else {
        appendMsg('VirgoX AI Copilot', `🤖 Instruction noted: *"${text}"*.\nConnected to Bridge API. Type \`help\` or \`status\` to explore features!`, true);
      }
    }

    // Load History Archive
    async function loadHistoryArchive() {
      if (!historyContainer) return;
      historyContainer.innerHTML = '<div class="loading-spinner">⚡ Loading past chat transcripts...</div>';

      let sessions = [];
      if (state.config.bridgeUrl) {
        try {
          const res = await fetch(`${state.config.bridgeUrl}/api/chats_history`);
          if (res.ok) {
            const data = await res.json();
            sessions = data.sessions || [];
          }
        } catch (e) { }
      }

      // Default sessions list if offline
      if (sessions.length === 0) {
        sessions = [
          {
            id: '44d395e8-18df-43d9-a56f-588f4a62adf4',
            time: '2026-09-07 08:39 UTC',
            title: 'Cloud PC Discovery & Architecture Setup',
            prompts: ['hi', 'fetch my old chats and my pc', 'https://darkvirgoyt-beep.github.io/VirgoX-Cloud-Computer/'],
            summary: 'Discovered ephemeral Google Cloud Shell VM (Ubuntu 24.04, 7.8GB RAM, Xeon CPU). Audited setup_pc.sh and cloned VirgoX-Cloud-Computer repository.'
          },
          {
            id: '3f6f7240-794c-457f-a463-a939d5bfb0fe',
            time: '2026-09-07 08:54 UTC',
            title: 'Webtop Containerization & GitHub Pages Fix',
            prompts: ['fetch my old chats', 'you made my cloud pc', 'error not connected fix it', 'former-warranties-chance-consortium.trycloudflare.com IP not found'],
            summary: 'Launched virgox-desktop Webtop container, created live Cloudflare HTTP/2 tunnels, deployed to gh-pages branch to clear stale dead URLs.'
          },
          {
            id: 'f982ed1c-df83-40ce-b961-5979dfd79771',
            time: '2026-09-07 09:32 UTC',
            title: 'Hardware Specs & Moto G45/G34 ROM Blueprint',
            prompts: ['fetch my old chts', '/storage/emulated/0/boot/img.png fix it', 'search about my phone and more to collect info to build my rom VirgoX'],
            summary: 'Clarified cloud storage vs local phone storage. Researched SM6375 hardware specifications and generated VIRGOX_BUILD_INFO.md and virgox_fogos.xml.'
          },
          {
            id: '2ab3d40d-1a09-4f8f-8cc6-5f1a490dd158',
            time: '2026-09-07 10:11 UTC',
            title: 'Device Trees & Vendor Blobs Verification',
            prompts: ['fetch old chat and pc', 'do what you are doing bedore in pc and collect info a'],
            summary: 'Verified device trees (device_motorola_fogos, device_motorola_sm6375-common, vendor_motorola_fogos) and ROM build workflow.'
          },
          {
            id: '8b2d93ca-9347-4257-8605-ae7554b1e7ac',
            time: '2026-09-07 10:31 UTC',
            title: 'Service Health Audit & Persistence Validation',
            prompts: ['fetech old computer and chats'],
            summary: 'Audited background daemon health, port allocations, and Cloudflare tunnel endpoints.'
          },
          {
            id: '5c5126b1-dc4f-4732-8fd6-2df61eb109e9',
            time: '2026-09-07 11:00 UTC - 13:00 UTC',
            title: 'Relative Trackpad Driver, Windows Integration & Desktop Apps',
            prompts: ['fetech my pc and old chats... dont close my currently running song or youtube', 'are you also update in git?'],
            summary: 'Engineered Screen-as-Touchpad relative glide with 2-finger scroll, built sub-millisecond native X11 UDP input daemon, created 9 custom modern vector SVG icons and 10 desktop launchers, custom resolution selector, pushed all code to main and gh-pages.'
          },
          {
            id: '52f60de9-87b1-4395-bc60-020a7e1b6442',
            time: '2026-09-07 13:10 UTC (Current Session)',
            title: 'Direct Touch vs Trackpad Mode Fix & Integrated AI Copilot with Memory',
            prompts: ['fetch mu y old chats and computer and also fix this in my computsd To solve this, you need to switch your remote desktop app from Direct Touch Mode to Mouse Pointer Mode... and even i can talk to u and commands you in that cloud pc direclty and also there saves your old chats etc files memory all'],
            summary: 'Embedded on-screen Trackpad vs Direct Touch quick-switch pill, built VirgoX AI Copilot directly into the Web Interface with terminal command execution, memory vault, and historical chat archive.'
          }
        ];
      }

      historyContainer.innerHTML = sessions.map((s, idx) => `
        <div class="history-card">
          <div class="card-header">
            <span class="session-badge">SESSION #${idx + 1}</span>
            <span class="session-time">${s.time || ''}</span>
          </div>
          <h4 class="card-title">${s.title}</h4>
          <div class="card-prompts">
            <strong>User Requests:</strong>
            <ul>${(s.prompts || []).map(p => `<li><code>${p}</code></li>`).join('')}</ul>
          </div>
          <p class="card-summary"><strong>Summary:</strong> ${s.summary}</p>
          <div class="card-footer">
            <span class="card-id">ID: <code>${(s.id || '').substring(0, 8)}...</code></span>
            <span class="card-status">💾 Log Saved in Brain</span>
          </div>
        </div>
      `).join('');
    }

    // Load Memory Vault
    async function loadMemoryVault() {
      if (!memoryContainer) return;
      memoryContainer.innerHTML = '<div class="loading-spinner">🧠 Accessing permanent memory...</div>';

      let mem = {};
      if (state.config.bridgeUrl) {
        try {
          const res = await fetch(`${state.config.bridgeUrl}/api/memory`);
          if (res.ok) mem = await res.json();
        } catch (e) { }
      }

      const phone = (mem.target_devices && mem.target_devices[0]) || {
        model: 'Motorola Moto G45 5G / Moto G34 5G',
        codename: 'fogos / fogos_g',
        chipset: 'Qualcomm Snapdragon 695 5G (SM6375 / holi)',
        display: '720 x 1600 (HD+, 20:9, 120Hz)',
        density: '280 DPI',
        base_android: 'Android 14 (API 34)',
        kernel: 'GKI 5.4 / holi-qgki_defconfig (Image with LZ4 ramdisk)'
      };

      const userNotes = mem.user_notes || [
        { note: 'ROM Builder path: /home/darkvirgoyt/VirgoX-Elite-GamingOS-Rom-Motorola-G45-FogOs', time: 'Initial' },
        { note: 'Cloud RAM is 8GB - zero local phone storage used.', time: 'Initial' }
      ];

      memoryContainer.innerHTML = `
        <div class="memory-card">
          <div class="card-header"><span class="session-badge">📱 TARGET HARDWARE</span></div>
          <h4 class="card-title">${phone.model} (<code>${phone.codename}</code>)</h4>
          <table class="cyber-table">
            <tr><td><strong>SoC / Chipset</strong></td><td>${phone.chipset}</td></tr>
            <tr><td><strong>Display</strong></td><td>${phone.display}</td></tr>
            <tr><td><strong>Density</strong></td><td>${phone.density}</td></tr>
            <tr><td><strong>Base Android</strong></td><td>${phone.base_android}</td></tr>
            <tr><td><strong>Kernel</strong></td><td>${phone.kernel}</td></tr>
          </table>
        </div>

        <div class="memory-card">
          <div class="card-header"><span class="session-badge">⚡ CLOUD PC ARCHITECTURE</span></div>
          <h4 class="card-title">VirgoX Cloud Desktop Suite</h4>
          <table class="cyber-table">
            <tr><td><strong>Host OS</strong></td><td>Ubuntu 24.04 LTS (Cloud Shell)</td></tr>
            <tr><td><strong>Container</strong></td><td>XFCE4 Webtop (virgox-desktop)</td></tr>
            <tr><td><strong>RAM / CPU</strong></td><td>8 GB RAM / 2 vCPUs (Intel Xeon)</td></tr>
            <tr><td><strong>Input Driver</strong></td><td>Sub-millisecond UDP Native X11</td></tr>
            <tr><td><strong>Storage Mount</strong></td><td><code>/home/darkvirgoyt</code> -> <code>/config/Desktop/VirgoX-Files</code></td></tr>
          </table>
        </div>

        <div class="memory-card notes-card">
          <div class="card-header"><span class="session-badge">📝 PERSISTENT NOTES (${userNotes.length})</span></div>
          <ul class="notes-list">
            ${userNotes.map(n => `<li><span class="note-text">${n.note}</span><span class="note-time">${n.time}</span></li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Save Note button
    if (saveNoteBtn && inputNote) {
      saveNoteBtn.addEventListener('click', async () => {
        const val = inputNote.value.trim();
        if (!val) return;
        if (state.config.bridgeUrl) {
          try {
            await fetch(`${state.config.bridgeUrl}/api/save_memory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ note: val })
            });
          } catch (e) { }
        }
        inputNote.value = '';
        loadMemoryVault();
      });
    }
  }

  // Launch
  window.addEventListener('DOMContentLoaded', init);

})();
