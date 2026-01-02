// 1. 定義房子的構造 (HTML 結構)
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

// 2. 找到 Google Sites 留給我們的「空位」，並把房子蓋進去
// 我們約定好空位 ID 叫做 "carousel-app"
document.getElementById('carousel-app').innerHTML = htmlStructure;

//---------------------------------------------------

// 1. 先用 trim() 去掉整段文字最開頭與最結尾的換行
// 2. split('\n') 按行切割
// 3. map(line => line.trim()) 只去掉每一行左右的空格，但保留「空行」本身
const allData = rawData.trim().split('\n').map(line => line.trim());

// 2. 修正大頭貼資訊抓取 (對應你的新格式)
const avatarTitle = allData[0]; // 新增：大頭貼懸浮標題
const avatarID    = allData[1]; // 大頭貼 ID
const avatarURL   = allData[2]; // 大頭貼網址

// 從第三行 (索引 2) 開始，每 4 行一組
const slideData = [];
for (let i = 3; i < allData.length; i += 4) {
    // 只有在 ID 存在時才加入 (防止最後多出空行導致報錯)
    if (allData[i]) {
        slideData.push({
            id: allData[i],
            line1: allData[i + 1] || "",
            line2: allData[i + 2] || "", // 如果這行是空的，這裡就會是 ""
            url: allData[i + 3] || "#"
        });
    }
}


    const autoPlayDelay = 2000;

    const track = document.getElementById('carouselTrack');
    const progressBar = document.getElementById('progressBar');
    const container = document.getElementById('carousel');
    
    let currentIndex = 0;
    let timer = null;
    let touchStartX = 0;
    let isMouseInside = false; // 紀錄滑鼠是否在區域內
    let isEditing = false;

function init() {
    renderStructure(); // <-- 先執行這行！
    // 改為讀取 slideData (物件陣列)
        // --- 新增：從解析好的資料更新大頭貼 ---
    const avatarImg = document.querySelector('.avatar');
    const avatarLink = document.querySelector('.avatar-link');
    const tooltip = document.getElementById('avatarTooltip'); // 抓取提示框元素

    if (avatarImg) {
        avatarImg.src = `https://lh3.googleusercontent.com/d/${avatarID}`;
    }
    if (avatarLink) {
        avatarLink.href = avatarURL;
    }
    if (tooltip) {
        tooltip.innerText = avatarTitle; // 將第一行的文字塞進去
    }
    // 綁定提示框顯示/隱藏事件 (這部分建議也寫在 init 裡)
    avatarImg.onmouseenter = () => tooltip.classList.add('show');
    avatarImg.onmouseleave = () => tooltip.classList.remove('show');

slideData.forEach((item) => {
    // 1. 建立超連結標籤
    const linkWrap = document.createElement('a');
    linkWrap.href = item.url || '#'; // 如果沒給網址就用 #
    linkWrap.target = "_blank";      // 新分頁打開
    linkWrap.className = "slide-link";

    // 2. 建立圖片標籤 (原本的邏輯)
    const img = document.createElement('img');
    img.src = `https://lh3.googleusercontent.com/d/${item.id}`;
    img.loading = "lazy";

    // 3. 組合：將圖片塞入連結，連結塞入軌道
    linkWrap.appendChild(img);
    track.appendChild(linkWrap);
});
    
    updateProgress(); // 初始化進度條
    updateText();     // 新增：初始化第一張圖的文字內容
    startTimer();
    setupTouch();
}

