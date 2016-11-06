
// utils

function $(id) {
    return document.getElementById(id)
}

function show(id) { 
    console.debug("qml: show " + id)
    //$(id).style.display = 'block'; 
}
function hide(id) { 
    console.debug("qml: hide " + id)
    //$(id).style.display = 'none'; 
}

document.addEventListener('DOMContentLoaded', function () {
    
    var conf = {}
    
    $('height_select').value = conf.height || 8000
    $('width_select').value = conf.width || 8000
    $('format_select').value = conf.format || 'jpeg'
    $('quality_select').value = conf.quality || 70
    
    $('prepare_btn').addEventListener('click', prepare);
    $('screen_btn').addEventListener('click', screen);
});

function prepare() {
    
    var map_height = Number($('height_select').value)
    var map_width = Number($('width_select').value)
    
    if (map_height === 0 || map_width === 0)
        return
    
    var optCode = "var IMS_OPTIONS = {\n" +
            "map_height: '" + map_height + "px',\n" +
            "map_width: '" + map_width + "px'\n" +
            "}\n"
    
    //console.debug("opt: " + optCode)
    
    chrome.tabs.executeScript(null, {code: optCode });
    chrome.tabs.executeScript(null, {file: "page_prepare.js"});
}

// Screen -----------------------------------
// Copyright (c) 2012,2013 Peter Coles - http://mrcoles.com/ - All rights reserved.
// Use of this source code is governed by the MIT License found in LICENSE

var image_format = 'jpeg'
var image_quality = 70

function screen() {
    
    image_format = $('format_select').value
    image_quality = Number($('quality_select').value)
    
    chrome.tabs.getSelected(null, function(tab) {
        
        var loaded = false;
        
        chrome.tabs.executeScript(tab.id, {file: 'page_screen.js'}, function() {
            loaded = true;
            show('loading');
            sendScrollMessage(tab);
        });
        
        window.setTimeout(function() {
            if (!loaded) {
                show('uh-oh');
            }
        }, 1000);
    });
}


//
// Events
//
var screenshot, contentURL = '';

function sendScrollMessage(tab) {

    contentURL = tab.url;
    screenshot = {};
    chrome.tabs.sendRequest(tab.id, {msg: 'scrollPage'}, function() {
        // We're done taking snapshots of all parts of the window. Display
        // the resulting full screenshot image in a new browser tab.
        openPage();
    });
}

chrome.extension.onRequest.addListener(function(request, sender, callback) {
    if (request.msg === 'capturePage') {
        capturePage(request, sender, callback);
    } else {
        console.error('Unknown message received from content script: ' + request.msg);
    }
});


function capturePage(data, sender, callback) {

    var canvas;
    
    //$('bar').style.width = parseInt(data.complete * 100, 10) + '%';
    
    // Get window.devicePixelRatio from the page, not the popup
    var scale = data.devicePixelRatio && data.devicePixelRatio !== 1 ?
                1 / data.devicePixelRatio : 1;
    
    if (!screenshot.canvas) {
        canvas = document.createElement('canvas');
        canvas.width = data.totalWidth;
        canvas.height = data.totalHeight;
        screenshot.canvas = canvas;
        screenshot.ctx = canvas.getContext('2d');
        
        // Scale to account for device pixel ratios greater than one. (On a
        // MacBook Pro with Retina display, window.devicePixelRatio = 2.)
        if (scale !== 1) {
            // TODO - create option to not scale? It's not clear if it's
            // better to scale down the image or to just draw it twice
            // as large.
            screenshot.ctx.scale(scale, scale);
        }
    }
    
    // if the canvas is scaled, then x- and y-positions have to make
    // up for it in the opposite direction
    if (scale !== 1) {
        data.x = data.x / scale;
        data.y = data.y / scale;
    }
    
    chrome.tabs.captureVisibleTab(
                null, {format: image_format, quality: image_quality}, function(dataURI) {
                    if (dataURI) {
                        var image = new Image();
                        image.onload = function() {
                            screenshot.ctx.drawImage(image, data.x, data.y);
                            callback(true);
                        };
                        image.src = dataURI;
                    }
                });
}

function openPage() {
    console.debug("qml: openPage ")
    // standard dataURI can be too big, let's blob instead
    // http://code.google.com/p/chromium/issues/detail?id=69227#c27
    
    var dataURI = screenshot.canvas.toDataURL('image/' + image_format, image_quality/100);
    
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs
    var byteString = atob(dataURI.split(',')[1]);
    
    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    
    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    // create a blob for writing to a file
    var blob = new Blob([ab], {type: mimeString});
    
    var date = new Date()
    var datestr = date.getFullYear() + ('0' + (date.getMonth() + 1)).slice(-2) + ('0' + date.getDate()).slice(-2)
    var hoursstr = ('0' + date.getHours()).slice(-2) + ('0' + date.getMinutes()).slice(-2)
    var name = datestr + '_' + hoursstr + '_ingressmap.' + image_format;

    function onwriteend() {
        // open the file that now contains the blob
        window.open('filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name);
    }
    
    function errorHandler() {
        show('uh-oh');
    }

    //    // create a blob for writing to a file
    window.webkitRequestFileSystem(TEMPORARY, 1024*1024, function(fs){
        fs.root.getFile(name, {create:true}, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = onwriteend;
                fileWriter.write(blob);
            }, errorHandler);
        }, errorHandler);
    }, errorHandler);
}

