
window.addEventListener('alpine:init', () => {
    Alpine.data('ledcanvas', () => ({
        file: null,
        img: null,
        _baseColor: '#000000',
        get baseColor() {
            return this._baseColor
        },
        set baseColor(value) {
            this._baseColor = value;
            this.refreshOverlay();
        },
        _patternSizeIn: 1,
        get patternSizeIn() {
            return this._patternSizeIn
        },
        set patternSizeIn(value) {
            this._patternSizeIn = Math.max(1, value);
            this.displayImage();
        },
        _patternSizeOut: 1,
        get patternSizeOut() {
            return this._patternSizeOut
        },
        set patternSizeOut(value) {
            this._patternSizeOut = Math.max(1, value);
            this.displayImage();
        },
        _circleSize: 1,
        get circleSize() {
            return this._circleSize
        },
        set circleSize(value) {
            this._circleSize = Math.max(1, value);
            this.refreshOverlay();
        },
        panzoom: null,

        init() {
            this.panzoom = Panzoom(this.$refs.canvasContainer, {
                maxScale: 5,
                minScale: 0.1,
                contain: 'outside',
                cursor: 'grab',
            });
            this.$refs.canvasContainer.addEventListener(
                'wheel',
                this.panzoom.zoomWithWheel
            );
        },

        uploadFile(event) {
            const newFile = event.target.files[0];
            if (!newFile || this.file === newFile) { return }
            this.file = newFile
            const img = new Image();
            img.onload = () => {
                this.img = img;
                this.displayImage();
                URL.revokeObjectURL(this.img.src);
            };
            img.src = URL.createObjectURL(this.file);
        },

        displayImage() {
            if (!this.file || !this.img) { return }
            const canvas = this.$refs.mainCanvas;

            const canvasScale = 1 / this.patternSizeIn * this.patternSizeOut
            const canvasWidth = this.img.naturalWidth * canvasScale;
            const canvasHeight = this.img.naturalHeight * canvasScale;

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            this.$refs.canvasContainer.width = canvasWidth;
            this.$refs.canvasContainer.height = canvasHeight;
            this.$refs.overlayCanvas.width = canvasWidth;
            this.$refs.overlayCanvas.height = canvasHeight;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.img, 0, 0, canvasWidth, canvasHeight);
            this.refreshOverlay()
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