function goToSlide(index) {
    currentIndex = index;
    if (currentIndex >= slideData.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = slideData.length - 1;

    const offset = -currentIndex * 100;
    track.style.transform = `translateX(${offset}%)`;

    updateProgress(); // 更新進度條
    updateText();     // <--- 補上這一行！這樣切換圖片時文字才會跟著變
}

function updateText() {
    const currentData = slideData[currentIndex];
    const l1 = document.getElementById('textLine1');
    const l2 = document.getElementById('textLine2');
    const textArea = document.getElementById('textArea');

    // 1. 先塞入文字
    l1.innerText = currentData.line1;
    l2.innerText = currentData.line2;

    // 2. 先處理 Line 2 的顯示/隱藏與對齊（這會影響寬度計算）
    const hasLine2 = currentData.line2 && currentData.line2.trim() !== "";

    if (hasLine2) {
        l1.className = "line-1 single";
        l2.style.display = "block";
        textArea.className = "text-area align-center";
    } else {
        l1.className = "line-1 double";
        l2.style.display = "none";
        // 智慧對齊邏輯
        if (l1.offsetHeight > 25) {
            textArea.className = "text-area align-left";
        } else {
            textArea.className = "text-area align-center";
        }
    }

    // 3. 【關鍵】立即檢查溢出，不要用 setTimeout
    // 當你在 JS 裡讀取 scrollWidth 時，瀏覽器會被迫立即計算最新的佈局
    const isL2Overflowing = l2.scrollWidth > l2.clientWidth;

    if (isL2Overflowing) {
        l2.classList.add('is-truncated');
    } else {
        l2.classList.remove('is-truncated');
    }
}


function toggleEdit(show) {
    const overlay = document.getElementById('editOverlay');
    const content = document.getElementById('editContent');
    const textArea = document.getElementById('textArea'); // 抓取原文字區
    
    if (show) {
        isEditing = true; // 鎖定狀態
        // 抓取目前的 line1 和 line2 並組合
        const l1 = document.getElementById('textLine1').innerText;
        const l2 = document.getElementById('textLine2').innerText;
        content.innerHTML = `${l1}<br>${l2}`;
        overlay.style.display = 'flex';
        textArea.style.opacity = '0'; // 隱藏原文字
        stopTimer(); // 打開時停止自動輪播
    } else {
        isEditing = false; // 解鎖狀態
        overlay.style.display = 'none';
        textArea.style.opacity = '1'; // 顯示原文字
        startTimer(); // 關閉後恢復
    }
}

// 綁定點擊事件到原本的文字區
document.getElementById('textArea').onclick = () => toggleEdit(true);



const editContent = document.getElementById('editContent');

editContent.addEventListener('wheel', (e) => {
    e.preventDefault(); // 阻止原本的快速捲動
    
    // e.deltaY 是滾輪的力道，我們把它除以 5 或 10 讓它變慢
    const slowScroll = e.deltaY / 15; 
    
    editContent.scrollTop += slowScroll;
}, { passive: false });



    // 更新進度條寬度的函數
    function updateProgress() {
        if (slideData.length > 1) { // 檢查圖片數量大於 1，避免出現除以 0 的錯誤
            // 使用 currentIndex (0, 1, 2...) 除以 (總數 - 1)
            const percent = (currentIndex / (slideData.length - 1)) * 100;
            progressBar.style.width = percent + '%';
        } else {
            // 如果只有一張圖，進度條直接 100% 或 0%
            progressBar.style.width = '100%'; 
        }
    }

function moveSlide(step) {
    goToSlide(currentIndex + step);
    // 這裡不要呼叫 resetTimer()，讓全域節拍繼續跑
}

    // 統一停止計時器的動作
    function stopTimer() {
        clearInterval(timer);
        timer = null; // 清空紀錄
    }

    // 啟動計時器前先檢查是否已經有在跑，或是否該跑
function startTimer() {
    if (isEditing || isMouseInside) return; // <-- 加上 isEditing 判斷
    if (timer) stopTimer();

    // 關鍵：計算距離下一個「全域節拍」的延遲時間
    // 例如現在是 12.5秒，下一個 4秒倍數是 16秒，我們就要等 3.5秒
    const now = Date.now();
    const timeUntilNextBeat = autoPlayDelay - (now % autoPlayDelay);

    // 先用一個一次性的 setTimeout 等到那個拍子上
    timer = setTimeout(() => {
        goToSlide(currentIndex + 1);
        // 到達拍子後，開始固定頻率的循環
        timer = setInterval(() => {
            if (!isMouseInside) {
                goToSlide(currentIndex + 1);
            }
        }, autoPlayDelay);
    }, timeUntilNextBeat);
}

    // 修改 3: 重置計時器時，判斷滑鼠是否在上面
function resetTimer() {
    stopTimer();
    startTimer(); // startTimer 內部會自動檢查 isMouseInside
}

container.onmouseenter = () => {
    isMouseInside = true; 
    stopTimer();
};

container.onmouseleave = () => {
    isMouseInside = false; 
    startTimer();
};

    function setupTouch() {
        container.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            clearInterval(timer);
        }, {passive: true});

        container.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                moveSlide(diff > 0 ? 1 : -1);
            } else {
                startTimer();
            }
        }, {passive: true});
    }

    init();
