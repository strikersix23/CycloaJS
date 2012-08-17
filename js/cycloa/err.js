"use strict";
/**
 * 例外のベースクラスです
 * @param {String} name 例外クラス名
 * @param {String} message メッセージ
 * @const
 * @constructor
 */
cycloa.err.Exception = function (name, message) {
	/**
	 * 例外のメッセージのインスタンス
	 * @type {String}
	 * @const
	 * @private
	 */
	/**
	 * @const
	 * @type {String}
	 */
	this.name = name;
	this.message = "["+name.toString()+"] "+message;
};
cycloa.err.Exception.prototype.toString = function(){
	return this.message;
};
/**
 * エミュレータのコアで発生した例外です
 * @param {String} message
 * @constructor
 * @extends cycloa.err.Exception
 */
cycloa.err.CoreException = function (message) {
	cycloa.err.Exception.call(this, "CoreException", message);
};
cycloa.err.CoreException.prototype = {
	__proto__ : cycloa.err.Exception.prototype
};
/**
 * 実装するべきメソッドを実装してない例外です
 * @param {String} message
 * @constructor
 * @extends cycloa.err.Exception
 */
cycloa.err.NotImplementedException = function (message) {
	cycloa.err.Exception.call(this, "NotImplementedException", message);
};
cycloa.err.NotImplementedException.prototype = {
	__proto__: cycloa.err.Exception.prototype
};
/**
 * サポートしてない事を示す例外です
 * @param {String} message
 * @constructor
 */
cycloa.err.NotSupportedException = function ( message ) {
	cycloa.err.Exception.call(this, "NotSupportedException", message);
};
cycloa.err.NotSupportedException.prototype = {
	__proto__: cycloa.err.Exception.prototype
};


