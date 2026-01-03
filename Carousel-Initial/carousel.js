const allData = rawData.trim().split('\n').map(line => line.trim());
const avatarTitle = allData[0];
const avatarID = allData[1];
const avatarURL = allData[2];
const slideData = [];
for (let i = 3; i < allData.length; i += 4) {
    if (allData[i]) {
        slideData.push({
            line1: allData[i] || "",
            line2: allData[i + 1] || "",
            id: allData[i + 2] || "",
            url: allData[i + 3] || "#"
        });
    }
}

// --- 3. 將 HTML 封裝 ---
const htmlTemplate = `
<div class="main-wrapper">
    <div id="avatarTooltip" class="custom-tooltip"></div>
    <a href="#" target="_blank" class="avatar-link">
        <img src="" class="avatar" alt="Author">
    </a>
    <div class="carousel-container" id="carousel">
        <button class="nav-btn prev" id="btnPrev">&#10094;</button>
        <button class="nav-btn next" id="btnNext">&#10095;</button>
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
        <div id="btnCloseEdit" class="close-edit">x</div>
    </div>
</div>
`;

// --- 4. JS 核心邏輯 ---
const autoPlayDelay = 2000;
let currentIndex = 0;
let timer = null;
let touchStartX = 0;
let isMouseInside = false;
let isEditing = false;

// 重要：全域宣告，不在這裡抓元素
let track, progressBar, container, editContent; 

function init() {
    // A. 注入 HTML
    document.getElementById('carousel-app').innerHTML = htmlTemplate;

    // B. HTML 出現後，才抓取元素（重要修正：不要在這裡加 const）
    track = document.getElementById('carouselTrack');
    progressBar = document.getElementById('progressBar');
    container = document.getElementById('carousel');
    editContent = document.getElementById('editContent');

    // C. 更新大頭貼
    const avatarImg = document.querySelector('.avatar');
    const avatarLink = document.querySelector('.avatar-link');
    const tooltip = document.getElementById('avatarTooltip');

    if (avatarImg) avatarImg.src = `https://lh3.googleusercontent.com/d/${avatarID}`;
    if (avatarLink) avatarLink.href = avatarURL;
    if (tooltip) tooltip.innerText = avatarTitle;

    avatarImg.onmouseenter = () => tooltip.classList.add('show');
    avatarImg.onmouseleave = () => tooltip.classList.remove('show');

    // D. 生成圖片軌道
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

    // E. 綁定事件監聽（重要修正：將事件綁定移入 init）
    document.getElementById('btnPrev').onclick = (e) => { e.stopPropagation(); moveSlide(-1); };
    document.getElementById('btnNext').onclick = (e) => { e.stopPropagation(); moveSlide(1); };
    document.getElementById('textArea').onclick = () => toggleEdit(true);
    document.getElementById('btnCloseEdit').onclick = (e) => { e.stopPropagation(); toggleEdit(false); };

    // F. 滾輪慢速化
    editContent.addEventListener('wheel', (e) => {
        e.preventDefault();
        editContent.scrollTop += e.deltaY / 15;
    }, { passive: false });

    // G. 滑鼠感應
    container.onmouseenter = () => { isMouseInside = true; stopTimer(); };
    container.onmouseleave = () => { isMouseInside = false; startTimer(); };

    // H. 初始化執行
    updateProgress();
    updateText();
    startTimer();
    setupTouch();
}

// --- 5. 所有的功能函數 ---

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

    if (l2.scrollWidth > l2.clientWidth) l2.classList.add('is-truncated');
    else l2.classList.remove('is-truncated');
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

function updateProgress() {
    if (slideData.length > 1) {
        const percent = (currentIndex / (slideData.length - 1)) * 100;
        progressBar.style.width = percent + '%';
    } else {
        progressBar.style.width = '100%'; 
    }
}

function moveSlide(step) { goToSlide(currentIndex + step); }

function stopTimer() { clearInterval(timer); timer = null; }

function startTimer() {
    if (slideData.length <= 1) return;
    if (isEditing || isMouseInside) return;
    if (timer) stopTimer();
    const now = Date.now();
    let timeUntilNextBeat = autoPlayDelay - (now % autoPlayDelay);
    if (timeUntilNextBeat < autoPlayDelay - 100) {
        timeUntilNextBeat += autoPlayDelay;
        }
    timer = setTimeout(() => {
        goToSlide(currentIndex + 1);
        timer = setInterval(() => { if (!isMouseInside) goToSlide(currentIndex + 1); }, autoPlayDelay);
    }, timeUntilNextBeat);
}

function setupTouch() {
    if (slideData.length <= 1) return;
    container.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        stopTimer();
    }, {passive: true});
    container.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) moveSlide(diff > 0 ? 1 : -1);
        else startTimer();
    }, {passive: true});
}

// 啟動！
init();
