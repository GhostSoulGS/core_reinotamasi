// 1. 定義 HTML 結構 (保持不變)
const htmlStructure = `
<div class="main-wrapper">
    <div id="avatarTooltip" class="custom-tooltip"></div>
    <a href="#" target="_blank" class="avatar-link">
        <img src="" class="avatar" alt="Author">
    </a>
    <div class="carousel-container" id="carousel">
        <button class="nav-btn prev" onclick="moveSlide(-1)">&#10094;</button>
        <button class="nav-btn next" onclick="moveSlide(1)">&#10095;</button>
        <div id="carouselTrack" class="carousel-track"></div>
        <div class="progress-container">
            <div id="progressBar" class="progress-bar"></div>
        </div>
    </div>
    <div class="text-area" id="textArea">
        <div id="textLine1" class="line-1"></div>
        <div id="textLine2" class="line-2"></div>
    </div>
    <div id="editOverlay" class="edit-overlay">
        <div id="editContent" class="edit-content" contenteditable="true"></div>
        <div class="close-edit" onclick="toggleEdit(false)">x</div>
    </div>
</div>
`;

// 2. 宣告全域變數 (先不賦值)
let track, progressBar, container, editContent;
let currentIndex = 0;
let timer = null;
let touchStartX = 0;
let isMouseInside = false;
let isEditing = false;
let slideData = [];
const autoPlayDelay = 2000;

function renderStructure() {
    const app = document.getElementById('carousel-app');
    if (app) {
        app.innerHTML = htmlStructure;
    }
}

function init() {
    // A. 先生出 HTML 結構
    renderStructure();

    // B. 等 HTML 生出來了，才抓取元件
    track = document.getElementById('carouselTrack');
    progressBar = document.getElementById('progressBar');
    container = document.getElementById('carousel');
    editContent = document.getElementById('editContent');

    // C. 解析資料 (原本放在外面的解析邏輯搬進來)
    const allData = rawData.trim().split('\n').map(line => line.trim());
    const avatarTitle = allData[0];
    const avatarID = allData[1];
    const avatarURL = allData[2];

    for (let i = 3; i < allData.length; i += 4) {
        if (allData[i]) {
            slideData.push({
                id: allData[i],
                line1: allData[i + 1] || "",
                line2: allData[i + 2] || "",
                url: allData[i + 3] || "#"
            });
        }
    }

    // D. 更新大頭貼
    const avatarImg = document.querySelector('.avatar');
    const avatarLink = document.querySelector('.avatar-link');
    const tooltip = document.getElementById('avatarTooltip');

    if (avatarImg) avatarImg.src = `https://lh3.googleusercontent.com/d/${avatarID}`;
    if (avatarLink) avatarLink.href = avatarURL;
    if (tooltip) {
        tooltip.innerText = avatarTitle;
        avatarImg.onmouseenter = () => tooltip.classList.add('show');
        avatarImg.onmouseleave = () => tooltip.classList.remove('show');
    }

    // E. 生成圖片
    slideData.forEach((item) => {
        const linkWrap = document.createElement('a');
        linkWrap.href = item.url || '#';
        linkWrap.target = "_blank";
        linkWrap.className = "slide-link";
        const img = document.createElement('img');
        img.src = `https://lh3.googleusercontent.com/d/${item.id}`;
        img.loading = "lazy";
        linkWrap.appendChild(img);
        track.appendChild(linkWrap);
    });

    // F. 綁定事件 (因為元件現在才存在)
    document.getElementById('textArea').onclick = () => toggleEdit(true);
    
    container.onmouseenter = () => { isMouseInside = true; stopTimer(); };
    container.onmouseleave = () => { isMouseInside = false; startTimer(); };

    // 滾輪放慢功能
    editContent.addEventListener('wheel', (e) => {
        e.preventDefault();
        const slowScroll = e.deltaY / 15;
        editContent.scrollTop += slowScroll;
    }, { passive: false });

    // G. 啟動功能
    updateProgress();
    updateText();
    startTimer();
    setupTouch();
}

// --- 剩下的函數 (goToSlide, updateText, toggleEdit, updateProgress, moveSlide, startTimer, stopTimer, setupTouch) 保持不變 ---
// 只需要確保裡面用到的變數名稱正確即可

function goToSlide(index) {
    currentIndex = index;
    if (currentIndex >= slideData.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = slideData.length - 1;
    const offset = -currentIndex * 100;
    track.style.transform = `translateX(${offset}%)`;
    updateProgress();
    updateText();
}

function updateText() {
    const currentData = slideData[currentIndex];
    const l1 = document.getElementById('textLine1');
    const l2 = document.getElementById('textLine2');
    const textArea = document.getElementById('textArea');
    if(!l1 || !l2) return;

    l1.innerText = currentData.line1;
    l2.innerText = currentData.line2;

    const hasLine2 = currentData.line2 && currentData.line2.trim() !== "";
    if (hasLine2) {
        l1.className = "line-1 single";
        l2.style.display = "block";
        textArea.className = "text-area align-center";
    } else {
        l1.className = "line-1 double";
        l2.style.display = "none";
        textArea.className = (l1.offsetHeight > 25) ? "text-area align-left" : "text-area align-center";
    }

    if (l2.scrollWidth > l2.clientWidth) {
        l2.classList.add('is-truncated');
    } else {
        l2.classList.remove('is-truncated');
    }
}

function updateProgress() {
    if (!progressBar) return;
    if (slideData.length > 1) {
        const percent = (currentIndex / (slideData.length - 1)) * 100;
        progressBar.style.width = percent + '%';
    } else {
        progressBar.style.width = '100%';
    }
}

function toggleEdit(show) {
    const overlay = document.getElementById('editOverlay');
    const content = document.getElementById('editContent');
    const textArea = document.getElementById('textArea');
    if (show) {
        isEditing = true;
        const l1 = document.getElementById('textLine1').innerText;
        const l2 = document.getElementById('textLine2').innerText;
        content.innerHTML = `${l1}<br>${l2}`;
        overlay.style.display = 'flex';
        textArea.style.opacity = '0';
        stopTimer();
    } else {
        isEditing = false;
        overlay.style.display = 'none';
        textArea.style.opacity = '1';
        startTimer();
    }
}

function moveSlide(step) {
    goToSlide(currentIndex + step);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        clearTimeout(timer);
        timer = null;
    }
}

function startTimer() {
    if (isEditing || isMouseInside) return;
    stopTimer();
    const now = Date.now();
    const timeUntilNextBeat = autoPlayDelay - (now % autoPlayDelay);
    timer = setTimeout(() => {
        goToSlide(currentIndex + 1);
        timer = setInterval(() => {
            if (!isMouseInside && !isEditing) goToSlide(currentIndex + 1);
        }, autoPlayDelay);
    }, timeUntilNextBeat);
}

function setupTouch() {
    if(!container) return;
    container.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        stopTimer();
    }, {passive: true});
    container.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) moveSlide(diff > 0 ? 1 : -1);
        startTimer();
    }, {passive: true});
}

// 最後啟動
init();
