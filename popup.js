document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  const continueButton = document.getElementById('continueButton');
  const finishButton = document.getElementById('finishButton');
  const navigationButtons = document.getElementById('navigationButtons');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const loadingText = document.getElementById('loadingText');
  const statusDiv = document.getElementById('status');
  
  startButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0].url.includes('https://www.etsy.com/your/orders/sold')) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "start"}, function(response) {
          if (chrome.runtime.lastError) {
            console.error('Error starting collection:', chrome.runtime.lastError.message);
            updateStatus("Error: Please refresh the Etsy Sold Orders page and try again.");
          } else if (response && response.status === "started") {
            startButton.style.display = 'none';
            stopButton.style.display = 'block';
            showLoading("Processing current page...");
            updateStatus("Collection started...");
          }
        });
      } else {
        updateStatus("Please navigate to the Etsy Sold Orders page before starting.");
      }
    });
  });

  stopButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "stop"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          updateStatus("Error: Please refresh the Etsy Sold Orders page and try again.");
        } else if (response && response.status === "stopped") {
          resetUI();
          updateStatus("Collection stopped.");
        }
      });
    });
  });

  continueButton.addEventListener('click', function() {
    sendResponse({proceed: true});
    navigationButtons.style.display = 'none';
    showLoading("Loading next page...");
  });

  finishButton.addEventListener('click', function() {
    sendResponse({proceed: false});
    resetUI();
    updateStatus("Finishing collection. Preparing CSV download...");
  });

  function updateStatus(message) {
    statusDiv.textContent = message;
  }

  function resetUI() {
    startButton.style.display = 'block';
    stopButton.style.display = 'none';
    navigationButtons.style.display = 'none';
    hideLoading();
  }

  function showLoading(message) {
    loadingText.textContent = message;
    loadingSpinner.style.display = 'block';
    navigationButtons.style.display = 'none';
  }

  function hideLoading() {
    loadingSpinner.style.display = 'none';
  }

  let pendingResponse = null;

  // Listen for updates from content script and background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "updateStatus") {
      updateStatus(request.status);
    } else if (request.action === "promptNextPage") {
      hideLoading();
      stopButton.style.display = 'none';
      navigationButtons.style.display = 'block';
      updateStatus(`Collected ${request.totalEmails} emails from ${request.currentPage} page(s).`);
      pendingResponse = sendResponse;
      return true; // Indicates that the response is sent asynchronously
    } else if (request.action === "showLoading") {
      showLoading(request.message || "Processing...");
    } else if (request.action === "hideLoading") {
      hideLoading();
    }
  });

  function sendResponse(response) {
    if (pendingResponse) {
      pendingResponse(response);
      pendingResponse = null;
    }
  }
});
