
// utils
function $(id) { return document.getElementById(id); }
function show(id) { $(id).style.display = 'block'; }
function hide(id) { $(id).style.display = 'none'; }


var dashboardID = "dashboard_container"
var canvasID = "map_canvas"

function doAction() {
    
    var opt = IMS_OPTIONS
    
    var dash = $(dashboardID)
    dash.style.top = 0
    dash.style.bottom = 0
    dash.style.left = 0
    dash.style.right = 0
    dash.style.border = '0px'

    var canvas = $(canvasID)
    canvas.style.zIndex = 9999
    canvas.style.height = opt.map_height
    canvas.style.width = opt.map_width
    
    window.dispatchEvent(new Event('resize'));
    
}

doAction()
