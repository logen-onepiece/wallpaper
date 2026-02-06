// 壁纸管理应用 - IndexedDB 版本（支持大容量 + Firebase 云端同步）
class WallpaperGalleryDB {
    constructor() {
        this.staticWallpapers = [];
        this.dynamicWallpapers = [];
        this.currentTab = 'static';
        this.currentPage = { static: 1, dynamic: 1 };
        this.itemsPerPage = 15;
        this.currentIndex = 0;
        this.fitModes = {};
        this.timeUpdateInterval = null;
        this.uploadingCount = 0;
        this.batchMode = false; // 批量删除模式
        this.selectedItems = new Set(); // 选中的壁纸ID
        this.storage = new IndexedDBStorage();
        this.eventsbound = false; // 事件绑定标志
        this.cloudSync = null; // Cloudflare 云端同步实例

        this.init();
    }

    async init() {
        // 首先绑定事件（只绑定一次，避免重复）
        if (!this.eventsbound) {
            this.bindEvents();
            this.eventsbound = true;
        }

        try {
            await this.storage.init();

            // 初始化 Cloudflare 云端同步（零配置）
            if (window.CloudflareSync) {
                this.cloudSync = new window.CloudflareSync(this.storage);
                const syncEnabled = await this.cloudSync.initialize();

                if (syncEnabled) {
                    this.showToast('☁️ 云端同步已启用（多设备自动同步）');
                    // 自动检查云端更新
                    await this.checkCloudUpdates();
                }
            }

            await this.loadFromStorage();
            this.render();
            this.updateDateTime();
            // 立即更新一次存储信息
            await this.updateStorageEstimate();
        } catch (error) {
            console.error('初始化失败:', error);
            // 如果初始化失败，仅重试一次
            setTimeout(async () => {
                try {
                    await this.storage.init();
                    await this.loadFromStorage();
                    this.render();
                    await this.updateStorageEstimate();
                } catch (retryError) {
                    console.error('重试失败:', retryError);
                }
            }, 500);
        }
    }

