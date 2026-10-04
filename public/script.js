
window.addEventListener('alpine:init', () => {
    Alpine.data('ledcanvas', () => ({
        file: null,
        _baseColor: '#000000',
        get baseColor() {
            return this._baseColor
        },
        set baseColor(value) {
            this._baseColor = value;
            this.refreshOverlay();
        },
        _patternSize: 1,
        get patternSize() {
            return this._patternSize
        },
        set patternSize(value) {
            this._patternSize = Math.max(1, value);
            this.refreshOverlay();
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
        init() { },
        uploadFile(event) {
            const newFile = event.target.files[0];
            if (!newFile || this.file === newFile) { return }
            this.file = newFile
            const img = new Image();
            img.onload = () => {
                const canvas = this.$refs.mainCanvas;

                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                this.$refs.canvasContainer.width = img.naturalWidth;
                this.$refs.canvasContainer.height = img.naturalHeight;
                this.$refs.overlayCanvas.width = img.naturalWidth;
                this.$refs.overlayCanvas.height = img.naturalHeight;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                this.panzoom = Panzoom(this.$refs.canvasContainer, {
                    maxScale: 5,
                    minScale: 0.1,
                    contain: 'outside',
                    cursor: 'grab',
                });

                canvas.parentElement.addEventListener(
                    'wheel',
                    this.panzoom.zoomWithWheel
                );

                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(this.file);
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
            tileCanvas.width = this._patternSize;
            tileCanvas.height = this._patternSize;
            const tileCtx = tileCanvas.getContext('2d');

            tileCtx.fillStyle = this._baseColor;
            tileCtx.fillRect(0, 0, this._patternSize, this._patternSize);
            tileCtx.globalCompositeOperation = 'destination-out';
            tileCtx.beginPath();
            tileCtx.arc(this._patternSize / 2, this._patternSize / 2, this._circleSize / 2, 0, Math.PI * 2);
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
