import { MAX_OBSERVATIONS, MAX_SAVED_OFFERS, STORAGE_HARD_LIMIT_BYTES } from '../../domain/index.js';
import { LocalNotebook, StorageError, serializeNotebookExport } from '../../storage/index.js';
import type { InitializationResult, OfferDraft, StorageCapacity } from '../../storage/index.js';
import {
  OFFER_FORM_FIELD_NAMES,
  buildManualOffer,
  emptyOfferForm,
  formFieldsFromConfirmed,
  normalizeOfferFormFields,
  previewPriceText,
} from './form.js';
import type { FormIssue, OfferFormFieldName, OfferFormFields } from './form.js';
import { updateComparisonSelection } from './selection.js';
import {
  attentionSummary,
  componentsText,
  comparisonView,
  formatBytes,
  formatRecordedAt,
  historyView,
  identityText,
  isSavedOffer,
  latestObservation,
  priceConclusion,
  recordStateText,
  termsText,
} from './view-model.js';
import type { SavedOffer } from './view-model.js';
import { formatPkr } from './form.js';

type Route = 'saved' | 'offer-form' | 'offer-detail' | 'compare' | 'sample' | 'data';
type FormMode = 'new' | 'edit' | 'observe';

interface FormSession {
  mode: FormMode;
  offerId: string;
  existing: SavedOffer | null;
  operationId: string;
  saving: boolean;
}

const DRAFT_DELAY_MS = 500;

function byId<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Popup element #${id} is missing.`);
  return element;
}

function template(id: string): HTMLTemplateElement {
  return byId(id, HTMLTemplateElement);
}

function setText(root: ParentNode, selector: string, value: string): void {
  const element = root.querySelector(selector);
  if (element !== null) element.textContent = value;
}

function storageErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof StorageError)) return fallback;
  switch (error.code) {
    case 'offer_limit':
      return 'Your 25 saved offers are full. Export and delete an offer first.';
    case 'observation_limit':
      return 'Your 500 saved observations are full. Export or delete entries before recording another.';
    case 'storage_limit':
    case 'control_reserve':
      return 'Your notebook is full. Export or delete entries before adding more.';
    case 'recovery_read_only':
      return 'Your notebook is in recovery mode. New changes are unavailable.';
    case 'consent_required':
      return 'Start the local notebook before saving offer details.';
    default:
      return fallback;
  }
}

export class PopupApp {
  private readonly notebook: LocalNotebook;
  private readonly uuid: () => string;
  private offers: SavedOffer[] = [];
  private drafts: Array<{ offerId: string; draft: OfferDraft; confirmed: boolean }> = [];
  private capacity: StorageCapacity | null = null;
  private readOnly = false;
  private selected: ReadonlySet<string> = new Set();
  private currentOfferId: string | null = null;
  private form: FormSession | null = null;
  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private draftGeneration = 0;

  private readonly app = byId('app', HTMLElement);
  private readonly status = byId('app-status', HTMLParagraphElement);
  private readonly shell = byId('notebook-shell', HTMLDivElement);
  private readonly offerForm = byId('offer-form', HTMLFormElement);

  constructor(notebook: LocalNotebook, uuid: () => string = () => crypto.randomUUID()) {
    this.notebook = notebook;
    this.uuid = uuid;
  }

  async start(): Promise<void> {
    this.bindEvents();
    let initialization: InitializationResult;
    try {
      initialization = await this.notebook.initialize();
    } catch {
      this.showRecovery('Local storage could not be opened. Nothing was removed.');
      return;
    }
    if (initialization.state !== 'ready') {
      this.readOnly = true;
      this.showRecovery(this.describeIssues(initialization));
      return;
    }
    await this.openForCurrentConsent();
  }

  private async openForCurrentConsent(): Promise<void> {
    try {
      const consent = await this.notebook.getConsent();
      if (consent === null) {
        this.showTopLevel('onboarding-view');
        return;
      }
      await this.refresh();
      this.route('saved');
    } catch {
      this.showRecovery('Local storage could not be read. Nothing was removed.');
    }
  }

  private describeIssues(initialization: InitializationResult): string {
    const count = initialization.issues.length;
    if (count === 0) return 'A saved record could not be safely read. It was not silently removed.';
    const kinds = new Set(initialization.issues.map(issue => issue.kind));
    const parts: string[] = [];
    if (kinds.has('unsupported_schema')) parts.push('a record was saved by a newer version');
    if (kinds.has('migration_failed')) parts.push('a record could not be upgraded');
    if (kinds.has('invalid_record')) parts.push('a record could not be safely read');
    if (kinds.has('control_failure')) parts.push('local storage could not finish a pending step');
    return `${count} storage issue${count === 1 ? '' : 's'}: ${parts.join('; ')}. Nothing was silently removed. Export a recovery copy or manage local data.`;
  }

