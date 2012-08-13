%# -*- encoding: utf-8 -*-

this.onHardResetVideo = function() {
	//from http://wiki.nesdev.com/w/index.php/PPU_power_up_state
	for(var i=0;i< <%= Video::VramSize %>;++i) {
		this.internalVram[i] = 0;
	}
	for(var i=0;i< <%= Video::SpRamSize %>;++i) {
		this.spRam[i] = 0;
	}
	for(var i=0;i< <%= Video::PaletteSize %>;++i) {
		this.palette[i] = 0;
	}
	this.nowY=0;
	this.nowX=0;
	//0x2000
	this.executeNMIonVBlank = false;
	this.spriteHeight = 8;
	this.patternTableAddressBackground = 0x0000;
	this.patternTableAddress8x8Sprites = 0x0000;
	this.vramIncrementSize = 1;
	//0x2005 & 0x2000
	this.vramAddrReloadRegister = 0x0000;
	this.horizontalScrollBits = 0;
	//0x2001
	this.colorEmphasis = 0;
	this.spriteVisibility = false;
	this.backgroundVisibility = false;
	this.spriteClipping = true;
	this.backgroundClipping = true;
	this.paletteMask = 0x3f;
	//0x2003
	this.spriteAddr = 0;
	//0x2005/0x2006
	this.vramAddrRegisterWritten = false;
	this.scrollRegisterWritten = false;
	//0x2006
	this.vramAddrRegister = 0;
};
this.onResetVideo = function() {
	//from http://wiki.nesdev.com/w/index.php/PPU_power_up_state
	//0x2000
	this.executeNMIonVBlank = false;
	this.spriteHeight = 8;
	this.patternTableAddressBackground = 0x0000;
	this.patternTableAddress8x8Sprites = 0x0000;
	this.vramIncrementSize = 1;
	//0x2005 & 0x2000
	this.vramAddrReloadRegister = 0x0000;
	this.horizontalScrollBits = 0;
	//0x2001
	this.colorEmphasis = 0;
	this.spriteVisibility = false;
	this.backgroundVisibility = false;
	this.spriteClipping = true;
	this.backgroundClipping = true;
	this.paletteMask = 0x3f;
	//0x2005/0x2006
	this.vramAddrRegisterWritten = false;
	this.scrollRegisterWritten = false;
	//0x2007
	this.vramBuffer = 0;
};

this.spriteEval = function() {
	/**
	 * @type {Uint8Array}
	 * @const
	 */
	var spRam = this.spRam;
	/**
	 * @type {number}
	 * @const
	 */
	var y = this.nowY-1;
	/** @type {number} */
	var _spriteHitCnt = 0;
	this.lostSprites = false;
	/**
	 * @type {number}
	 * @const
	 */
	var _sprightHeight = this.spriteHeight;
	/**
	 * @type {boolean}
	 * @const
	 */	
	var bigSprite = _sprightHeight === 16;
	/**
	 * @type {object[]}
	 * @const
	 */
	var spriteTable = this.spriteTable;
	/**
	 * @type {number}
	 * @const
	 */
	var spriteTileAddrBase = this.patternTableAddress8x8Sprites;
	for(var i=0;i<256;i+=4){
		/** @type {number} */
		var spY = spRam[i]+1;
		/** @type {number} */
		var spYend = spY+_sprightHeight;
		/** @type {boolean} */
		var hit = false;
		if(spY <= y && y < spYend){//Hit!
			if(_spriteHitCnt < <%= Video::DefaultSpriteCnt %>){
				hit = true;
				/** type {object} */
				var slot = spriteTable[_spriteHitCnt];
				slot.idx = i>>2;
				slot.y = spY;
				slot.x = spRam[i+3];
				if(bigSprite){
					//8x16
					/**
					 * @type {number}
					 * @const
					 */
					var val = spRam[i+1];
					slot.tileAddr = (val & 1) << 12 | (val & 0xfe) << 4;
				}else{
					//8x8
					slot.tileAddr = (spRam[i+1] << 4) | spriteTileAddrBase;
				}
				/**
				 * @type {number}
				 * @const
				 */
				var attr = spRam[i+2];
				slot.paletteNo = 4 | (attr & 3);
				slot.isForeground = (attr & (1<<5)) === 0;
				slot.flipHorizontal = (attr & (1<<6)) !== 0;
				slot.flipVertical = (attr & (1<<7)) !== 0;
				_spriteHitCnt++;
			}else{
				//本当はもっと複雑な仕様みたいなものの、省略。
				//http://wiki.nesdev.com/w/index.php/PPU_sprite_evaluation
				this.lostSprites = true;
				break;
			}
		}
	}
	//残りは無効化
	this.spriteHitCnt = _spriteHitCnt;
	for(var i=_spriteHitCnt;i< <%= Video::DefaultSpriteCnt %>;i++){
		spriteTable[i].y=255;
	}
};

