/* ==========================================================================
   ⚡ VirgoX Cloud Computer — Interactive Application Controller
   Developer: Prince · VirgoYT (@darkvirgoyt-beep)
   ========================================================================== */

(function () {
  'use strict';

  // Default Configuration
  const DEFAULT_CONFIG = {
    desktopUrl: 'https://former-warranties-chance-consortium.trycloudflare.com',
    terminalUrl: 'https://actors-garlic-cookies-starts.trycloudflare.com',
    bridgeUrl: 'https://adventure-vocal-paragraph-betting.trycloudflare.com',
    sensitivity: 1.5,
    crosshairEnabled: false
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
        state.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
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
    setupHandMode();
    setupKeyboard();
    setupOrientation();
    setupTouchpad();
    setupZoom();
    setupCrosshair();
    setupQuickKeys();
    setupSettingsModal();
    setupFullscreen();
    checkConnectionStatus();
  }

  // Setup Iframes with URLs
  function setupFrames() {
    if (state.config.desktopUrl) {
      desktopFrame.src = state.config.desktopUrl;
      splitDesktopFrame.src = state.config.desktopUrl;
      linkPhone2.href = state.config.desktopUrl;
    }
    if (state.config.terminalUrl) {
      terminalFrame.src = state.config.terminalUrl;
      splitTerminalFrame.src = state.config.terminalUrl;
      linkPhone1.href = state.config.terminalUrl;
    }

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

  // Navigation Tabs
  function setupTabs() {
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetContent = document.getElementById(`tab-${targetTab}`);
        if (targetContent) targetContent.classList.add('active');
        state.activeTab = targetTab;
      });
    });
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

    touchpadSurface.addEventListener('touchstart', (e) => {
      isTouching = true;
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
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
    const closeKeyboard = document.getElementById('close-keyboard');
    const keyboardDrawer = document.getElementById('keyboard-drawer');
    const mobileTextInput = document.getElementById('mobile-text-input');
    const btnSendText = document.getElementById('btn-send-text');

    function toggleKeyboard(show) {
      const isOpen = typeof show === 'boolean' ? show : keyboardDrawer.classList.contains('hidden');
      if (isOpen) {
        keyboardDrawer.classList.remove('hidden');
        if (dockBtnKeyboard) dockBtnKeyboard.classList.add('active');
        if (btnToggleKeyboard) btnToggleKeyboard.classList.add('active');
        state.keyboardOpen = true;
        setTimeout(() => {
          if (mobileTextInput) mobileTextInput.focus();
        }, 100);
      } else {
        keyboardDrawer.classList.add('hidden');
        if (dockBtnKeyboard) dockBtnKeyboard.classList.remove('active');
        if (btnToggleKeyboard) btnToggleKeyboard.classList.remove('active');
        state.keyboardOpen = false;
        if (mobileTextInput) mobileTextInput.blur();
      }
    }

    if (btnToggleKeyboard) {
      btnToggleKeyboard.addEventListener('click', () => toggleKeyboard());
    }
    if (dockBtnKeyboard) {
      dockBtnKeyboard.addEventListener('click', () => toggleKeyboard());
    }
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

  // Settings Modal
  function setupSettingsModal() {
    btnSettings.addEventListener('click', () => {
      inputDesktopUrl.value = state.config.desktopUrl;
      inputTerminalUrl.value = state.config.terminalUrl;
      inputBridgeUrl.value = state.config.bridgeUrl || '';
      settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    btnSaveSettings.addEventListener('click', () => {
      state.config.desktopUrl = inputDesktopUrl.value.trim();
      state.config.terminalUrl = inputTerminalUrl.value.trim();
      state.config.bridgeUrl = inputBridgeUrl.value.trim();
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

  function sendMouseDelta(dx, dy) {
    sendAction('mouse_move', { dx: Math.round(dx), dy: Math.round(dy) });
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

  // Launch
  window.addEventListener('DOMContentLoaded', init);

})();
