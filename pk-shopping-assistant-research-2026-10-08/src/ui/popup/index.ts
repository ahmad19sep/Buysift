const statusElement = document.getElementById('preview-status');

async function initializePreview(): Promise<void> {
  if (!(statusElement instanceof HTMLParagraphElement)) {
    return;
  }

  try {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    statusElement.textContent = 'Preview ready.';
    statusElement.dataset.state = 'ready';
  } catch {
    statusElement.textContent =
      'Local storage setup failed. Close and reopen this preview to try again.';
    statusElement.dataset.state = 'error';
  } finally {
    statusElement.setAttribute('aria-busy', 'false');
  }
}

void initializePreview();
