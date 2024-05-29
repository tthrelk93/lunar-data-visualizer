/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/imageLoaderWorker.js":
/*!**********************************!*\
  !*** ./src/imageLoaderWorker.js ***!
  \**********************************/
/***/ (() => {

eval("var worker = new Worker('imageLoaderWorker.js');\nself.onmessage = function (event) {\n  var imagePaths = event.data;\n  imagePaths.forEach(function (imagePath) {\n    var image = new Image();\n    image.onload = function () {\n      var canvas = new OffscreenCanvas(image.width, image.height);\n      var context = canvas.getContext('2d');\n      context.drawImage(image, 0, 0);\n      var dataUrl = canvas.toDataURL();\n      self.postMessage({\n        path: imagePath,\n        width: image.width,\n        height: image.height,\n        dataUrl: dataUrl\n      });\n    };\n    image.src = imagePath;\n  });\n};\n\n//# sourceURL=webpack://lidar-visualization/./src/imageLoaderWorker.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/imageLoaderWorker.js"]();
/******/ 	
/******/ })()
;