// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = (function () {
	return  window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function (callback) {
			window.setTimeout(callback, 1000 / 60);
		};
})();
function VideoFairy() {
	this.screen_ = document.getElementById('nes_screen');
	this.ctx_ = this.screen_.getContext('2d');
	this.image_ = this.ctx_.createImageData(256, 240);
	this.palette_ = cycloa.NesPalette;
	this.prevBuffer_ = new Uint8Array(256*240);
	for (var i = 0; i < 256 * 240; ++i) {
		this.image_.data[(i << 2) + 3] = 0xff;
	}
	this.dispatchRendering = function (/* const uint8_t*/ nesBuffer, /* const uint8_t */ paletteMask) {
		var dat = this.image_.data;
		var palette = this.palette_;
		var prevBuffer = this.prevBuffer_;
		var pixel;
		for (var i = 0; i < 61440 /* = 256*240 */; ++i) {
			//TODO: 最適化
			pixel = nesBuffer[i] & paletteMask;
			if(pixel != prevBuffer[i]){
				var idx = i << 2, color = palette[pixel];
				dat[idx    ] = (color >> 16) & 0xff;
				dat[idx + 1] = (color >> 8) & 0xff;
				dat[idx + 2] = color & 0xff;
				prevBuffer[i] = pixel;
			}
		}
		this.ctx_.putImageData(this.image_, 0, 0);
	};
}
VideoFairy.prototype = new cycloa.AbstractVideoFairy();
VideoFairy.prototype.recycle = function(){
	this.ctx_.fillStyle="#000000";
	this.ctx_.fillRect(0, 0, 256, 240);
	var prevBuffer = this.prevBuffer_;
	for(var i=0;i < 240*256; ++i){
		prevBuffer[i] = 0xff;
	}
};
function AudioFairy() {
	this.SAMPLE_RATE_ = 22050;
	this.dataLength = (this.SAMPLE_RATE_ / 4) | 0;
	this.enabled = false;
	var context = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
	if (context) {
		this.enabled = true;
		this.context_ = new context();
		this.context_.sampleRate = this.SAMPLE_RATE_;
		this.dataIndex = 0;
		this.initBuffer = function () {
			this.buffer_ = this.context_.createBuffer(1, this.dataLength, this.SAMPLE_RATE_);
			this.data = this.buffer_.getChannelData(0);
		};
		this.onDataFilled = function () {
			var src = this.context_.createBufferSource();
			src.loop = false;
			src.connect(this.context_.destination);
			src.buffer = this.buffer_;
			src.noteOn(0);
			this.initBuffer();
			this.dataIndex = 0;
		};
		this.initBuffer();
	}
}
AudioFairy.prototype = new cycloa.AbstractAudioFairy();
AudioFairy.prototype.recycle = function(){
	this.dataIndex = 0;
};
function PadFairy() {
	this.state = 0;
	var self = this;
	$(window).bind("keydown", function(e){
		switch (e.keyCode) {
			case 38:
				self.state |= self.MASK_UP;
				e.preventDefault();
				break;
			case 40:
				self.state |= self.MASK_DOWN;
				e.preventDefault();
				break;
			case 37:
				self.state |= self.MASK_LEFT;
				e.preventDefault();
				break;
			case 39:
				self.state |= self.MASK_RIGHT;
				e.preventDefault();
				break;
			case 90:
				self.state |= self.MASK_A;
				e.preventDefault();
				break;
			case 88:
				self.state |= self.MASK_B;
				e.preventDefault();
				break;
			case 32:
				self.state |= self.MASK_SELECT;
				e.preventDefault();
				break;
			case 13:
				self.state |= self.MASK_START;
				e.preventDefault();
				break;
		}
	});
	$(window).bind("keyup", function(e){
		e.preventDefault();
		switch (e.keyCode) {
			case 38:
				self.state &= ~self.MASK_UP;
				e.preventDefault();
				break;
			case 40:
				self.state &= ~self.MASK_DOWN;
				e.preventDefault();
				break;
			case 37:
				self.state &= ~self.MASK_LEFT;
				e.preventDefault();
				break;
			case 39:
				self.state &= ~self.MASK_RIGHT;
				e.preventDefault();
				break;
			case 90:
				self.state &= ~self.MASK_A;
				e.preventDefault();
				break;
			case 88:
				self.state &= ~self.MASK_B;
				e.preventDefault();
				break;
			case 32:
				self.state &= ~self.MASK_SELECT;
				e.preventDefault();
				break;
			case 13:
				self.state &= ~self.MASK_START;
				e.preventDefault();
				break;
		}
	});
}
PadFairy.prototype = new cycloa.AbstractPadFairy();
PadFairy.prototype.recycle = function(){
	this.state = 0;
};