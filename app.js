// 壁纸管理应用 - 优化版
class WallpaperGallery {
    constructor() {
        this.staticWallpapers = [];
        this.dynamicWallpapers = [];
        this.currentTab = 'static';
        this.currentPage = { static: 1, dynamic: 1 };
        this.itemsPerPage = 15;
        this.currentIndex = 0;
        this.storageKey = {
            static: 'static_wallpapers',
            dynamic: 'dynamic_wallpapers',
            fitModes: 'wallpaper_fit_modes'
        };
        this.fitModes = {}; // 存储每个壁纸的显示模式
        this.timeUpdateInterval = null;
        this.uploadingCount = 0; // 追踪上传进度
        this.batchMode = false; // 批量删除模式
        this.selectedItems = new Set(); // 选中的壁纸ID

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.render();
        this.updateDateTime();
    }

    bindEvents() {
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.closest('.tab-btn').dataset.tab;
                this.switchTab(tab);
            });
        });

        // 批量删除按钮
        document.getElementById('batchDeleteBtn').addEventListener('click', () => {
            this.toggleBatchMode();
        });

        // 批量操作工具栏按钮
        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.selectAll();
        });

        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            this.deleteSelected();
        });

        document.getElementById('cancelBatchBtn').addEventListener('click', () => {
            this.toggleBatchMode();
        });

        // 全屏查看器控制
        const fullscreenContainer = document.getElementById('fullscreenContainer');

        fullscreenContainer.addEventListener('click', (e) => {
            if (e.target === fullscreenContainer ||
                e.target.id === 'fullscreenImage' ||
                e.target.id === 'fullscreenVideo') {
                this.closeFullscreen();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (fullscreenContainer.classList.contains('active')) {
                if (e.key === 'Escape') this.closeFullscreen();
                if (e.key === 'ArrowLeft') this.navigate(-1);
                if (e.key === 'ArrowRight') this.navigate(1);
            }
        });

        // 触摸滑动支持
        let touchStartX = 0;
        let touchEndX = 0;

        fullscreenContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        fullscreenContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });

        fullscreenContainer.addEventListener('dblclick', () => {
            if (!document.fullscreenElement) {
                fullscreenContainer.requestFullscreen().catch(err => {
                    console.log('无法进入全屏模式:', err);
                });
            }
        });
    }

    handleSwipe(startX, endX) {
        const threshold = 50;
        if (startX - endX > threshold) {
            this.navigate(1);
        } else if (endX - startX > threshold) {
            this.navigate(-1);
        }
    }

    switchTab(tab) {
        this.currentTab = tab;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.getElementById('staticSection').classList.toggle('hidden', tab !== 'static');
        document.getElementById('dynamicSection').classList.toggle('hidden', tab !== 'dynamic');
    }

    handleFileSelect(e) {
        const files = e.target?.files || e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        this.uploadingCount = files.length;
        let uploadedCount = 0;
        let successCount = 0;

        Array.from(files).forEach(file => {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');

            if (!isImage && !isVideo) {
                this.showToast(`${file.name} 不是有效的图片或视频文件！`);
                uploadedCount++;
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const wallpaper = {
                    id: Date.now() + Math.random(),
                    src: event.target.result,
                    name: file.name,
                    type: isImage ? 'image' : 'video',
                    uploadDate: new Date().toISOString()
                };

                // 设置默认显示模式
                this.fitModes[wallpaper.id] = 'contain';

                this.addWallpaper(wallpaper);
                successCount++;
                uploadedCount++;

                // 所有文件处理完成后显示单次提示
                if (uploadedCount === this.uploadingCount) {
                    this.showToast(`✅ 成功上传 ${successCount} 个文件！`);
                    this.uploadingCount = 0;
                }
            };

            reader.onerror = () => {
                uploadedCount++;
                this.showToast(`❌ ${file.name} 上传失败！`);
            };

            reader.readAsDataURL(file);
        });

        if (e.target) e.target.value = '';
    }

    addWallpaper(wallpaper) {
        if (wallpaper.type === 'image') {
            this.staticWallpapers.unshift(wallpaper);
        } else {
            this.dynamicWallpapers.unshift(wallpaper);
        }

        this.saveToStorage();
        this.render();
    }

    deleteWallpaper(id, type) {
        if (type === 'image') {
            this.staticWallpapers = this.staticWallpapers.filter(w => w.id !== id);
        } else {
            this.dynamicWallpapers = this.dynamicWallpapers.filter(w => w.id !== id);
        }

        // 删除对应的显示模式设置
        delete this.fitModes[id];

        // 从选中列表中移除
        this.selectedItems.delete(id);

        this.saveToStorage();
        this.render();
        this.updateSelectedCount();
        this.showToast('壁纸已删除');
    }

    toggleBatchMode() {
        this.batchMode = !this.batchMode;
        this.selectedItems.clear();

        const batchBtn = document.getElementById('batchDeleteBtn');
        const toolbar = document.getElementById('batchToolbar');

        if (this.batchMode) {
            batchBtn.classList.add('active');
            toolbar.classList.add('active');
            this.showToast('已进入批量删除模式，点击壁纸选择');
        } else {
            batchBtn.classList.remove('active');
            toolbar.classList.remove('active');
            this.showToast('已退出批量删除模式');
        }

        this.render();
    }

    toggleSelectItem(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        this.updateSelectedCount();
        this.updateCheckboxState(id);
    }

    selectAll() {
        const wallpapers = this.currentTab === 'static' ? this.staticWallpapers : this.dynamicWallpapers;

        if (this.selectedItems.size === wallpapers.length) {
            // 全部选中，则取消全选
            this.selectedItems.clear();
            this.showToast('已取消全选');
        } else {
            // 选中所有
            this.selectedItems.clear();
            wallpapers.forEach(w => this.selectedItems.add(w.id));
            this.showToast(`已全选 ${wallpapers.length} 项`);
        }

        this.updateSelectedCount();
        this.render();
    }

    async deleteSelected() {
        if (this.selectedItems.size === 0) {
            this.showToast('请先选择要删除的壁纸');
            return;
        }

        const count = this.selectedItems.size;
        if (!confirm(`确定要删除选中的 ${count} 张壁纸吗？此操作不可恢复！`)) {
            return;
        }

        const selectedIds = Array.from(this.selectedItems);

        // 删除选中的壁纸
        this.staticWallpapers = this.staticWallpapers.filter(w => !selectedIds.includes(w.id));
        this.dynamicWallpapers = this.dynamicWallpapers.filter(w => !selectedIds.includes(w.id));

        // 删除对应的显示模式设置
        selectedIds.forEach(id => {
            delete this.fitModes[id];
        });

        this.selectedItems.clear();
        this.saveToStorage();
        this.render();
        this.updateSelectedCount();
        this.showToast(`已删除 ${count} 张壁纸`);
    }

    updateSelectedCount() {
        const countEl = document.getElementById('selectedCount');
        if (countEl) {
            countEl.textContent = this.selectedItems.size;
        }

        // 更新全选按钮文字
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            const wallpapers = this.currentTab === 'static' ? this.staticWallpapers : this.dynamicWallpapers;
            if (this.selectedItems.size === wallpapers.length && wallpapers.length > 0) {
                selectAllBtn.textContent = '取消全选';
            } else {
                selectAllBtn.textContent = '全选';
            }
        }
    }

    updateCheckboxState(id) {
        const checkbox = document.querySelector(`.wallpaper-checkbox[data-id="${id}"]`);
        const item = document.querySelector(`.wallpaper-item[data-wallpaper-id="${id}"]`);

        if (checkbox) {
            if (this.selectedItems.has(id)) {
                checkbox.classList.add('checked');
                if (item) item.classList.add('selected');
            } else {
                checkbox.classList.remove('checked');
                if (item) item.classList.remove('selected');
            }
        }
    }

    clearAll() {
        const wallpapers = this.currentTab === 'static' ? this.staticWallpapers : this.dynamicWallpapers;

        // 清除这些壁纸的显示模式设置
        wallpapers.forEach(w => {
            delete this.fitModes[w.id];
        });

        if (this.currentTab === 'static') {
            this.staticWallpapers = [];
            this.currentPage.static = 1;
        } else {
            this.dynamicWallpapers = [];
            this.currentPage.dynamic = 1;
        }

        this.saveToStorage();
        this.render();
        this.showToast('已清空所有壁纸');
    }

    changeFitMode(id, type) {
        const modes = ['contain', 'cover', 'fill'];
        const currentMode = this.fitModes[id] || 'contain';
        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.fitModes[id] = modes[nextIndex];

        // 保存设置（标记为切换模式操作，避免内存警告）
        this.saveToStorage(true);

        // 只更新按钮图标，不重新渲染整个网格（避免视频重新加载）
        const modeIcons = {
            'contain': '📐',
            'cover': '🖼️',
            'fill': '⬛'
        };
        const modeNames = {
            'contain': '自适应',
            'cover': '拉伸填充',
            'fill': '完全拉伸'
        };

        // 更新按钮图标和提示
        const btn = document.querySelector(`.fit-mode-btn[data-id="${id}"]`);
        if (btn) {
            btn.textContent = modeIcons[this.fitModes[id]];
            btn.title = modeNames[this.fitModes[id]];
        }

        // 显示切换提示
        this.showToast(`已切换至: ${modeNames[this.fitModes[id]]}`);
    }

    openFullscreen(index) {
        const wallpapers = this.currentTab === 'static' ? this.staticWallpapers : this.dynamicWallpapers;
        this.currentIndex = index;
        const wallpaper = wallpapers[index];

        const container = document.getElementById('fullscreenContainer');
        const image = document.getElementById('fullscreenImage');
        const video = document.getElementById('fullscreenVideo');

        // 获取该壁纸的显示模式
        const fitMode = this.fitModes[wallpaper.id] || 'contain';

        // 隐藏所有媒体元素
        image.style.display = 'none';
        video.style.display = 'none';
        image.classList.remove('loaded');
        video.classList.remove('loaded');

        if (wallpaper.type === 'image') {
            image.style.display = 'block';
            image.style.objectFit = fitMode;
            image.src = wallpaper.src;
            image.onload = () => {
                image.classList.add('loaded');
            };
        } else {
            video.style.display = 'block';
            video.style.objectFit = fitMode;
            video.src = wallpaper.src;
            video.onloadeddata = () => {
                video.classList.add('loaded');
                video.play().catch(err => {
                    console.log('视频播放失败:', err);
                });
            };
        }

        container.classList.add('active');
        document.body.style.overflow = 'hidden';

        this.startTimeUpdate();
    }

    closeFullscreen() {
        const container = document.getElementById('fullscreenContainer');
        const video = document.getElementById('fullscreenVideo');

        container.classList.remove('active');
        document.body.style.overflow = 'auto';

        video.pause();
        video.src = '';

        this.stopTimeUpdate();

        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }

    navigate(direction) {
        const wallpapers = this.currentTab === 'static' ? this.staticWallpapers : this.dynamicWallpapers;

        this.currentIndex += direction;

        if (this.currentIndex < 0) {
            this.currentIndex = wallpapers.length - 1;
        } else if (this.currentIndex >= wallpapers.length) {
            this.currentIndex = 0;
        }

        this.openFullscreen(this.currentIndex);
    }

    render() {
        this.renderGrid('static');
        this.renderGrid('dynamic');
        this.updateCounts();
    }

    renderGrid(type) {
        const wallpapers = type === 'static' ? this.staticWallpapers : this.dynamicWallpapers;
        const grid = document.getElementById(type === 'static' ? 'staticGrid' : 'dynamicGrid');
        const emptyState = document.getElementById(type === 'static' ? 'staticEmpty' : 'dynamicEmpty');

        if (wallpapers.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            document.getElementById(type === 'static' ? 'staticPagination' : 'dynamicPagination').innerHTML = '';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';

        const currentPage = this.currentPage[type];
        const totalPages = Math.ceil(wallpapers.length / this.itemsPerPage);
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageWallpapers = wallpapers.slice(startIndex, endIndex);

        grid.innerHTML = pageWallpapers.map((wallpaper, pageIndex) => {
            const actualIndex = startIndex + pageIndex;
            const fitMode = this.fitModes[wallpaper.id] || 'contain';
            const isSelected = this.selectedItems.has(wallpaper.id);
            const modeIcons = {
                'contain': '📐',
                'cover': '🖼️',
                'fill': '⬛'
            };
            const modeNames = {
                'contain': '自适应',
                'cover': '拉伸填充',
                'fill': '完全拉伸'
            };

            const mediaTag = wallpaper.type === 'image'
                ? `<img src="${wallpaper.src}" alt="${wallpaper.name}" loading="lazy" style="object-fit: ${fitMode}">`
                : `<video src="${wallpaper.src}" loop muted autoplay playsinline style="object-fit: ${fitMode}"></video>`;

            return `
                <div class="wallpaper-item ${this.batchMode ? 'batch-mode' : ''} ${isSelected ? 'selected' : ''}"
                     data-index="${actualIndex}"
                     data-type="${type}"
                     data-wallpaper-id="${wallpaper.id}">
                    ${mediaTag}
                    <div class="media-type-badge">${wallpaper.type === 'image' ? '静态' : '动态'}</div>
                    <div class="wallpaper-checkbox ${this.batchMode ? 'show' : ''} ${isSelected ? 'checked' : ''}"
                         data-id="${wallpaper.id}"></div>
                    <button class="fit-mode-btn" data-id="${wallpaper.id}" data-type="${wallpaper.type}" title="${modeNames[fitMode]}">
                        ${modeIcons[fitMode]}
                    </button>
                    <button class="delete-btn" data-id="${wallpaper.id}" data-type="${wallpaper.type}" title="删除">×</button>
                </div>
            `;
        }).join('');

        // 绑定点击事件
        grid.querySelectorAll('.wallpaper-item').forEach(item => {
            // 批量模式下的点击
            if (this.batchMode) {
                item.addEventListener('click', (e) => {
                    // 如果点击的是删除按钮，不触发选择
                    if (e.target.classList.contains('delete-btn')) {
                        return;
                    }
                    const wallpaperId = parseFloat(item.dataset.wallpaperId);
                    this.toggleSelectItem(wallpaperId);
                });
            } else {
                // 正常模式下的点击
                item.addEventListener('click', (e) => {
                    // 如果点击的是按钮，不触发全屏
                    if (e.target.classList.contains('fit-mode-btn') ||
                        e.target.classList.contains('delete-btn')) {
                        return;
                    }
                    const index = parseInt(item.dataset.index);
                    this.openFullscreen(index);
                });
            }

            const fitModeBtn = item.querySelector('.fit-mode-btn');
            if (fitModeBtn) {
                fitModeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseFloat(fitModeBtn.dataset.id);
                    const type = fitModeBtn.dataset.type;
                    this.changeFitMode(id, type);
                });
            }

            const deleteBtn = item.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseFloat(deleteBtn.dataset.id);
                    const type = deleteBtn.dataset.type;
                    if (confirm('确定要删除这张壁纸吗？')) {
                        this.deleteWallpaper(id, type);
                    }
                });
            }
        });

        this.renderPagination(type, totalPages);
    }

    renderPagination(type, totalPages) {
        const pagination = document.getElementById(type === 'static' ? 'staticPagination' : 'dynamicPagination');
        const currentPage = this.currentPage[type];

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = `
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="gallery.goToPage('${type}', ${currentPage - 1})">
                上一页
            </button>
        `;

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="gallery.goToPage('${type}', ${i})">
                    ${i}
                </button>
            `;
        }

        html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="gallery.goToPage('${type}', ${currentPage + 1})">
                下一页
            </button>
        `;

        pagination.innerHTML = html;
    }

    goToPage(type, page) {
        this.currentPage[type] = page;
        this.renderGrid(type);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateCounts() {
        document.getElementById('staticCount').textContent = this.staticWallpapers.length;
        document.getElementById('dynamicCount').textContent = this.dynamicWallpapers.length;
    }

    saveToStorage(skipWarning = false) {
        try {
            const staticData = JSON.stringify(this.staticWallpapers);
            const dynamicData = JSON.stringify(this.dynamicWallpapers);
            const fitModesData = JSON.stringify(this.fitModes);

            const totalSize = (new Blob([staticData]).size + new Blob([dynamicData]).size) / 1024 / 1024;

            // 只在超过8MB且非跳过警告时显示（避免重复提示）
            if (totalSize > 8 && this.uploadingCount === 0 && !skipWarning) {
                this.showToast(`⚠️ 存储占用 ${totalSize.toFixed(2)} MB，接近限制`);
            }

            localStorage.setItem(this.storageKey.static, staticData);
            localStorage.setItem(this.storageKey.dynamic, dynamicData);
            localStorage.setItem(this.storageKey.fitModes, fitModesData);

            // 更新存储显示
            this.updateStorageDisplay(totalSize);
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                alert('存储空间已满！\n\n当前浏览器限制约 10MB。\n建议：\n1. 删除一些壁纸\n2. 上传前压缩文件\n3. 使用更小的图片/视频');
            } else {
                console.error('保存失败:', e);
            }
        }
    }

    loadFromStorage() {
        try {
            const staticData = localStorage.getItem(this.storageKey.static);
            const dynamicData = localStorage.getItem(this.storageKey.dynamic);
            const fitModesData = localStorage.getItem(this.storageKey.fitModes);

            if (staticData) {
                this.staticWallpapers = JSON.parse(staticData);
            }
            if (dynamicData) {
                this.dynamicWallpapers = JSON.parse(dynamicData);
            }
            if (fitModesData) {
                this.fitModes = JSON.parse(fitModesData);
            }

            // 初始化时更新存储显示
            const totalSize = (new Blob([staticData || '']).size + new Blob([dynamicData || '']).size) / 1024 / 1024;
            this.updateStorageDisplay(totalSize);
        } catch (e) {
            console.error('加载失败:', e);
            this.staticWallpapers = [];
            this.dynamicWallpapers = [];
            this.fitModes = {};
        }
    }

    updateStorageDisplay(sizeMB) {
        const storageDisplay = document.getElementById('storageDisplay');
        if (storageDisplay) {
            const percent = (sizeMB / 10) * 100;
            const color = percent > 80 ? '#ff4757' : percent > 50 ? '#ffa502' : '#5cd85c';
            storageDisplay.innerHTML = `
                <span style="color: ${color}">💾 ${sizeMB.toFixed(2)} MB</span>
                <span style="opacity: 0.7">/ 10 MB</span>
            `;
        }
    }

    updateDateTime() {
        const now = new Date();

        // 时间格式：HH:MM（不显示秒）
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        // 日期格式：2024年1月1日 星期一
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = weekdays[now.getDay()];
        const dateStr = `${year}年${month}月${date}日 ${weekday}`;

        document.getElementById('timeDisplay').textContent = timeStr;
        document.getElementById('dateDisplay').textContent = dateStr;
    }

    startTimeUpdate() {
        this.updateDateTime();
        // 每分钟更新一次（60秒）
        this.timeUpdateInterval = setInterval(() => {
            this.updateDateTime();
        }, 60000);
    }

    stopTimeUpdate() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
    }

    showToast(message) {
        // 移除现有的 toast（避免重叠）
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

// 初始化应用
const gallery = new WallpaperGallery();
