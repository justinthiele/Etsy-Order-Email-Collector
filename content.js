let isCollecting = false;
let emailsCollected = [];
let currentPage = 1;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "start") {
    isCollecting = true;
    emailsCollected = [];
    currentPage = 1;
    collectEmails();
    sendResponse({status: "started"});
  } else if (request.action === "stop") {
    isCollecting = false;
    sendEmailsToBackground();
    sendResponse({status: "stopped"});
  }
  return true;
});

function collectEmails() {
  if (!isCollecting) return;

  showLoading("Processing current page...");

  setTimeout(() => {
    const emailElements = document.querySelectorAll('.dropdown-body ul li:last-child a');
    emailElements.forEach(element => {
      const email = element.textContent.trim();
      if (email && email.includes('@')) {
        emailsCollected.push(email);
      }
    });

    hideLoading();
    updateStatus(`Collected ${emailsCollected.length} emails from ${currentPage} page(s)`);

    const nextPageButton = document.querySelector('.btn-group button[title="Next page"]');
    if (nextPageButton && !nextPageButton.disabled) {
      promptNextPage();
    } else {
      isCollecting = false;
      sendEmailsToBackground();
    }
  }, 5000);
}

function promptNextPage() {
  chrome.runtime.sendMessage({
    action: "promptNextPage",
    message: `Collected ${emailsCollected.length} emails from ${currentPage} page(s).`,
    currentPage: currentPage,
    totalEmails: emailsCollected.length
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error in promptNextPage:', chrome.runtime.lastError);
      isCollecting = false;
      sendEmailsToBackground();
    } else if (response && response.proceed) {
      const nextPageButton = document.querySelector('.btn-group button[title="Next page"]');
      if (nextPageButton) {
        nextPageButton.click();
        currentPage++;
        showLoading("Loading next page...");
        setTimeout(collectEmails, 5000);
      }
    } else {
      isCollecting = false;
      sendEmailsToBackground();
    }
  });
}

function sendEmailsToBackground() {
  chrome.runtime.sendMessage({
    action: "downloadCSV",
    emails: emailsCollected
  });
}

function updateStatus(message) {
  chrome.runtime.sendMessage({
    action: "updateStatus",
    status: message
  });
}

function showLoading(message) {
  chrome.runtime.sendMessage({
    action: "showLoading",
    message: message
  });
}

function hideLoading() {
  chrome.runtime.sendMessage({
    action: "hideLoading"
  });
}