this.buildBgLine = function(){
	if(!this.backgroundVisibility){
		return;
	}
	/**
	 * @type {number} uint8_t
	 * @const
	 */
	var buffOffset = (this.nowY-1) << <%= Video::ScreenWidthShift %>;
	/**
	 * @type {number} uint16_t
	 */
	var nameTableAddr = 0x2000 | (this.vramAddrRegister & 0xfff);
	/**
	 * @type {number} uint8_t
	 * @const
	 */
	var offY = (this.vramAddrRegister >> 12);
	/**
	 * @type {number} uint8_t
	 */
	var offX = this.horizontalScrollBits;

	/**
	 * @type {number} uint16_t
	 * @const
	 */
	var bgTileAddrBase = this.patternTableAddressBackground;

	for(var /* uint16_t */ renderX=0;;){
		/**
		 * @type {number} uint16_t
		 * @const
		 */
		var tileNo = this.readVram(nameTableAddr);
		/**
		 * @type {number} uint16_t
		 * @const
		 */
		var tileYofScreen = (nameTableAddr & 0x03e0) >> 5;
		/**
		 * @type {number} uint8_t
		 * @const
		 */
		var palNo =
				(
					this.readVram((nameTableAddr & 0x2f00) | 0x3c0 | ((tileYofScreen & 0x1C) << 1) | ((nameTableAddr >> 2) & 7))
								>> (((tileYofScreen & 2) << 1) | (nameTableAddr & 2))
				) & 0x3;
		//タイルのサーフェイスデータを取得
		/**
		 * @type {number} uint16_t
		 * @const
		 */
		var off = bgTileAddrBase | (tileNo << 4) | offY;
		/**
		 * @type {number} uint8_t
		 * @const
		 */
		var firstPlane = this.readVram(off);
		/**
		 * @type {number} uint8_t
		 * @const
		 */
		var secondPlane = this.readVram(off+8);
		/**
		 * @type {number} uint8_t
		 * @const
		 */
		var paletteOffset = palNo << 2; /* *4 */
		//書く！
		for(var x=offX;x<8;x++){
			/**
			 * @type {number} uint8_t
			 * @const
			 */
			var color = ((firstPlane >> (7-x)) & 1) | (((secondPlane >> (7-x)) & 1)<<1);
			if(color != 0){
				this.screenBuffer8[buffOffset+renderX] = this.palette[paletteOffset+color] | <%= Video::BackgroundBit %>;
			}
			renderX++;
			if(renderX >= <%= Video::ScreenWidth %>){
				return;
			}
		}
		if((nameTableAddr & 0x001f) === 0x001f){
			nameTableAddr &= 0xFFE0;
			nameTableAddr ^= 0x400;
		}else{
			nameTableAddr++;
		}
		offX = 0;//次からは最初のピクセルから書ける。
	}
};

