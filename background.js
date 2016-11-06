chrome.tabs.onUpdated.addListener(function(id, info, tab) {
    if(info.status === 'complete') {
        if (tab.url.toString().indexOf("ingress.com/intel") >= 0)
            chrome.pageAction.show(id);
    }
});  
