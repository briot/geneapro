/**
 * Detect rendered font size
 * @description Detect actual rendered font size given size to detect
 * @author Ziling Zhao <zilingzhao@gmail.com>
 */
(function ($) {
$.detectFontSize = function (tSize, family, options) {
	var size = tSize || 1,
		actual,
		span = $("<span>&nbsp;</span>").css($.extend({
				'font-family': family || 'monospace',
				display: 'block',
				padding: '0px',
				margin: '0px',
				position: 'absolute',
				'z-index': '-100',
				'font-size': tSize + "px",
				left: '-999px'
			}, options));
	$("body").append(span);

	actual = span.innerHeight();
	span.remove();
	return actual;
};
}(jQuery));
