// This file is a part of the ProceduralUniverse
// Copyright (C) 2013-2014  Mifan Bang <http://debug.tw>


define(function () {  // RequireJS API

// interface
return {
	'DOMAnimator' : DOMAnimator
};


function DOMAnimator(id, param) {
	var elem = document.getElementById(id);
	var attrName = param.attribute;
	var currPos = param.currPos;
	var endPos = currPos;

	var FRAME_TIME = 17;  // unit: ms
	var ANIM_SPEED = 0.2;

	setInterval(
		function () {
			if (currPos != endPos) {
				var displace = Math.max(Math.floor(Math.abs(endPos - currPos) * ANIM_SPEED), 1);
				currPos += (endPos > currPos ? displace : -displace);
				elem.style[attrName] = currPos + "px";
			}
		},
		FRAME_TIME
	);

	return ({
		setGoal: function (goal) {
			endPos = goal;
		}
	});
}

} /* function */ );  // end of define()
