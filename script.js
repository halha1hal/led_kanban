
window.addEventListener('alpine:init', () => {
    Alpine.data('ledcanvas', () => ({
        file: null,
        img: null,
        isCacheAvailable: false,
        doesSavetoCache: false,
        inputType: 'uploadimage',
        targetWidth: 1,
        targetHeight: 1,
        _patternNumWidth: 1,
        get patternNumWidth() {
            return this._patternNumWidth;
        },
        set patternNumWidth(value) {
            this._patternNumWidth = Math.max(1, value);
            this.targetWidth = this._patternNumWidth * this.patternSizeOut;
            this.startDrawing();
            this.saveToCache();
        },
        _patternNumHeight: 1,
        get patternNumHeight() {
            return this._patternNumHeight;
        },
        set patternNumHeight(value) {
            this._patternNumHeight = Math.max(1, value);
            this.targetHeight = this._patternNumHeight * this.patternSizeOut;
            this.startDrawing();
            this.saveToCache();
        },
        _isDrawing: false,
        get isDrawing() {
            return this._isDrawing;
        },
        set isDrawing(value) {
            this._isDrawing = value
            if (!value) { this.saveToCache() };
        },
        brushColor: '#000000',
        _baseColor: '#000000',
        get baseColor() {
            return this._baseColor;
        },
        set baseColor(value) {
            this._baseColor = value;
            this.refreshOverlay();
            this.saveToCache();
        },
        _patternSizeIn: 1,
        get patternSizeIn() {
            return this._patternSizeIn;
        },
        set patternSizeIn(value) {
            this._patternSizeIn = Math.max(1, value);
            this.displayImage();
        },
        _patternSizeOut: 1,
        get patternSizeOut() {
            return this._patternSizeOut;
        },
        set patternSizeOut(value) {
            this._patternSizeOut = Math.max(1, value);
            this.displayImage();
        },
        _circleSize: 1,
        get circleSize() {
            return this._circleSize;
        },
        set circleSize(value) {
            this._circleSize = Math.max(1, value);
            this.refreshOverlay();
            this.saveToCache();
        },
        panzoom: null,

        init() {
            // initialize panzoom and bind events
            const canvasContainer = this.$refs.canvasContainer;
            this.panzoom = Panzoom(canvasContainer, {
                maxScale: 5,
                minScale: 0.1,
                contain: 'outside',
                cursor: 'grab',
                noBind: true,
            });
            canvasContainer.addEventListener(
                'wheel',
                this.panzoom.zoomWithWheel
            );
            canvasContainer.addEventListener('contextmenu', (event) => {
                event.preventDefault();
            });
            canvasContainer.addEventListener('pointerdown', (event) => {
                switch (event.buttons) {
                    case 1:
                        this.isDrawing = true;
                        this.drawSquare(event);
                        break;
                    case 2:
                        this.panzoom.handleDown(event);
                        break;
                }
            });
            canvasContainer.addEventListener('pointermove', (event) => {
                switch (event.buttons) {
                    case 1:
                        this.drawSquare(event);
                        break;
                    case 2:
                        this.panzoom.handleMove(event);
                        break;
                }
            });
            canvasContainer.addEventListener('pointerup', (event) => {
                this.isDrawing = false;
                this.panzoom.handleUp(event);
            });
            canvasContainer.addEventListener('pointercancel', (event) => {
                this.isDrawing = false;
                this.panzoom.handleUp(event);
            });
            this.checkCache();
        },

        uploadFile(event) {
            const newFile = event.target.files[0];
            if (!newFile || this.file === newFile) return;
            this.file = newFile;
            const img = new Image();
            img.onload = () => {
                this.img = img;
                this.targetWidth = img.naturalWidth;
                this.targetHeight = img.naturalHeight;
                this.displayImage();
                URL.revokeObjectURL(this.img.src);
            };
            img.src = URL.createObjectURL(this.file);
        },

        async checkCache() {
            const cache = await caches.open('editData');
            const response = await cache.match('/last-draft');
            if (response) {
                this.isCacheAvailable = true;
                return await response.json();
            } else {
                this.isCacheAvailable = false;
                return;
            }
        },

        async displayCache() {
            const draftData = await this.checkCache()
            if (!draftData) return;
            this._patternSizeOut = draftData.patternSizeOut;
            this._patternNumWidth = draftData.patternNumWidth;
            this.targetWidth = this._patternNumWidth * this.patternSizeOut;
            this._patternNumHeight = draftData.patternNumHeight;
            this.targetHeight = this._patternNumHeight * this.patternSizeOut;
            this._circleSize = draftData.circleSize;
            this._baseColor = draftData.baseColor;
            const mainCanvas = this.$refs.mainCanvas;
            mainCanvas.width = this.targetWidth;
            mainCanvas.height = this.targetHeight;
            this.$refs.canvasContainer.width = this.targetWidth;
            this.$refs.canvasContainer.height = this.targetHeight;
            this.$refs.overlayCanvas.width = this.targetWidth;
            this.$refs.overlayCanvas.height = this.targetHeight;
            const ctx = mainCanvas.getContext('2d');
            const img = new Image()
            img.onload = () => {
                ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                ctx.drawImage(img, 0, 0);
            };
            this.refreshOverlay();
            img.src = draftData.canvasImage;
            this.doesSavetoCache = true;
        },

        async saveToCache() {
            if (!this.doesSavetoCache) return;
            const mainCanvas = this.$refs.mainCanvas;
            const cache = await caches.open('editData');
            const dataURL = mainCanvas.toDataURL('image/png');
            const draftData = {
                canvasImage: dataURL,
                patternSizeOut: this.patternSizeOut,
                patternNumWidth: this.patternNumWidth,
                patternNumHeight: this.patternNumHeight,
                circleSize: this.circleSize,
                baseColor: this.baseColor,
            };
            const response = new Response(JSON.stringify(draftData), {
                headers: { 'Content-Type': 'application/json' }
            });
            await cache.put('/last-draft', response);
        },

        startDrawing() {
            this.img = null;
            this.file = null;

            const mainCanvas = this.$refs.mainCanvas;
            mainCanvas.width = this.targetWidth;
            mainCanvas.height = this.targetHeight;
            this.$refs.canvasContainer.width = this.targetWidth;
            this.$refs.canvasContainer.height = this.targetHeight;
            this.$refs.overlayCanvas.width = this.targetWidth;
            this.$refs.overlayCanvas.height = this.targetHeight;
            const ctx = mainCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.targetWidth, this.targetHeight)
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = this.baseColor;
            ctx.fillRect(0, 0, this.targetWidth, this.targetHeight);
        },

        displayImage() {
            const canvas = this.$refs.mainCanvas;
            const tempCanvas = document.createElement('canvas')
            if (!this.img) {
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
            }

            const canvasScale = 1 / this.patternSizeIn * this.patternSizeOut;
            const canvasWidth = this.targetWidth * canvasScale;
            const canvasHeight = this.targetHeight * canvasScale;

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            this.$refs.canvasContainer.width = canvasWidth;
            this.$refs.canvasContainer.height = canvasHeight;
            this.$refs.overlayCanvas.width = canvasWidth;
            this.$refs.overlayCanvas.height = canvasHeight;

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvasWidth, canvasHeight)
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.img ? this.img : tempCanvas, 0, 0, canvasWidth, canvasHeight);
            this.refreshOverlay();
        },

        refreshOverlay() {
            const mainCanvas = this.$refs.mainCanvas;
            const overlayCanvas = this.$refs.overlayCanvas;
            if (!mainCanvas || !overlayCanvas) return;

            const width = mainCanvas.width;
            const height = mainCanvas.height;
            if (!width || !height) return;

            overlayCanvas.width = width;
            overlayCanvas.height = height;

            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = this._patternSizeOut;
            tileCanvas.height = this._patternSizeOut;
            const tileCtx = tileCanvas.getContext('2d');

            tileCtx.fillStyle = this._baseColor;
            tileCtx.fillRect(0, 0, this._patternSizeOut, this._patternSizeOut);
            tileCtx.globalCompositeOperation = 'destination-out';
            tileCtx.beginPath();
            tileCtx.arc(this._patternSizeOut / 2, this._patternSizeOut / 2, this._circleSize / 2, 0, Math.PI * 2);
            tileCtx.fill();

            const overlayCtx = overlayCanvas.getContext('2d');
            overlayCtx.clearRect(0, 0, width, height);

            const pattern = overlayCtx.createPattern(tileCanvas, 'repeat');
            if (pattern) {
                overlayCtx.fillStyle = pattern;
                overlayCtx.fillRect(0, 0, width, height);
            }
        },

        drawSquare(event) {
            const mainCanvas = this.$refs.mainCanvas;
            if (!this.isDrawing) return;
            if (!mainCanvas) return;
            if (!this.panzoom) return;
            const ctx = mainCanvas.getContext('2d')
            const rect = mainCanvas.getBoundingClientRect();
            const localX =
                (event.clientX - rect.left) * mainCanvas.width / rect.width;
            const localY =
                (event.clientY - rect.top) * mainCanvas.height / rect.height;
            const drawX = Math.floor(localX / this.patternSizeOut) * this.patternSizeOut;
            const drawY = Math.floor(localY / this.patternSizeOut) * this.patternSizeOut;
            ctx.fillStyle = this.brushColor;
            ctx.fillRect(drawX, drawY, this.patternSizeOut, this.patternSizeOut);
        },

        downloadImage() {
            const mainCanvas = this.$refs.mainCanvas;
            const overlayCanvas = this.$refs.overlayCanvas;
            if (!mainCanvas || !overlayCanvas) return;

            const width = mainCanvas.width;
            const height = mainCanvas.height;
            if (!width || !height) return;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const ctx = tempCanvas.getContext('2d');

            ctx.drawImage(mainCanvas, 0, 0);
            ctx.drawImage(overlayCanvas, 0, 0);

            const link = document.createElement('a');
            link.download = 'led-sign.png';
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        }
    }))
})