this.buildSpriteLine = function(){
	if(!this.spriteVisibility){
		return;
	}
	/**
	 * @type {number} uint8_t
	 * @const
	 */
	var y = this.nowY-1;
	/**
	 * @type {number} uint16_t
	 * @const
	 */
	var _spriteHeight = this.spriteHeight;
	/**
	 * @type {boolean} bool
	 * @const
	 */
	var searchSprite0Hit = !this.sprite0Hit;
	/**
	 * @type {number} uint16_t
	 * @const
	 */
	var _spriteHitCnt = this.spriteHitCnt;
	/**
	 * @type {number} uint8_t
	 * @const
	 */
	var buffOffset = (this.nowY-1) << <%= Video::ScreenWidthShift %>;
	//readVram(this.spriteTable[0].tileAddr); //FIXME: 読み込まないと、MMC4が動かない。
	for(var i=0;i<_spriteHitCnt;i++){
		/**
		 * @type {object} struct SpriteSlot&
		 * @const
		 */
		var slot = this.spriteTable[i];
		searchSprite0Hit &= (slot.idx === 0);
		/**
		 * @type {number} uint16_t
		 */
		var offY = 0;

		if(slot.flipVertical){
			offY = _spriteHeight+slot.y-y-1;
		}else{
			offY = y-slot.y;
		}
		/**
		 * @type {number} uint16_t
		 * @const
		 */
		var off = slot.tileAddr | ((offY & 0x8) << 1) | (offY&7);
		/**
		 * @type {number} uint8_t
		 * @const
		 */
		var firstPlane = this.readVram(off);
		/**
		 * @type {number} uint8_t
		 * @const
		 */
		var secondPlane = this.readVram(off+8);
		/**
		 * @type {number} uint16_t
		 * @const
		 */
		var _tmp_endX = screenWidth-slot.x;
		/**
		 * @type {number} uint16_t
		 * @const
		 */
		var endX = screenWidth < 8 ? screenWidth : 8;//std::min(screenWidth-slot.x, 8);
		/**
		 * @type {number} uint8_t
		 * @const
		 */
		var layerMask = slot.isForeground ? <%= Video::FrontSpriteBit %> : <%= Video::BackSpriteBit %>;
		if(slot.flipHorizontal){
			for(var x=0;x<endX;x++){
				/**
				 * @type {number} uint8_t
				 * @const
				 */
				var color = ((firstPlane >> x) & 1) | (((secondPlane >> x) & 1)<<1); //ここだけ違います
				/**
				 * @type {number} uint8_t
				 * @const
				 */
				var target = this.screenBuffer8[buffOffset + slot.x + x];
				/**
				 * @type {boolean} bool
				 * @const
				 */
				var isEmpty = (target & LayerBitMask) === <%= Video::EmptyBit %>;
				/**
				 * @type {boolean} bool
				 * @const
				 */
				var isBackgroundDrawn = (target & LayerBitMask) === <%= Video::BackgroundBit %>;
				/**
				 * @type {boolean} bool
				 * @const
				 */
				var isSpriteNotDrawn = (target & SpriteLayerBit) === 0;
				if(searchSprite0Hit && (color !== 0 && isBackgroundDrawn)){
					this.sprite0Hit = true;
					searchSprite0Hit = false;
				}
				if(color != 0 && ((!slot.isForeground && isEmpty) || (slot.isForeground &&  isSpriteNotDrawn))){
					this.screenBuffer8[buffOffset + slot.x + x] =
						this.palette[(slot.paletteNo<<2) + color] | layerMask;
					
				}
			}
		}else{
			/**
			 * @type {number} uint8_t
			 * @const
			 */
			var color = ((firstPlane >> (7-x)) & 1) | (((secondPlane >> (7-x)) & 1)<<1); //ここだけ違います
			/**
			 * @type {number} uint8_t
			 * @const
			 */
			var target = this.screenBuffer8[buffOffset + slot.x + x];
			/**
			 * @type {boolean} bool
			 * @const
			 */
			var isEmpty = (target & LayerBitMask) === <%= Video::EmptyBit %>;
			/**
			 * @type {boolean} bool
			 * @const
			 */
			var isBackgroundDrawn = (target & LayerBitMask) === <%= Video::BackgroundBit %>;
			/**
			 * @type {boolean} bool
			 * @const
			 */
			var isSpriteNotDrawn = (target & SpriteLayerBit) === 0;
			if(searchSprite0Hit && (color !== 0 && isBackgroundDrawn)){
				this.sprite0Hit = true;
				searchSprite0Hit = false;
			}
			if(color != 0 && ((!slot.isForeground && isEmpty) || (slot.isForeground &&  isSpriteNotDrawn))){
				this.screenBuffer8[buffOffset + slot.x + x] =
					this.palette[(slot.paletteNo<<2) + color] | layerMask;
				
			}
		}
	}
};

