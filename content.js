let smartOverlay = null;
let currentVideo = null;
let currentPosition = 'top';
let isEvading = false;
let lastMoveTime = 0;

const SAFE_DISTANCE = 160;
const HYSTERESIS_RESET = 250;
const COOLDOWN_DELAY = 400;

function injectTriggerButton() {
  if (document.getElementById('smart-pip-launcher')) return;

  const btn = document.createElement('button');
  btn.id = 'smart-pip-launcher';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <rect x="12" y="9" width="8" height="6" rx="1" fill="currentColor"/>
    </svg>
    <span>Smart PiP</span>
  `;

  btn.addEventListener('click', () => {
    const videos = Array.from(document.querySelectorAll('video'))
      .filter(v => v.readyState > 0 && v.videoWidth > 0)
      .sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight));

    currentVideo = videos[0] || document.querySelector('video');

    if (!currentVideo) {
      alert('ویدیویی پیدا نشد!');
      return;
    }

    createSmartOverlay(currentVideo);
    btn.style.display = 'none';
  });

  document.body.appendChild(btn);
}

function createSmartOverlay(video) {
  if (smartOverlay) return;

  smartOverlay = document.createElement('div');
  smartOverlay.className = 'spip-card pos-top';

  smartOverlay.innerHTML = `
    <div class="spip-glass-bar">
      <div class="spip-badge">
        <span class="spip-pulse-dot"></span>
        <span>Smart Mode</span>
      </div>
      <div class="spip-actions">
        <button class="spip-btn-icon" id="spip-dock-btn" title="OS Picture-in-Picture">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </button>
        <button class="spip-btn-icon" id="spip-close-btn" title="Close">✕</button>
      </div>
    </div>
    <div class="spip-view-wrapper">
      <canvas id="spip-stream-canvas"></canvas>
    </div>
  `;

  document.body.appendChild(smartOverlay);

  const canvas = smartOverlay.querySelector('#spip-stream-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 320;
  canvas.height = 180;

  function renderLoop() {
    if (!smartOverlay) return;
    if (video.readyState >= 2 && !video.paused) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(renderLoop);
  }
  renderLoop();

  smartOverlay.querySelector('#spip-close-btn').addEventListener('click', () => {
    smartOverlay.remove();
    smartOverlay = null;
    const btn = document.getElementById('smart-pip-launcher');
    if (btn) btn.style.display = 'flex';
  });

  smartOverlay.querySelector('#spip-dock-btn').addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error(e);
    }
  });

  listenToMouse();
}

function listenToMouse() {
  let isThrottled = false;

  window.addEventListener('mousemove', (e) => {
    if (!smartOverlay) return;

    if (!isThrottled) {
      window.requestAnimationFrame(() => {
        handleReposition(e.clientX, e.clientY);
        isThrottled = false;
      });
      isThrottled = true;
    }
  }, { passive: true });
}

function handleReposition(mx, my) {
  if (!smartOverlay) return;

  const rect = smartOverlay.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dist = Math.hypot(mx - centerX, my - centerY);
  const now = Date.now();

  if (!isEvading && dist < SAFE_DISTANCE && (now - lastMoveTime > COOLDOWN_DELAY)) {
    if (currentPosition === 'top') {
      smartOverlay.classList.remove('pos-top');
      smartOverlay.classList.add('pos-bottom');
      currentPosition = 'bottom';
    } else {
      smartOverlay.classList.remove('pos-bottom');
      smartOverlay.classList.add('pos-top');
      currentPosition = 'top';
    }
    isEvading = true;
    lastMoveTime = now;
  } else if (isEvading && dist > HYSTERESIS_RESET) {
    isEvading = false;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectTriggerButton);
} else {
  injectTriggerButton();
}