import { ChromeStorageArea, LocalNotebook } from '../../storage/index.js';
import { PopupApp } from './app.js';

async function startPopup(): Promise<void> {
  try {
    await new PopupApp(new LocalNotebook(new ChromeStorageArea())).start();
  } catch {
    const message = document.getElementById('recovery-message');
    if (message !== null) message.textContent = 'The local notebook could not start. Close and reopen the popup to try again.';
    for (const id of ['loading-view', 'onboarding-view', 'declined-view', 'notebook-shell']) {
      const element = document.getElementById(id);
      if (element !== null) element.hidden = true;
    }
    const recovery = document.getElementById('recovery-view');
    if (recovery !== null) recovery.hidden = false;
  }
}

void startPopup();