this.writeVideoReg = function(/* uint16_t */ addr, /* uint8_t */ value) {
	switch(addr & 0x07)
	{
		/* PPU Control and Status Registers */
		case 0x00: //2000h - PPU Control Register 1 (W)
			this.analyzePPUControlRegister1(value);
			break;
		case 0x01: //2001h - PPU Control Register 2 (W)
			this.analyzePPUControlRegister2(value);
			break;
		//case 0x02: //2002h - PPU Status Register (R)
		/* PPU SPR-RAM Access Registers */
		case 0x03: //2003h - SPR-RAM Address Register (W)
			this.analyzeSpriteAddrRegister(value);
			break;
		case 0x04: //2004h - SPR-RAM Data Register (Read/Write)
			this.writeSpriteDataRegister(value);
			break;
		/* PPU VRAM Access Registers */
		case 0x05: //PPU Background Scrolling Offset (W2)
			this.analyzePPUBackgroundScrollingOffset(value);
			break;
		case 0x06: //VRAM Address Register (W2)
			this.analyzeVramAddrRegister(value);
			break;
		case 0x07: //VRAM Read/Write Data Register (RW)
			this.writeVramDataRegister(value);
			break;
		default:
			throw cycloa.err.CoreException("Invalid addr: 0x"+addr.toString(16));
	}
};

this.readVideoReg = function(/* uint16_t */ addr)
{
	switch(addr & 0x07)
	{
		/* PPU Control and Status Registers */
		//case 0x00: //2000h - PPU Control Register 1 (W)
		//case 0x01: //2001h - PPU Control Register 2 (W)
		case 0x02: //2002h - PPU Status Register (R)
			return this.buildPPUStatusRegister();
		/* PPU SPR-RAM Access Registers */
		//case 0x03: //2003h - SPR-RAM Address Register (W)
		case 0x04: //2004h - SPR-RAM Data Register (Read/Write)
			return this.readSpriteDataRegister();
		/* PPU VRAM Access Registers */
		//case 0x05: //PPU Background Scrolling Offset (W2)
		//case 0x06: //VRAM Address Register (W2)
		case 0x07: //VRAM Read/Write Data Register (RW)
			return this.readVramDataRegister();
		default:
			return 0;
//			throw EmulatorException() << "Invalid addr: 0x" << std::hex << addr;
	}
};

this.writeVramDataRegister = function(/*uint8_t*/ value)
{
	this.writeVram(this.vramAddrRegister, value);
	this.vramAddrRegister = (this.vramAddrRegister + this.vramIncrementSize) & 0x3fff;
}

this.readSpriteDataRegister = function(){
	return this.spRam[this.spriteAddr];
};

this.readVramDataRegister = function()
{
	if((this.vramAddrRegister & 0x3f00) === 0x3f00){
		/**
		 * @const
		 * @type {number} uint8_t */
		var ret = readPalette(vramAddrRegister);
		this.vramBuffer = this.readVramExternal(this.vramAddrRegister); //ミラーされてるVRAMにも同時にアクセスしなければならない。
		this.vramAddrRegister = (this.vramAddrRegister + this.vramIncrementSize) & 0x3fff;
		return ret;
	}else{
		/**
		 * @const
		 * @type {number} uint8_t */
		var ret = this.vramBuffer;
		this.vramBuffer = this.readVramExternal(this.vramAddrRegister);
		this.vramAddrRegister = (this.vramAddrRegister + this.vramIncrementSize) & 0x3fff;
		return ret;
	}
};

this.buildPPUStatusRegister = function()
{
	//from http://nocash.emubase.de/everynes.htm#pictureprocessingunitppu
	this.vramAddrRegisterWritten = false;
	this.scrollRegisterWritten = false;
	//Reading resets the 1st/2nd-write flipflop (used by Port 2005h and 2006h).
	/**
	 * @const
	 * @type {number} uint8_t
	 */
	var result =
			((this.nowOnVBnank) ? 128 : 0)
		|   ((this.sprite0Hit) ? 64 : 0)
		|   ((this.lostSprites) ? 32 : 0);
	this.nowOnVBnank = false;
	return result;
};

