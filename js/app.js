// This file is a part of the ProceduralUniverse
// Copyright (C) 2013-2014  Mifan Bang <http://debug.tw>


requirejs(["ShaderArchive", "Renderers", "DOMUtils"], function (ShaderArchive, Renderers, DOMUtils) {

LocalizeTitle();
DetectWebGLSupport();

var planets = [
	new PlanetDesc("fBm",		"Base pattern to build all other things",		"vs_planet", "surface/fs_fbm",	 true,  false),
	new PlanetDesc("SUN",		"The best nuclear energy ",						"vs_planet", "surface/fs_sun",	 true,  false),
	new PlanetDesc("MERCURY",	"Can't really distinguish it from our Moon",	"vs_planet", "surface/fs_mercury", false, false),
	new PlanetDesc("VENUS",		"Hot as hell",									"vs_planet", "surface/fs_venus",	 false, true, new THREE.Vector3(0.8, 0.7, 0.4),		0.27),
	new PlanetDesc("EARTH",		"Your mom's home",								"vs_planet", "surface/fs_earth",	 false, true, new THREE.Vector3(0.35, 0.6, 0.85),	0.3),
	new PlanetDesc("MARS",		"We're almost there",							"vs_planet", "surface/fs_mars",	 false, true, new THREE.Vector3(0.76, 0.52, 0.35),	0.23),
	new PlanetDesc("JUPITER",	"The reason Galileo pissed off the Church",		"vs_planet", "surface/fs_jupiter", false, true, new THREE.Vector3(0.7, 0.45, 0.3),	0.2),
	new PlanetDesc("SATURN",	"SEGA<sup style='font-size: 13px;'>TM</sup>",	"vs_planet", "surface/fs_saturn",	 false, true, new THREE.Vector3(0.65, 0.55, 0.3),	0.2),
	new PlanetDesc("URANUS",	"Your anus",									"vs_planet", "surface/fs_uranus",	 false, true, new THREE.Vector3(0.23, 0.55, 0.79),	0.21),
	new PlanetDesc("NEPTUNE",	"Mathematical triumph",							"vs_planet", "surface/fs_neptune", false, true, new THREE.Vector3(0.3, 0.35, 0.9),	0.21),
];

var camera;
var renderCanvas;
var planetRenderer;
var spaceRenderer;

var loader;
var controls;
var statsMeter;

// DOM objects
var loadingTip;
var nameTag;
var controlTip;
var controlTipAnimator;


function LocalizeTitle() {
	var language = window.navigator.userLanguage || window.navigator.language;
	if (language.toUpperCase().search("ZH") >= 0)
		document.title = "燃燒吧，我的小宇宙！";
}

function DetectWebGLSupport() {
	if (!Detector.webgl)
		Detector.addGetWebGLMessage();
	else {
		function onPageLoaded() {
			init();

			var checkShaderLoadingStatus = setInterval(function () {
				var progress = loader.stepLoading({
					target: renderCanvas,
					camera: camera
				});
				loadingTip.innerHTML = "Now Loading....<br>" + (progress * 100).toFixed(0) + "%";
			
				if (Math.abs(1 - progress) <= 1e-5) {
					nameTag.style.visibility = "visible";
					controlTip.style.visibility = "visible";
					document.getElementById("copyright").style.visibility = "visible";
			
					animate();
					setTimeout(function () { loadingTip.style.visibility = "hidden"; }, 1000);

					clearInterval(checkShaderLoadingStatus);
				}
			}, 17);  // 1 second / 60 frame ~= 17 ms/frame
		}

		var checkPageLoadingStatus = setInterval(function () {
			if (/loaded|complete/.test(document.readyState)) {
				onPageLoaded();
				clearInterval(checkPageLoadingStatus);
			}
		}, 17);
	}
}

function PlanetDesc(name, subtitle, vertShaderName, fragShaderName, isEmissive, hasAtmosphere, atmosphereColor, atmosphereThickness) {
	var name = (typeof name != "undefined" ? name : "fBm");
	var subtitle = (typeof subtitle != "undefined" ? subtitle : "A strange thing.");
	var vertShaderName = (typeof vertShaderName != "undefined" ? vertShaderName : "vs_planet");
	var fragShaderName = (typeof fragShaderName != "undefined" ? fragShaderName : "surface/fs_fbm");
	var isEmissive = (typeof isEmissive != "undefined" ? isEmissive : false);
	var hasAtmosphere = (typeof hasAtmosphere != "undefined" ? hasAtmosphere : false);
	var atmosphereColor = (typeof atmosphereColor != "undefined" ? atmosphereColor : new THREE.Vector3(1, 1, 1));
	var atmosphereThickness = (typeof atmosphereThickness != "undefined" ? atmosphereThickness : 0.5);

	return ({
		name: name,
		subtitle: subtitle,
		vertShaderName: vertShaderName,
		fragShaderName: fragShaderName,
		isEmissive: isEmissive,
		hasAtmosphere: hasAtmosphere,
		atmosphereColor: atmosphereColor,
		atmosphereThickness: atmosphereThickness
	});
}

function Loader() {
	var loadingList = new Array();

	return ({
		addLoadingObj: function (obj) {
			if (typeof obj.stepLoading != "undefined")
				loadingList.push(obj);
		},

		stepLoading: function (param) {
			if (loadingList.length == 0)
				return 1;  // need not load

			var percentage = 0;
			for (var i = 0; i < loadingList.length; i++)
				percentage += (1 / loadingList.length) * loadingList[i].stepLoading(param);
			return percentage;
		}
	});
}

function init() {
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.z = 100;

	renderCanvas = new THREE.WebGLRenderer({
		antialias: true
	});
	renderCanvas.autoClear = false;
	renderCanvas.setSize(window.innerWidth, window.innerHeight);
	renderCanvas.domElement.style.zIndex = -100;
	document.body.appendChild(renderCanvas.domElement);

	planetRenderer = new Renderers.PlanetRenderer({
		planets: planets
	});
	spaceRenderer = new Renderers.SpaceRenderer();
	loader = new Loader();
	loader.addLoadingObj(planetRenderer);

	controls = new THREE.TrackballControls(camera, renderCanvas.domElement);
	controls.minDistance = 45;
	controls.maxDistance = 550;

	statsMeter = new Stats();
	statsMeter.setMode(0);  // 0:fps, 1:ms
	statsMeter.domElement.style.position = "absolute";
	statsMeter.domElement.style.left = "0px";
	statsMeter.domElement.style.top = "0px";
	statsMeter.domElement.style.visibility = "hidden";
	document.body.appendChild(statsMeter.domElement);

	loadingTip = document.getElementById("loadingTip");
	nameTag = document.getElementById("nameTag");
	controlTip = document.getElementById("controlTip");
	controlTipAnimator = new DOMUtils.DOMAnimator("controlTip", {
		attribute: "marginLeft",
		currPos: -450
	});
	controlTip.onmouseover = function () { controlTipAnimator.setGoal(0); };
	controlTip.onmouseout = function () { controlTipAnimator.setGoal(-450); };

	document.body.onkeydown = function (keyEvent) {
		var KEY_LEFT = 37;
		var KEY_UP = 38;
		var KEY_RIGHT = 39;
		var KEY_DOWN = 40;
		var KEY_Z = 90;
		var KEY_L = 76;

		if (keyEvent.keyCode == KEY_LEFT)
			planetRenderer.rotateBackward();
		else if (keyEvent.keyCode == KEY_RIGHT)
			planetRenderer.rotateForward();
		else if (keyEvent.keyCode >= 0x30 && keyEvent.keyCode <= 0x39)  // ASCII '0'~'9'
			planetRenderer.setCurrentPlanet(keyEvent.keyCode - 0x30)
		else if (keyEvent.keyCode == KEY_Z) {
			statsMeter.domElement.style.visibility = (statsMeter.domElement.style.visibility == "hidden" ? "visible" : "hidden");
			return false;
		}
		else if (keyEvent.keyCode == KEY_L) {
			planetRenderer.toggleAutoSelfRotation();
			return false;
		}
		else {
			console.log("unknown key: " + keyEvent.keyCode);
			return true;
		}

		onRotatePlanet();
		return false;
	}

	window.onresize = onResize;
	onResize();
	onRotatePlanet();
}

function onResize(resizeEvent) {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	controls.handleResize();

	renderCanvas.setSize(window.innerWidth, window.innerHeight);

	var scaleFactorY = window.innerHeight / 1075;
	var transformCSS = "scale(" + scaleFactorY + ", " + scaleFactorY + ")";
	nameTag.style["transform"] = transformCSS;
	nameTag.style["-ms-transform"] = transformCSS;
	nameTag.style["-moz-transform"] = transformCSS;
	nameTag.style["-o-transform"] = transformCSS;
	nameTag.style["-webkit-transform"] = transformCSS;
	nameTag.style.left = Math.floor(window.innerWidth * 0.5 + 192 * scaleFactorY) + "px";
}

function onRotatePlanet() {
	var desc = planets[planetRenderer.getCurrentPlanet()];
	document.getElementById("nameTag_name").innerHTML = desc.name;
	document.getElementById("nameTag_subtitle").innerHTML = desc.subtitle;
}

function animate() {
	renderCanvas.clear();
	var param = {
		target: renderCanvas,
		camera: camera
	};
	spaceRenderer.renderNextFrameTo(param);
	planetRenderer.renderNextFrameTo(param);

	controls.update();
	statsMeter.update();

	requestAnimationFrame(animate);
}

} /* function */ );  // end of define()