  // ---------- views and routing ----------

  private showTopLevel(id: 'loading-view' | 'onboarding-view' | 'declined-view' | 'recovery-view' | 'notebook-shell'): void {
    for (const view of ['loading-view', 'onboarding-view', 'declined-view', 'recovery-view', 'notebook-shell']) {
      const element = document.getElementById(view);
      if (element !== null) element.hidden = view !== id;
    }
    this.app.dataset.appState = id.replace('-view', '');
  }

  private showRecovery(message: string): void {
    byId('recovery-message', HTMLParagraphElement).textContent = message;
    this.showTopLevel('recovery-view');
  }

  private route(route: Route): void {
    if (route !== 'offer-form') this.leaveForm();
    this.showTopLevel('notebook-shell');
    byId('read-only-notice', HTMLParagraphElement).hidden = !this.readOnly;
    for (const view of this.shell.querySelectorAll<HTMLElement>('section.view[data-view]')) {
      view.hidden = view.dataset.view !== route;
    }
    const navRoute = route === 'offer-form' || route === 'offer-detail' || route === 'sample' ? 'saved' : route;
    for (const button of this.shell.querySelectorAll<HTMLButtonElement>('.nav-button')) {
      if (button.dataset.route === navRoute) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    if (route === 'saved') this.renderSaved();
    if (route === 'compare') this.renderComparisonPicker();
    if (route === 'data') this.renderData();
    this.app.dataset.appState = route;
    const heading = this.shell.querySelector<HTMLElement>(`section.view[data-view="${route}"] h2`);
    if (heading !== null) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: false });
    }
  }

  private announce(message: string): void {
    this.status.textContent = '';
    setTimeout(() => {
      this.status.textContent = message;
    }, 30);
  }

  private async refresh(): Promise<void> {
    const envelopes = await this.notebook.listOffers();
    this.offers = envelopes.filter(isSavedOffer).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    this.drafts = await this.notebook.listDrafts();
    this.capacity = await this.notebook.getCapacity();
    const ids = new Set(this.offers.map(offer => offer.offerId));
    this.selected = new Set([...this.selected].filter(id => ids.has(id)));
    this.renderNavigationCount();
  }

  private findOffer(offerId: string | null): SavedOffer | undefined {
    return this.offers.find(offer => offer.offerId === offerId);
  }

  // ---------- events ----------

  private bindEvents(): void {
    byId('start-button', HTMLButtonElement).addEventListener('click', () => void this.acceptNotice());
    byId('cancel-onboarding-button', HTMLButtonElement).addEventListener('click', () => void this.declineNotice());
    byId('return-onboarding-button', HTMLButtonElement).addEventListener('click', () => this.showTopLevel('onboarding-view'));

    for (const button of this.shell.querySelectorAll<HTMLButtonElement>('.nav-button')) {
      button.addEventListener('click', () => this.route(button.dataset.route as Route));
    }
    byId('add-offer-button', HTMLButtonElement).addEventListener('click', () => this.openForm('new', null));
    byId('open-sample-button', HTMLButtonElement).addEventListener('click', () => this.route('sample'));
    byId('sample-back-button', HTMLButtonElement).addEventListener('click', () => this.route('saved'));

    const list = byId('offer-list', HTMLUListElement);
    list.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action="open-offer"]') : null;
      const offerId = target?.closest<HTMLElement>('[data-offer-id]')?.dataset.offerId;
      if (offerId !== undefined) this.openDetail(offerId);
    });
    list.addEventListener('change', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.dataset.action !== 'toggle-comparison') return;
      const offerId = input.closest<HTMLElement>('[data-offer-id]')?.dataset.offerId;
      if (offerId !== undefined) this.toggleSelection(offerId, input.checked, input);
    });

    this.offerForm.addEventListener('input', () => this.onFormChanged());
    this.offerForm.addEventListener('change', () => this.onFormChanged());
    this.offerForm.addEventListener('submit', event => {
      event.preventDefault();
      void this.submitForm();
    });
    byId('offer-form-back-button', HTMLButtonElement).addEventListener('click', () => void this.backFromForm());
    byId('cancel-offer-button', HTMLButtonElement).addEventListener('click', () => void this.cancelForm());

    byId('offer-detail-back-button', HTMLButtonElement).addEventListener('click', () => this.route('saved'));
    byId('edit-offer-button', HTMLButtonElement).addEventListener('click', () => {
      const offer = this.findOffer(this.currentOfferId);
      if (offer !== undefined) this.openForm('edit', offer);
    });
    byId('record-observation-button', HTMLButtonElement).addEventListener('click', () => {
      const offer = this.findOffer(this.currentOfferId);
      if (offer !== undefined) this.openForm('observe', offer);
    });
    byId('detail-compare-button', HTMLButtonElement).addEventListener('click', event => {
      if (this.currentOfferId === null) return;
      const button = event.currentTarget as HTMLButtonElement;
      this.toggleSelection(this.currentOfferId, !this.selected.has(this.currentOfferId), null);
      this.renderDetailCompareButton();
      button.focus();
    });
    byId('show-delete-offer-button', HTMLButtonElement).addEventListener('click', () => {
      byId('delete-offer-confirmation', HTMLDivElement).hidden = false;
      byId('confirm-delete-offer-button', HTMLButtonElement).focus();
    });
    byId('cancel-delete-offer-button', HTMLButtonElement).addEventListener('click', () => {
      byId('delete-offer-confirmation', HTMLDivElement).hidden = true;
      byId('show-delete-offer-button', HTMLButtonElement).focus();
    });
    byId('confirm-delete-offer-button', HTMLButtonElement).addEventListener('click', () => void this.deleteCurrentOffer());

    const comparisonList = byId('comparison-selection-list', HTMLUListElement);
    comparisonList.addEventListener('change', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.dataset.action !== 'select-offer') return;
      const offerId = input.closest<HTMLElement>('[data-offer-id]')?.dataset.offerId;
      if (offerId !== undefined) this.toggleSelection(offerId, input.checked, input);
    });
    byId('comparison-form', HTMLFormElement).addEventListener('submit', event => {
      event.preventDefault();
      this.renderComparisonResult();
    });

    byId('export-button', HTMLButtonElement).addEventListener('click', () => void this.exportNotebook(byId('export-status', HTMLParagraphElement)));
    byId('recovery-export-button', HTMLButtonElement).addEventListener('click', () => void this.exportNotebook(byId('recovery-status', HTMLParagraphElement)));
    byId('recovery-delete-button', HTMLButtonElement).addEventListener('click', () => void this.manageFromRecovery());
    byId('show-delete-all-button', HTMLButtonElement).addEventListener('click', () => {
      byId('delete-all-confirmation', HTMLDivElement).hidden = false;
      byId('confirm-delete-all-button', HTMLButtonElement).focus();
    });
    byId('cancel-delete-all-button', HTMLButtonElement).addEventListener('click', () => {
      byId('delete-all-confirmation', HTMLDivElement).hidden = true;
      byId('show-delete-all-button', HTMLButtonElement).focus();
    });
    byId('confirm-delete-all-button', HTMLButtonElement).addEventListener('click', () => void this.deleteEverything());
  }

  // ---------- consent ----------

  private async acceptNotice(): Promise<void> {
    const start = byId('start-button', HTMLButtonElement);
    const error = byId('notice-error', HTMLParagraphElement);
    start.disabled = true;
    error.hidden = true;
    try {
      await this.notebook.acceptConsent(this.uuid());
      await this.refresh();
      this.route('saved');
      this.announce('Local notebook started. Details are saved on this device.');
    } catch {
      error.hidden = false;
    } finally {
      start.disabled = false;
    }
  }

  private async declineNotice(): Promise<void> {
    const error = byId('notice-error', HTMLParagraphElement);
    error.hidden = true;
    try {
      await this.notebook.declineConsent(this.uuid());
      this.showTopLevel('declined-view');
    } catch {
      error.hidden = false;
    }
  }

  // ---------- saved list ----------

  private renderNavigationCount(): void {
    const count = byId('nav-compare-count', HTMLSpanElement);
    count.textContent = String(this.selected.size);
    count.setAttribute('aria-label', `${this.selected.size} selected`);
  }

  private renderSaved(): void {
    const list = byId('offer-list', HTMLUListElement);
    list.replaceChildren();
    const card = template('offer-card-template');
    for (const offer of this.offers) {
      const fragment = card.content.cloneNode(true) as DocumentFragment;
      const item = fragment.querySelector('li') as HTMLLIElement;
      item.dataset.offerId = offer.offerId;
      const observation = latestObservation(offer);
      setText(item, '[data-field="model"]', `${offer.confirmed.product.brand} ${offer.confirmed.variant.model}`);
      setText(item, '[data-field="price"]', formatPkr(observation.price.item));
      setText(item, '[data-field="identity"]', `${offer.confirmed.retailer.label} · ${identityText(offer.confirmed)}`);
      setText(item, '[data-field="price-summary"]', priceConclusion(observation.price));
      setText(item, '[data-field="recorded-at"]', `Recorded ${formatRecordedAt(observation.observedAt)} · Not automatically checked`);
      setText(item, '[data-field="record-state"]', recordStateText(offer));
      const toggle = item.querySelector<HTMLInputElement>('[data-action="toggle-comparison"]');
      if (toggle !== null) {
        toggle.checked = this.selected.has(offer.offerId);
        toggle.setAttribute('aria-label', `Add ${offer.confirmed.variant.model} from ${offer.confirmed.retailer.label} to comparison`);
      }
      const open = item.querySelector<HTMLButtonElement>('[data-action="open-offer"]');
      open?.setAttribute('aria-label', `View ${offer.confirmed.variant.model} from ${offer.confirmed.retailer.label}`);
      list.append(fragment);
    }
    list.hidden = this.offers.length === 0;
    byId('empty-notebook', HTMLDivElement).hidden = this.offers.length > 0;
    const capacity = this.capacity;
    const offerCount = capacity?.offerCount ?? this.offers.length;
    const badge = byId('offer-count-badge', HTMLOutputElement);
    badge.textContent = `${offerCount}/${MAX_SAVED_OFFERS}`;
    badge.setAttribute('aria-label', `${offerCount} of ${MAX_SAVED_OFFERS} offers`);
    const offersFull = offerCount >= MAX_SAVED_OFFERS;
    const hasNewDraft = this.drafts.some(draft => !draft.confirmed);
    byId('offer-limit-message', HTMLParagraphElement).hidden = !offersFull;
    byId('observation-limit-message', HTMLParagraphElement).hidden = (capacity?.observationCount ?? 0) < MAX_OBSERVATIONS;
    byId('storage-warning', HTMLParagraphElement).hidden = capacity?.warning !== true;
    byId('draft-waiting-message', HTMLParagraphElement).hidden = !hasNewDraft || this.readOnly;
    byId('saved-comparison-limit', HTMLParagraphElement).hidden = true;
    byId('add-offer-button', HTMLButtonElement).disabled = this.readOnly || (offersFull && !hasNewDraft);
  }

  private toggleSelection(offerId: string, checked: boolean, input: HTMLInputElement | null): void {
    const result = updateComparisonSelection(this.selected, offerId, checked);
    this.selected = result.selected;
    if (input !== null) input.checked = this.selected.has(offerId);
    for (const id of ['comparison-limit-message', 'saved-comparison-limit']) {
      byId(id, HTMLParagraphElement).hidden = result.message === null;
    }
    if (result.message !== null) this.announce(result.message);
    this.renderNavigationCount();
    if (this.currentRouteIs('compare')) this.renderComparisonCount();
  }

  private currentRouteIs(route: Route): boolean {
    return this.app.dataset.appState === route;
  }

  // ---------- offer form ----------

  private openForm(mode: FormMode, existing: SavedOffer | null): void {
    if (this.readOnly) return;
    let offerId: string;
    let fields: OfferFormFields;
    let restoredAt: string | null = null;
    if (existing === null) {
      const waiting = this.drafts.find(draft => !draft.confirmed);
      offerId = waiting?.offerId ?? this.uuid();
      fields = waiting === undefined ? emptyOfferForm() : normalizeOfferFormFields(waiting.draft.fields);
      restoredAt = waiting?.draft.updatedAt ?? null;
    } else {
      offerId = existing.offerId;
      const base = formFieldsFromConfirmed(existing.confirmed, latestObservation(existing));
      fields = existing.draft === null ? base : { ...base, ...normalizeOfferFormFields({ ...base, ...existing.draft.fields }) };
      restoredAt = existing.draft?.updatedAt ?? null;
    }
    this.form = { mode, offerId, existing, operationId: this.uuid(), saving: false };
    this.offerForm.reset();
    byId('offer-id', HTMLInputElement).value = offerId;
    this.writeFields(fields);
    this.clearFormErrors();
    const titles: Record<FormMode, [string, string]> = {
      new: ['Add a manual offer', 'Save offer'],
      edit: ['Edit saved offer', 'Save changes'],
      observe: ['Record a new observation', 'Save observation'],
    };
    byId('offer-form-title', HTMLHeadingElement).textContent = titles[mode][0];
    const save = byId('save-offer-button', HTMLButtonElement);
    save.textContent = titles[mode][1];
    save.disabled = false;
    this.setDraftStatus(
      restoredAt === null ? 'idle' : 'saved',
      restoredAt === null
        ? 'Valid draft changes are saved separately. Wait for “Saved” before closing.'
        : `Restored your draft saved ${formatRecordedAt(restoredAt)}.`,
    );
    this.updateConditionals();
    this.updatePreview();
    this.route('offer-form');
  }

  private leaveForm(): void {
    if (this.draftTimer !== null) clearTimeout(this.draftTimer);
    this.draftTimer = null;
    this.draftGeneration += 1;
    this.form = null;
  }

  private control(name: OfferFormFieldName): HTMLInputElement | HTMLSelectElement | null {
    const element = this.offerForm.elements.namedItem(name);
    return element instanceof HTMLInputElement || element instanceof HTMLSelectElement ? element : null;
  }

  private readFields(): OfferFormFields {
    const values: Record<string, string> = {};
    for (const name of OFFER_FORM_FIELD_NAMES) {
      const element = this.control(name);
      if (element === null) continue;
      values[name] = element instanceof HTMLInputElement && element.type === 'checkbox'
        ? (element.checked ? 'yes' : '')
        : element.value;
    }
    return normalizeOfferFormFields(values);
  }

  private writeFields(fields: OfferFormFields): void {
    for (const name of OFFER_FORM_FIELD_NAMES) {
      const element = this.control(name);
      if (element === null) continue;
      const value = fields[name];
      if (element instanceof HTMLInputElement && element.type === 'checkbox') {
        element.checked = value === 'yes';
      } else if (element instanceof HTMLSelectElement) {
        const option = [...element.options].find(candidate => candidate.value === value);
        element.value = option?.value ?? element.options[0]?.value ?? '';
      } else {
        element.value = value;
      }
    }
  }

  private updateConditionals(): void {
    const fields = this.readFields();
    const show = (id: string, visible: boolean): void => {
      byId(id, HTMLDivElement).hidden = !visible;
    };
    show('seller-label-field', fields.sellerMode === 'known');
    show('mpn-field', fields.mpnMode === 'known');
    show('warranty-fields', fields.warrantyMode === 'details');
    show('eligibility-details-field', fields.eligibility === 'conditional' || fields.eligibility === 'personalized');
    show('shipping-amount-field', fields.shippingMode === 'amount');
    show('tax-amount-field', fields.taxMode === 'additional');
    show('cod-fee-amount-field', fields.codFeeMode === 'amount');
    show('discount-fields', fields.discountMode === 'amount');
  }

  private updatePreview(): void {
    byId('offer-price-preview', HTMLOutputElement).textContent = previewPriceText(this.readFields());
  }

  private onFormChanged(): void {
    if (this.form === null || this.form.saving) return;
    this.updateConditionals();
    this.updatePreview();
    if (this.draftTimer !== null) clearTimeout(this.draftTimer);
    this.setDraftStatus('idle', 'Unsaved changes. Valid draft changes are saved separately.');
    this.draftTimer = setTimeout(() => void this.saveDraftNow(), DRAFT_DELAY_MS);
  }

  private setDraftStatus(state: 'idle' | 'saving' | 'saved' | 'error', message: string): void {
    const element = byId('draft-status', HTMLParagraphElement);
    element.dataset.state = state;
    element.textContent = message;
  }

  /** Persists the current structurally valid draft; success is shown only after the write resolves. */
  private async saveDraftNow(): Promise<boolean> {
    if (this.draftTimer !== null) clearTimeout(this.draftTimer);
    this.draftTimer = null;
    const session = this.form;
    if (session === null || session.saving || this.readOnly) return true;
    const generation = ++this.draftGeneration;
    this.setDraftStatus('saving', 'Saving draft…');
    try {
      await this.notebook.saveDraft(session.offerId, { updatedAt: new Date().toISOString(), fields: this.readFields() });
      if (generation === this.draftGeneration) this.setDraftStatus('saved', 'Draft saved on this device.');
      return true;
    } catch (error) {
      if (generation === this.draftGeneration) {
        this.setDraftStatus('error', `Draft could not be saved. ${storageErrorMessage(error, 'Your entries are still on screen.')}`);
      }
      return false;
    }
  }

  private async backFromForm(): Promise<void> {
    const session = this.form;
    if (session !== null && this.draftTimer !== null) {
      const saved = await this.saveDraftNow();
      if (!saved) return;
    }
    await this.refreshSafely();
    if (session?.existing !== null && session?.existing !== undefined) this.openDetail(session.existing.offerId);
    else this.route('saved');
  }

  private async cancelForm(): Promise<void> {
    const session = this.form;
    if (session === null) return;
    this.leaveForm();
    try {
      await this.notebook.clearDraft(session.offerId);
      this.announce('Draft discarded. Saved offers were not changed.');
    } catch {
      this.announce('The draft could not be discarded. It remains saved on this device.');
    }
    await this.refreshSafely();
    if (session.existing !== null) this.openDetail(session.existing.offerId);
    else this.route('saved');
  }

  private clearFormErrors(): void {
    byId('form-error-summary', HTMLDivElement).hidden = true;
    byId('form-error-list', HTMLUListElement).replaceChildren();
    for (const message of this.offerForm.querySelectorAll<HTMLElement>('[data-field-error]')) {
      message.hidden = true;
      message.textContent = '';
    }
    for (const control of this.offerForm.querySelectorAll('[aria-invalid]')) control.removeAttribute('aria-invalid');
  }

  private showFormErrors(issues: readonly FormIssue[]): void {
    this.clearFormErrors();
    const list = byId('form-error-list', HTMLUListElement);
    let first: HTMLElement | null = null;
    for (const issue of issues) {
      const control = this.control(issue.field);
      const message = this.offerForm.querySelector<HTMLElement>(`[data-field-error="${issue.field}"]`);
      if (message !== null) {
        message.hidden = false;
        message.textContent = issue.message;
      }
      if (control !== null) {
        control.setAttribute('aria-invalid', 'true');
        const details = control.closest('details');
        if (details !== null) details.open = true;
        first ??= control;
      }
      const item = document.createElement('li');
      item.textContent = issue.message;
      list.append(item);
    }
    const summary = byId('form-error-summary', HTMLDivElement);
    summary.hidden = false;
    (first ?? summary).focus();
  }

  private async submitForm(): Promise<void> {
    const session = this.form;
    if (session === null || session.saving || this.readOnly) return;
    if (this.draftTimer !== null) clearTimeout(this.draftTimer);
    this.draftTimer = null;
    this.draftGeneration += 1;
    const fields = this.readFields();
    const existing = session.existing;
    const result = buildManualOffer(fields, {
      createId: this.uuid,
      now: () => new Date(),
      newOfferId: session.offerId,
      operationId: session.operationId,
      ...(existing === null ? {} : { existing: existing.confirmed }),
    });
    if (!result.ok) {
      this.showFormErrors(result.issues);
      this.setDraftStatus('error', 'Not saved. Check the fields marked above.');
      return;
    }
    this.clearFormErrors();
    // An edit whose price and availability match the latest entry is a metadata fix, not a new observation.
    let observation = result.observation;
    let metadataOnly = false;
    if (session.mode === 'edit' && existing !== null) {
      const latest = latestObservation(existing);
      metadataOnly = JSON.stringify(latest.price) === JSON.stringify(result.observation.price)
        && latest.stock === result.observation.stock;
    }
    const save = byId('save-offer-button', HTMLButtonElement);
    session.saving = true;
    save.disabled = true;
    this.setDraftStatus('saving', 'Saving…');
    try {
      await this.notebook.saveOffer({
        confirmed: result.confirmed,
        draft: null,
        observation: metadataOnly ? null : observation,
        operationId: session.operationId,
      });
      observation = result.observation;
      this.setDraftStatus('saved', 'Saved on this device.');
      this.leaveForm();
      await this.refreshSafely();
      this.openDetail(observation.offerId);
      this.announce(metadataOnly ? 'Changes saved on this device.' : 'Saved on this device.');
    } catch (error) {
      session.saving = false;
      save.disabled = false;
      // The same operation ID is kept so a retry cannot duplicate a write that did land.
      this.setDraftStatus('error', storageErrorMessage(error, "This change wasn't saved. Try again."));
      this.announce(storageErrorMessage(error, "This change wasn't saved. Try again."));
    }
  }

  private async refreshSafely(): Promise<void> {
    try {
      await this.refresh();
    } catch {
      this.announce('Saved offers could not be reloaded. Close and reopen the popup.');
    }
  }

  // ---------- offer detail ----------

  private openDetail(offerId: string): void {
    const offer = this.findOffer(offerId);
    if (offer === undefined) {
      this.route('saved');
      return;
    }
    this.currentOfferId = offerId;
    const observation = latestObservation(offer);
    const { confirmed } = offer;
    byId('offer-detail-title', HTMLHeadingElement).textContent = `${confirmed.product.brand} ${confirmed.variant.model}`;
    byId('offer-detail-source', HTMLParagraphElement).textContent = 'Entered by you';
    byId('offer-detail-state', HTMLParagraphElement).textContent = recordStateText(offer);
    const facts = byId('offer-detail-facts', HTMLDListElement);
    setText(facts, '[data-detail="identity"]', identityText(confirmed));
    setText(facts, '[data-detail="terms"]', termsText(confirmed));
    setText(facts, '[data-detail="item-price"]', formatPkr(observation.price.item));
    setText(facts, '[data-detail="components"]', componentsText(observation.price));
    setText(facts, '[data-detail="price-conclusion"]', priceConclusion(observation.price));
    setText(facts, '[data-detail="recorded-at"]', `Recorded ${formatRecordedAt(observation.observedAt)} · Not automatically checked`);

    const link = byId('offer-detail-link', HTMLAnchorElement);
    link.href = confirmed.offer.canonicalUrl;
    link.hidden = false;
    link.setAttribute('aria-label', `Open the shop page for ${confirmed.variant.model} at ${confirmed.retailer.label} in a new tab`);

    const attention = byId('offer-attention-list', HTMLUListElement);
    const items = attentionSummary(offer);
    attention.replaceChildren(...(items.length === 0 ? ['No missing details in your entries.'] : items).map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));

    const history = historyView(offer, new Date());
    byId('history-summary', HTMLParagraphElement).textContent = history.summary;
    byId('observation-list', HTMLOListElement).replaceChildren(...history.entries.map(entry => {
      const item = document.createElement('li');
      item.textContent = entry.text;
      item.dataset.revision = entry.earlier ? 'earlier' : 'current';
      return item;
    }));

    byId('delete-offer-name', HTMLElement).textContent = `${confirmed.variant.model} from ${confirmed.retailer.label}`;
    byId('delete-offer-confirmation', HTMLDivElement).hidden = true;
    byId('delete-offer-status', HTMLParagraphElement).hidden = true;
    byId('edit-offer-button', HTMLButtonElement).disabled = this.readOnly;
    byId('record-observation-button', HTMLButtonElement).disabled = this.readOnly
      || (this.capacity?.observationCount ?? 0) >= MAX_OBSERVATIONS;
    this.renderDetailCompareButton();
    this.route('offer-detail');
  }

  private renderDetailCompareButton(): void {
    const button = byId('detail-compare-button', HTMLButtonElement);
    const selected = this.currentOfferId !== null && this.selected.has(this.currentOfferId);
    button.textContent = selected ? 'Remove from comparison' : 'Add to comparison';
    button.setAttribute('aria-pressed', String(selected));
  }

  private async deleteCurrentOffer(): Promise<void> {
    const offerId = this.currentOfferId;
    if (offerId === null) return;
    const status = byId('delete-offer-status', HTMLParagraphElement);
    status.hidden = true;
    try {
      await this.notebook.deleteOffer(offerId);
      this.selected = new Set([...this.selected].filter(id => id !== offerId));
      this.currentOfferId = null;
      await this.reinitializeAfterCleanup();
      this.announce('Offer deleted from this browser profile. Exported files were not affected.');
    } catch {
      status.textContent = "We couldn't delete these entries. Try again.";
      status.hidden = false;
    }
  }

  // ---------- comparison ----------

  private renderComparisonCount(): void {
    byId('comparison-count', HTMLSpanElement).textContent = `${this.selected.size} of 3 selected`;
  }

  private renderComparisonPicker(): void {
    const list = byId('comparison-selection-list', HTMLUListElement);
    list.replaceChildren();
    const choice = template('comparison-choice-template');
    for (const offer of this.offers) {
      const fragment = choice.content.cloneNode(true) as DocumentFragment;
      const item = fragment.querySelector('li') as HTMLLIElement;
      item.dataset.offerId = offer.offerId;
      setText(item, '[data-field="model"]', `${offer.confirmed.product.brand} ${offer.confirmed.variant.model}`);
      setText(item, '[data-field="summary"]', `${offer.confirmed.retailer.label} · ${priceConclusion(latestObservation(offer).price)}`);
      const input = item.querySelector<HTMLInputElement>('[data-action="select-offer"]');
      if (input !== null) input.checked = this.selected.has(offer.offerId);
      list.append(fragment);
    }
    const enough = this.offers.length >= 2;
    byId('comparison-empty', HTMLParagraphElement).hidden = enough;
    byId('compare-button', HTMLButtonElement).disabled = !enough;
    byId('comparison-selection-error', HTMLParagraphElement).hidden = true;
    byId('comparison-limit-message', HTMLParagraphElement).hidden = true;
    byId('comparison-result', HTMLElement).hidden = true;
    this.renderComparisonCount();
  }

  private renderComparisonResult(): void {
    const chosen = this.offers.filter(offer => this.selected.has(offer.offerId));
    const error = byId('comparison-selection-error', HTMLParagraphElement);
    const result = byId('comparison-result', HTMLElement);
    if (chosen.length < 2 || chosen.length > 3) {
      error.hidden = false;
      result.hidden = true;
      return;
    }
    error.hidden = true;
    const view = comparisonView(chosen);
    byId('comparison-summary', HTMLDivElement).textContent = view.summary;
    byId('comparison-differences', HTMLUListElement).replaceChildren(...view.differences.map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    const offerTemplate = template('comparison-offer-template');
    byId('comparison-offers', HTMLDivElement).replaceChildren(...view.offers.map(offer => {
      const fragment = offerTemplate.content.cloneNode(true) as DocumentFragment;
      setText(fragment, '[data-field="heading"]', offer.heading);
      setText(fragment, '[data-field="model-size"]', offer.modelSize);
      setText(fragment, '[data-field="condition-color"]', offer.conditionColor);
      setText(fragment, '[data-field="warranty"]', offer.warranty);
      setText(fragment, '[data-field="item-price"]', offer.itemPrice);
      setText(fragment, '[data-field="delivery-fees"]', offer.deliveryFees);
      setText(fragment, '[data-field="known-amount"]', offer.knownAmount);
      return fragment;
    }));
    result.hidden = false;
    byId('comparison-result-title', HTMLHeadingElement).tabIndex = -1;
    byId('comparison-result-title', HTMLHeadingElement).focus();
  }

  // ---------- data ----------

  private renderData(): void {
    const capacity = this.capacity;
    byId('data-offer-count', HTMLElement).textContent = `${capacity?.offerCount ?? 0} of ${MAX_SAVED_OFFERS}`;
    byId('data-observation-count', HTMLElement).textContent = `${capacity?.observationCount ?? 0} of ${MAX_OBSERVATIONS}`;
    const total = capacity?.totalBytes ?? 0;
    byId('data-byte-count', HTMLElement).textContent = capacity === null
      ? 'Unavailable'
      : `${formatBytes(total)} of 5 MiB${capacity.warning ? ' · nearly full' : ''}`;
    const meter = byId('storage-meter', HTMLProgressElement);
    meter.max = STORAGE_HARD_LIMIT_BYTES;
    meter.value = Math.min(total, STORAGE_HARD_LIMIT_BYTES);
    meter.textContent = `${formatBytes(total)} of 5 MiB`;
    byId('delete-all-confirmation', HTMLDivElement).hidden = true;
  }

  private async exportNotebook(status: HTMLParagraphElement): Promise<void> {
    status.hidden = false;
    status.textContent = 'Preparing export…';
    try {
      const bundle = await this.notebook.exportData();
      const blob = new Blob([serializeNotebookExport(bundle)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pk-shopping-notebook-${bundle.exportedAt.slice(0, 10)}.json`;
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      // Generating the file is not proof it was saved, so only the request is reported.
      status.textContent = 'Download requested—check your downloads.';
    } catch {
      status.textContent = 'The export could not be prepared. Nothing was changed.';
    }
  }

  private async deleteEverything(): Promise<void> {
    const status = byId('delete-all-status', HTMLParagraphElement);
    status.hidden = true;
    try {
      await this.notebook.deleteAll(this.uuid(), false);
      this.selected = new Set();
      await this.reinitializeAfterCleanup();
      if (!this.readOnly) this.route('data');
      status.textContent = 'All local shopping records were deleted. Exported JSON files were not affected.';
      status.hidden = false;
      this.announce(status.textContent);
    } catch {
      byId('delete-all-confirmation', HTMLDivElement).hidden = true;
      status.textContent = "We couldn't delete these entries. Some records may remain; try again.";
      status.hidden = false;
    }
  }

  private async manageFromRecovery(): Promise<void> {
    this.readOnly = true;
    await this.refreshSafely();
    this.route('data');
  }

  /** Cleanup can resolve recovery issues, so the storage state is re-read before writes resume. */
  private async reinitializeAfterCleanup(): Promise<void> {
    const initialization = await this.notebook.initialize();
    this.readOnly = initialization.state !== 'ready';
    await this.refresh();
    if (!this.readOnly && (await this.notebook.getConsent()) === null) {
      this.showTopLevel('onboarding-view');
      return;
    }
    this.route(this.readOnly ? 'data' : 'saved');
  }
}