    bindEvents() {
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

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

        // 导出/导入按钮
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });

        document.getElementById('importFileInput').addEventListener('change', (e) => {
            this.importData(e);
        });

        // 云端同步按钮
        document.getElementById('syncToCloudBtn').addEventListener('click', () => {
            this.syncToCloud();
        });

        document.getElementById('syncFromCloudBtn').addEventListener('click', () => {
            this.syncFromCloud();
        });

        const fullscreenContainer = document.getElementById('fullscreenContainer');
        fullscreenContainer.addEventListener('click', (e) => {
            if (e.target === fullscreenContainer ||
                e.target.id === 'fullscreenImage' ||
                e.target.id === 'fullscreenVideo') {
                this.closeFullscreen();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (fullscreenContainer.classList.contains('active')) {
                if (e.key === 'Escape') this.closeFullscreen();
                if (e.key === 'ArrowLeft') this.navigate(-1);
                if (e.key === 'ArrowRight') this.navigate(1);
            }
        });

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
            reader.onload = async (event) => {
                const wallpaper = {
                    id: Date.now() + Math.random(),
                    src: event.target.result,
                    name: file.name,
                    type: isImage ? 'image' : 'video',
                    uploadDate: new Date().toISOString()
                };

                this.fitModes[wallpaper.id] = 'contain';

                await this.addWallpaper(wallpaper);
                successCount++;
                uploadedCount++;

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

    async addWallpaper(wallpaper) {
        try {
            console.log('正在保存壁纸到 IndexedDB:', wallpaper.name, wallpaper.type);
            await this.storage.saveWallpaper(wallpaper);
            console.log('壁纸已保存到 IndexedDB');

            if (wallpaper.type === 'image') {
                this.staticWallpapers.unshift(wallpaper);
            } else {
                this.dynamicWallpapers.unshift(wallpaper);
            }

            await this.saveSettings();
            console.log('设置已保存，当前壁纸数:', {
                static: this.staticWallpapers.length,
                dynamic: this.dynamicWallpapers.length
            });

            this.render();
            await this.updateStorageEstimate();

            // 上传到云端（不阻塞，后台执行）
            if (this.cloudSync && this.cloudSync.enabled) {
                // Cloudflare 自动同步会在用户点击按钮时执行，不在此处自动上传
                console.log('壁纸已保存到本地，可通过"同步到云端"按钮上传');
            }
        } catch (error) {
            console.error('保存壁纸失败:', error);
            this.showToast('保存失败，存储空间可能已满');
        }
    }

    async deleteWallpaper(id, type) {
        try {
            // 先找到要删除的壁纸对象
            const wallpaper = type === 'image'
                ? this.staticWallpapers.find(w => w.id === id)
                : this.dynamicWallpapers.find(w => w.id === id);

            await this.storage.deleteWallpaper(id);

            if (type === 'image') {
                this.staticWallpapers = this.staticWallpapers.filter(w => w.id !== id);
            } else {
                this.dynamicWallpapers = this.dynamicWallpapers.filter(w => w.id !== id);
            }

            delete this.fitModes[id];
            this.selectedItems.delete(id);

            await this.saveSettings();
            this.render();
            await this.updateStorageEstimate();
            this.updateSelectedCount();
            this.showToast('壁纸已删除');

            // Cloudflare 云端同步不需要实时删除，用户可手动同步
        } catch (error) {
            console.error('删除失败:', error);
            this.showToast('删除失败');
        }
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
            this.selectedItems.clear();
            this.showToast('已取消全选');
        } else {
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

        try {
            // 删除 IndexedDB 中的数据
            for (const id of selectedIds) {
                await this.storage.deleteWallpaper(id);
                delete this.fitModes[id];
            }

            // 更新内存数组
            this.staticWallpapers = this.staticWallpapers.filter(w => !selectedIds.includes(w.id));
            this.dynamicWallpapers = this.dynamicWallpapers.filter(w => !selectedIds.includes(w.id));

            this.selectedItems.clear();
            await this.saveSettings();
            this.render();
            await this.updateStorageEstimate();
            this.updateSelectedCount();
            this.showToast(`已删除 ${count} 张壁纸`);
        } catch (error) {
            console.error('批量删除失败:', error);
            this.showToast('批量删除失败');
        }
    }

    updateSelectedCount() {
        const countEl = document.getElementById('selectedCount');
        if (countEl) {
            countEl.textContent = this.selectedItems.size;
        }

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

    async clearAll() {
        const wallpapers = this.currentTab === 'static' ? this.staticWallpapers : this.dynamicWallpapers;

        try {
            for (const w of wallpapers) {
                await this.storage.deleteWallpaper(w.id);
                delete this.fitModes[w.id];
            }

            if (this.currentTab === 'static') {
                this.staticWallpapers = [];
                this.currentPage.static = 1;
            } else {
                this.dynamicWallpapers = [];
                this.currentPage.dynamic = 1;
            }

            await this.saveSettings();
            this.render();
            await this.updateStorageEstimate();
            this.showToast('已清空所有壁纸');
        } catch (error) {
            console.error('清空失败:', error);
            this.showToast('清空失败');
        }
    }

    changeFitMode(id, type) {
        const modes = ['contain', 'cover', 'fill'];
        const currentMode = this.fitModes[id] || 'contain';
        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.fitModes[id] = modes[nextIndex];

        this.saveSettings();

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

        const btn = document.querySelector(`.fit-mode-btn[data-id="${id}"]`);
        if (btn) {
            btn.textContent = modeIcons[this.fitModes[id]];
            btn.title = modeNames[this.fitModes[id]];
        }

        this.showToast(`已切换至: ${modeNames[this.fitModes[id]]}`);
    }

    openFullscreen(index) {
        const wallpapers = this.currentTab === 'static' ? this.staticWallpapers : this.dynamicWallpapers;
        this.currentIndex = index;
        const wallpaper = wallpapers[index];

        const container = document.getElementById('fullscreenContainer');
        const image = document.getElementById('fullscreenImage');
        const video = document.getElementById('fullscreenVideo');

        const fitMode = this.fitModes[wallpaper.id] || 'contain';

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

        grid.querySelectorAll('.wallpaper-item').forEach(item => {
            // 首先为按钮绑定事件（优先级最高）
            const fitModeBtn = item.querySelector('.fit-mode-btn');
            if (fitModeBtn) {
                fitModeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const id = parseFloat(fitModeBtn.dataset.id);
                    const type = fitModeBtn.dataset.type;
                    this.changeFitMode(id, type);
                });
            }

            const deleteBtn = item.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const id = parseFloat(deleteBtn.dataset.id);
                    const type = deleteBtn.dataset.type;
                    if (confirm('确定要删除这张壁纸吗？')) {
                        this.deleteWallpaper(id, type);
                    }
                });
            }

            // 批量模式下的点击
            if (this.batchMode) {
                item.addEventListener('click', (e) => {
                    // 检查是否点击了按钮或其子元素
                    if (e.target.closest('.delete-btn') ||
                        e.target.closest('.fit-mode-btn')) {
                        return;
                    }
                    const wallpaperId = parseFloat(item.dataset.wallpaperId);
                    this.toggleSelectItem(wallpaperId);
                });
            } else {
                // 正常模式下的点击 - 改进触摸设备的事件处理
                let touchStartX = 0;
                let touchStartY = 0;
                let touchStartTime = 0;

                // 触摸开始
                item.addEventListener('touchstart', (e) => {
                    // 如果触摸了按钮，不记录起始位置
                    if (e.target.closest('.fit-mode-btn') ||
                        e.target.closest('.delete-btn')) {
                        return;
                    }
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                }, { passive: true });

                // 触摸结束
                item.addEventListener('touchend', (e) => {
                    // 如果触摸了按钮，不触发全屏
                    if (e.target.closest('.fit-mode-btn') ||
                        e.target.closest('.delete-btn')) {
                        return;
                    }

                    const touchEndX = e.changedTouches[0].clientX;
                    const touchEndY = e.changedTouches[0].clientY;
                    const touchEndTime = Date.now();

                    // 计算移动距离
                    const moveX = Math.abs(touchEndX - touchStartX);
                    const moveY = Math.abs(touchEndY - touchStartY);
                    const totalMove = Math.sqrt(moveX * moveX + moveY * moveY);

                    // 计算触摸时长
                    const touchDuration = touchEndTime - touchStartTime;

                    // 判断是否为点击：移动距离小于10px，且触摸时长小于300ms
                    const isClick = totalMove < 10 && touchDuration < 300;

                    if (isClick) {
                        // 阻止默认行为，避免触发click事件（防止双重触发）
                        e.preventDefault();
                        const index = parseInt(item.dataset.index);
                        this.openFullscreen(index);
                    }
                }, { passive: false });

                // 桌面端的点击事件
                const openFullscreenHandler = (e) => {
                    // 检查是否点击了按钮或其子元素
                    if (e.target.closest('.fit-mode-btn') ||
                        e.target.closest('.delete-btn') ||
                        e.target.classList.contains('fit-mode-btn') ||
                        e.target.classList.contains('delete-btn')) {
                        return;
                    }
                    const index = parseInt(item.dataset.index);
                    this.openFullscreen(index);
                };

                item.addEventListener('click', openFullscreenHandler);
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
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="galleryDB.goToPage('${type}', ${currentPage - 1})">
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
                <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="galleryDB.goToPage('${type}', ${i})">
                    ${i}
                </button>
            `;
        }

        html += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="galleryDB.goToPage('${type}', ${currentPage + 1})">
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

    async saveSettings() {
        try {
            await this.storage.saveSetting('fitModes', this.fitModes);
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }

    async loadFromStorage() {
        try {
            console.log('开始从 IndexedDB 加载数据...');
            const allWallpapers = await this.storage.getAllWallpapers();
            console.log('从 IndexedDB 加载到的壁纸数量:', allWallpapers.length);

            this.staticWallpapers = allWallpapers
                .filter(w => w.type === 'image')
                .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

            this.dynamicWallpapers = allWallpapers
                .filter(w => w.type === 'video')
                .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

            console.log('分类后的壁纸:', {
                static: this.staticWallpapers.length,
                dynamic: this.dynamicWallpapers.length
            });

            const fitModes = await this.storage.getSetting('fitModes');
            if (fitModes) {
                this.fitModes = fitModes;
            }
        } catch (error) {
            console.error('加载失败:', error);
            this.staticWallpapers = [];
            this.dynamicWallpapers = [];
            this.fitModes = {};
        }
    }

    async updateStorageEstimate() {
        try {
            const estimate = await this.storage.getStorageEstimate();
            const usageMB = (estimate.usage || 0) / 1024 / 1024;
            let quotaMB = (estimate.quota || 0) / 1024 / 1024;

            // 如果 quota 为 0 或异常小，使用浏览器默认估算值
            if (quotaMB < 100) {
                // Chrome/Edge 通常有几十 GB，设置一个合理的默认值
                quotaMB = 50000; // 50GB
            }

            const storageDisplay = document.getElementById('storageDisplay');
            if (storageDisplay) {
                const percent = (usageMB / quotaMB) * 100;
                const color = percent > 80 ? '#ff4757' : percent > 50 ? '#ffa502' : '#5cd85c';

                storageDisplay.innerHTML = `
                    <span style="color: ${color}">💾 ${usageMB.toFixed(2)} MB</span>
                    <span style="opacity: 0.7">/ ${quotaMB.toFixed(0)} MB</span>
                `;
            }
        } catch (error) {
            console.error('获取存储信息失败:', error);
            // 即使失败也显示默认值
            const storageDisplay = document.getElementById('storageDisplay');
            if (storageDisplay) {
                storageDisplay.innerHTML = `
                    <span style="color: #5cd85c">💾 0.00 MB</span>
                    <span style="opacity: 0.7">/ 50000 MB</span>
                `;
            }
        }
    }

    updateDateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

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

    // 导出所有数据
    async exportData() {
        try {
            this.showToast('⏳ 正在导出数据...');

            const allWallpapers = await this.storage.getAllWallpapers();
            const fitModes = await this.storage.getSetting('fitModes') || {};

            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                wallpapers: allWallpapers,
                settings: {
                    fitModes: fitModes
                },
                stats: {
                    staticCount: this.staticWallpapers.length,
                    dynamicCount: this.dynamicWallpapers.length,
                    totalCount: allWallpapers.length
                }
            };

            // 转换为 JSON 字符串
            const jsonString = JSON.stringify(exportData);
            const blob = new Blob([jsonString], { type: 'application/json' });

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wallpaper-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast(`✅ 导出成功！共 ${allWallpapers.length} 张壁纸`);
        } catch (error) {
            console.error('导出失败:', error);
            this.showToast('❌ 导出失败，请重试');
        }
    }

    // 导入数据
    async importData(e) {
        const file = e.target?.files?.[0];
        if (!file) return;

        try {
            this.showToast('⏳ 正在导入数据...');

            const text = await file.text();
            const importData = JSON.parse(text);

            // 验证数据格式
            if (!importData.wallpapers || !Array.isArray(importData.wallpapers)) {
                throw new Error('无效的数据格式');
            }

            // 询问用户是否覆盖现有数据
            const currentCount = this.staticWallpapers.length + this.dynamicWallpapers.length;
            const importCount = importData.wallpapers.length;

            let shouldMerge = true;
            if (currentCount > 0) {
                const message = `当前有 ${currentCount} 张壁纸，导入文件包含 ${importCount} 张壁纸。\n\n` +
                    `点击"确定"合并数据（保留现有+添加新数据）\n` +
                    `点击"取消"将清空现有数据后导入`;
                shouldMerge = confirm(message);
            }

            // 如果选择不合并，先清空现有数据
            if (!shouldMerge) {
                await this.storage.clearWallpapers();
                this.staticWallpapers = [];
                this.dynamicWallpapers = [];
                this.fitModes = {};
            }

            // 导入壁纸数据
            let successCount = 0;
            let skipCount = 0;

            for (const wallpaper of importData.wallpapers) {
                try {
                    // 检查是否已存在（避免重复）
                    const exists = await this.storage.getAllWallpapers().then(
                        wallpapers => wallpapers.some(w => w.id === wallpaper.id)
                    );

                    if (exists && shouldMerge) {
                        skipCount++;
                        continue;
                    }

                    // 保存到 IndexedDB
                    await this.storage.saveWallpaper(wallpaper);

                    // 添加到内存数组
                    if (wallpaper.type === 'image') {
                        this.staticWallpapers.unshift(wallpaper);
                    } else {
                        this.dynamicWallpapers.unshift(wallpaper);
                    }

                    successCount++;
                } catch (err) {
                    console.error('导入壁纸失败:', wallpaper.name, err);
                }
            }

            // 导入设置
            if (importData.settings?.fitModes) {
                this.fitModes = { ...this.fitModes, ...importData.settings.fitModes };
                await this.saveSettings();
            }

            // 刷新界面
            this.render();
            await this.updateStorageEstimate();

            // 显示结果
            let resultMessage = `✅ 导入成功！新增 ${successCount} 张壁纸`;
            if (skipCount > 0) {
                resultMessage += `，跳过 ${skipCount} 张重复壁纸`;
            }
            this.showToast(resultMessage);

        } catch (error) {
            console.error('导入失败:', error);
            this.showToast('❌ 导入失败，请检查文件格式');
        } finally {
            // 清空文件选择器
            if (e.target) e.target.value = '';
        }
    }

    // 检查云端更新（页面加载时自动调用）
    async checkCloudUpdates() {
        if (!this.cloudSync || !this.cloudSync.enabled) {
            return;
        }

        try {
            const updateInfo = await this.cloudSync.checkForUpdates();

            if (!updateInfo) {
                console.log('无法检查云端更新');
                return;
            }

            if (updateInfo.hasUpdate) {
                const message = `☁️ 检测到云端有更新！\n\n` +
                    `云端: ${updateInfo.cloudCount} 张壁纸\n` +
                    `本地: ${updateInfo.localCount} 张壁纸\n` +
                    `更新时间: ${new Date(updateInfo.cloudDate).toLocaleString('zh-CN')}\n\n` +
                    `是否立即从云端下载更新？`;

                if (confirm(message)) {
                    await this.syncFromCloud();
                }
            } else {
                console.log('✅ 本地数据已是最新');
            }
        } catch (error) {
            console.error('检查云端更新失败:', error);
        }
    }

    // 同步到云端
    async syncToCloud() {
        if (!this.cloudSync || !this.cloudSync.enabled) {
            this.showToast('❌ 云端同步未启用');
            return;
        }

        try {
            this.showToast('⏳ 正在上传到云端...');

            const stats = await this.cloudSync.syncToCloud();

            this.showToast(`✅ 同步成功！已上传 ${stats.totalCount} 张壁纸到云端`);
        } catch (error) {
            console.error('同步到云端失败:', error);
            this.showToast('❌ 同步失败，请检查网络连接');
        }
    }

    // 从云端同步
    async syncFromCloud() {
        if (!this.cloudSync || !this.cloudSync.enabled) {
            this.showToast('❌ 云端同步未启用');
            return;
        }

        try {
            this.showToast('🌐 连接云端...');

            const cloudData = await this.cloudSync.syncFromCloud();

            if (!cloudData || !cloudData.wallpapers) {
                this.showToast('❌ 云端数据无效或不存在');
                return;
            }

            // 询问用户是否覆盖现有数据
            const currentCount = this.staticWallpapers.length + this.dynamicWallpapers.length;
            const importCount = cloudData.wallpapers.length;

            let shouldMerge = true;
            if (currentCount > 0) {
                const message = `当前有 ${currentCount} 张壁纸，云端有 ${importCount} 张壁纸。\n\n` +
                    `点击"确定"合并数据（保留现有+添加云端新数据）\n` +
                    `点击"取消"将清空现有数据后导入云端数据`;
                shouldMerge = confirm(message);
            }

            // 如果选择不合并，先清空现有数据
            if (!shouldMerge) {
                this.showToast('🗑️ 清空本地数据...');
                await this.storage.clearWallpapers();
                this.staticWallpapers = [];
                this.dynamicWallpapers = [];
                this.fitModes = {};
            }

            // 导入云端壁纸数据
            let successCount = 0;
            let skipCount = 0;
            const total = cloudData.wallpapers.length;

            this.showToast(`📥 开始导入 ${total} 张壁纸...`);

            for (let i = 0; i < cloudData.wallpapers.length; i++) {
                const wallpaper = cloudData.wallpapers[i];

                try {
                    // 每10张显示一次进度
                    if (i % 10 === 0 || i === cloudData.wallpapers.length - 1) {
                        this.showToast(`📥 正在导入 ${i + 1}/${total}...`);
                    }

                    // 检查是否已存在（避免重复）
                    const exists = await this.storage.getAllWallpapers().then(
                        wallpapers => wallpapers.some(w => w.id === wallpaper.id)
                    );

                    if (exists && shouldMerge) {
                        skipCount++;
                        continue;
                    }

                    // 保存到 IndexedDB
                    await this.storage.saveWallpaper(wallpaper);

                    // 添加到内存数组
                    if (wallpaper.type === 'image') {
                        this.staticWallpapers.unshift(wallpaper);
                    } else {
                        this.dynamicWallpapers.unshift(wallpaper);
                    }

                    successCount++;
                } catch (err) {
                    console.error('导入壁纸失败:', wallpaper.name, err);
                }
            }

            // 导入设置
            if (cloudData.settings?.fitModes) {
                this.fitModes = { ...this.fitModes, ...cloudData.settings.fitModes };
                await this.saveSettings();
            }

            this.showToast('🎨 更新界面...');

            // 刷新界面
            this.render();
            await this.updateStorageEstimate();

            // 显示结果
            let resultMessage = `✅ 同步完成！成功导入 ${successCount} 张壁纸`;
            if (skipCount > 0) {
                resultMessage += `\n跳过 ${skipCount} 张重复壁纸`;
            }
            this.showToast(resultMessage);

        } catch (error) {
            console.error('从云端同步失败:', error);

            // 详细的错误提示
            let errorMessage = '❌ 同步失败: ';
            if (error.message.includes('超时')) {
                errorMessage = '❌ 网络超时，请重试';
            } else if (error.message.includes('网络')) {
                errorMessage = '❌ 网络错误，请检查连接';
            } else if (error.message.includes('无效')) {
                errorMessage = '❌ 云端数据无效';
            } else if (error.message.includes('未启用')) {
                errorMessage = '❌ 请先配置 GitHub Token';
            } else {
                errorMessage += error.message;
            }

            this.showToast(errorMessage);
        }
    }
}

// 初始化应用（使用 IndexedDB 版本）
let galleryDB;
document.addEventListener('DOMContentLoaded', () => {
    galleryDB = new WallpaperGalleryDB();
});