this.analyzePPUControlRegister1 = function(/* uint8_t */ value)
{
	this.executeNMIonVBlank = ((value & 0x80) === 0x80) ? true : false;
	this.spriteHeight = ((value & 0x20) === 0x20) ? 16 : 8;
	this.patternTableAddressBackground = (value & 0x10) << 8;
	this.patternTableAddress8x8Sprites = (value & 0x8) << 9;
	this.vramIncrementSize = ((value & 0x4) === 0x4) ? 32 : 1;
	this.vramAddrReloadRegister = (this.vramAddrReloadRegister & 0x73ff) | ((value & 0x3) << 10);
};
this.analyzePPUControlRegister2 = function(/* uint8_t */ value)
{
	this.colorEmphasis = value >> 5; //FIXME: この扱い、どーする？
	this.spriteVisibility = ((value & 0x10) === 0x10) ? true : false;
	this.backgroundVisibility = ((value & 0x08) == 0x08) ? true : false;
	this.spriteClipping = ((value & 0x04) === 0x04) ? false : true;
	this.backgroundClipping = ((value & 0x2) === 0x02) ? false : true;
	this.paletteMask = ((value & 0x1) === 0x01) ? 0x30 : 0x3f;
};
this.analyzePPUBackgroundScrollingOffset = function(/* uint8_t */ value)
{
	if(this.scrollRegisterWritten){ //Y
		this.vramAddrReloadRegister = (this.vramAddrReloadRegister & 0x8C1F) | ((value & 0xf8) << 2) | ((value & 7) << 12);
	}else{ //X
		this.vramAddrReloadRegister = (this.vramAddrReloadRegister & 0xFFE0) | value >> 3;
		this.horizontalScrollBits = value & 7;
	}
	this.scrollRegisterWritten = !this.scrollRegisterWritten;
};
this.analyzeVramAddrRegister = function(/* uint8_t */ value)
{
	if(this.vramAddrRegisterWritten){
		this.vramAddrReloadRegister = (this.vramAddrReloadRegister & 0x7f00) | value;
		this.vramAddrRegister = this.vramAddrReloadRegister & 0x3fff;
	} else {
		this.vramAddrReloadRegister =(this.vramAddrReloadRegister & 0x00ff) | ((value & 0x7f) << 8);
	}
	this.vramAddrRegisterWritten = !this.vramAddrRegisterWritten;
};
this.analyzeSpriteAddrRegister = function(/* uint8_t */ value)
{
	this.spriteAddr = value;
};

this.readVramExternal = function(/* uint16_t */ addr)
{
	switch((addr & 0x2000) >> 12)
	{
		case 0: /* 0x0000 -> 0x1fff */
			return this.pattern[(addr >> 9) & 0xf][addr & 0x1ff];
		case 1:
			return this.vramMirroring[(addr >> 10) & 0x3][addr & 0x3ff];
	}
}
this.writeVramExternal = function(/* uint16_t */ addr, /* uint8_t */ value)
{
	switch((addr & 0x2000) >> 12)
	{
		case 0: /* 0x0000 -> 0x1fff */
			this.pattern[(addr >> 9) & 0xf][addr & 0x1ff] = value; //FIXME
			break;
		case 1:
			this.vramMirroring[(addr >> 10) & 0x3][addr & 0x3ff] = value;
			break;
	}
}

this.readVram = function(/* uint16_t */ addr) {
	if((addr & 0x3f00) == 0x3f00){ /* readPalette */
		if((addr & 0x3) == 0){
			return this.palette[<%= 8*4 %> + ((addr >> 2) & 3)];
		}else{
			return this.palette[(((addr>>2) & 7) << 2) + (addr & 3)];
		}
	}else{
		return this.readVramExternal(addr);
	}
};
this.writeVram = function(/* uint16_t */ addr, /* uint8_t */ value) {
	if((addr & 0x3f00) == 0x3f00){ /* writePalette */
		if((addr & 0x3) == 0){
			this.palette[<%= 8*4 %> + ((addr >> 2) & 3)] = value & 0x3f;
		}else{
			this.palette[(((addr>>2) & 7) << 2) + (addr & 3)] = value & 0x3f;
		}
	}else{
		this.writeVramExternal(addr, value);
	}
};

