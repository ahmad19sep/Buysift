import {
  createLocalAccessRecord,
  parsePkr,
  summarizePriceComponents,
  validateAccessRecord,
  validateObservationAgainstAccess,
  validateOffer,
  validatePriceComponents,
  validateProduct,
  validateRetailer,
  validateSeller,
  validateVariant,
  ValidationError,
} from '../../domain/index.js';
import type {
  Condition,
  Eligibility,
  Evidence,
  Handedness,
  MandatoryFees,
  Money,
  MouseSize,
  Observation,
  Offer,
  PaymentContext,
  PriceComponents,
  Product,
  Retailer,
  Seller,
  Stock,
  Variant,
  Warranty,
} from '../../domain/index.js';
import { DRAFT_FIELD_NAMES } from '../../storage/types.js';
import type { ConfirmedOffer } from '../../storage/types.js';

export const OFFER_FORM_FIELD_NAMES = DRAFT_FIELD_NAMES;

export type OfferFormFieldName = typeof OFFER_FORM_FIELD_NAMES[number];
export type OfferFormFields = Record<OfferFormFieldName, string>;

/** The form produces exactly the confirmed records that the local notebook persists. */
export type ConfirmedManualOffer = ConfirmedOffer;

export interface ManualOfferBuildOptions {
  createId: () => string;
  now: () => Date;
  existing?: ConfirmedManualOffer;
  newOfferId?: string;
  operationId?: string;
}

export interface FormIssue {
  field: OfferFormFieldName;
  message: string;
}

export type ManualOfferBuildResult =
  | {
    ok: true;
    confirmed: ConfirmedManualOffer;
    observation: Observation;
    sanitizedFields: OfferFormFields;
    needsDetails: boolean;
  }
  | { ok: false; issues: readonly FormIssue[] };

const ENTRY_BASIS = 'Entered by you';
const ENTRY_SOURCE = 'manual:local';

export function emptyOfferForm(): OfferFormFields {
  return {
    brand: '',
    model: '',
    mpnMode: 'unknown',
    mpn: '',
    size: 'unknown',
    handedness: 'unknown',
    color: '',
    region: '',
    receiverOrPack: '',
    retailer: '',
    sellerMode: 'unknown',
    seller: '',
    url: '',
    itemPrice: '',
    condition: 'unknown',
    warrantyMode: 'unknown',
    warrantyProvider: '',
    warrantyKind: 'manufacturer',
    warrantyMonths: '',
    warrantyScope: '',
    shippingMode: 'unknown',
    shippingAmount: '',
    taxMode: 'unknown',
    taxAmount: '',
    feesComplete: '',
    codFeeMode: 'unknown',
    codFeeAmount: '',
    discountMode: 'unknown',
    discountAmount: '',
    discountConditions: '',
    locationScope: '',
    paymentContext: 'unknown',
    eligibility: 'unknown',
    eligibilityDetails: '',
    stock: 'unknown',
  };
}

export function normalizeOfferFormFields(value: Readonly<Record<string, string>>): OfferFormFields {
  const result = emptyOfferForm();
  for (const name of OFFER_FORM_FIELD_NAMES) {
    const entry = value[name];
    if (typeof entry === 'string') result[name] = entry;
  }
  return result;
}

function known<T>(value: T): Evidence<T> {
  return { state: 'known', value, basis: ENTRY_BASIS, sourceRef: ENTRY_SOURCE };
}

function unknown<T>(reason: string): Evidence<T> {
  return { state: 'unknown', reason };
}

function zeroPkr(): Money {
  return { amountMinor: 0, currency: 'PKR', minorUnit: 2 };
}

function required(fields: OfferFormFields, field: OfferFormFieldName, label: string, issues: FormIssue[]): string {
  const value = fields[field].trim();
  if (value.length === 0) issues.push({ field, message: `Enter ${label}.` });
  return value;
}

function parseAmount(
  input: string,
  field: OfferFormFieldName,
  issues: FormIssue[],
  positive: boolean,
): Money | null {
  const parsed = parsePkr(input);
  if (!parsed.ok) {
    issues.push({ field, message: 'Enter a PKR amount with no more than 2 decimal places.' });
    return null;
  }
  if (positive && parsed.value.amountMinor === 0) {
    issues.push({ field, message: 'Enter an item price greater than zero.' });
    return null;
  }
  return parsed.value;
}

function parseInteger(input: string, field: OfferFormFieldName, label: string, issues: FormIssue[]): number | null {
  if (!/^\d+$/.test(input.trim())) {
    issues.push({ field, message: `Enter ${label} as a whole number.` });
    return null;
  }
  const value = Number(input);
  if (!Number.isSafeInteger(value)) {
    issues.push({ field, message: `Enter a valid ${label}.` });
    return null;
  }
  return value;
}

function textEvidence(value: string, missingReason: string): Evidence<string> {
  const normalized = value.trim();
  return normalized.length === 0 ? unknown(missingReason) : known(normalized);
}

function enumEvidence<T extends string>(value: string, allowed: readonly T[], missingReason: string): Evidence<T> {
  return allowed.includes(value as T) ? known(value as T) : unknown(missingReason);
}

function priceFromFields(fields: OfferFormFields, item: Money, issues: FormIssue[]): PriceComponents | null {
  let shipping: Evidence<Money> = unknown('Delivery cost not entered.');
  if (fields.shippingMode === 'free') shipping = known(zeroPkr());
  if (fields.shippingMode === 'amount') {
    const amount = parseAmount(fields.shippingAmount, 'shippingAmount', issues, false);
    if (amount !== null) shipping = known(amount);
  }

  let tax: PriceComponents['tax'] = unknown('Tax treatment not entered.');
  if (fields.taxMode === 'included') tax = known({ includedInItem: true, additional: zeroPkr() });
  if (fields.taxMode === 'additional') {
    const amount = parseAmount(fields.taxAmount, 'taxAmount', issues, false);
    if (amount !== null) tax = known({ includedInItem: false, additional: amount });
  }

  // A COD fee alone does not establish the complete fee list; only the explicit checkbox does.
  let mandatoryFees: PriceComponents['mandatoryFees'] = unknown('Mandatory payment or handling fees not entered.');
  const feesComplete = fields.feesComplete === 'yes';
  if (feesComplete || fields.codFeeMode === 'none' || fields.codFeeMode === 'amount') {
    const items: MandatoryFees['items'] = [];
    let valid = true;
    if (fields.codFeeMode === 'amount') {
      const amount = parseAmount(fields.codFeeAmount, 'codFeeAmount', issues, false);
      if (amount === null) valid = false;
      else items.push({ kind: 'cod', label: 'COD fee entered by you', amount });
    }
    if (valid) mandatoryFees = known({ items, complete: feesComplete });
  }

  let additionalDiscount: PriceComponents['additionalDiscount'] = unknown('Additional discount not entered.');
  if (fields.discountMode === 'none') {
    additionalDiscount = known({ amount: zeroPkr(), alreadyIncluded: false, conditions: [] });
  }
  if (fields.discountMode === 'amount') {
    const amount = parseAmount(fields.discountAmount, 'discountAmount', issues, false);
    if (amount !== null) {
      const conditions = fields.discountConditions.trim().length === 0
        ? []
        : [fields.discountConditions.trim()];
      additionalDiscount = known({ amount, alreadyIncluded: false, conditions });
    }
  }

  if (issues.length > 0) return null;
  return {
    item,
    shipping,
    tax,
    mandatoryFees,
    additionalDiscount,
    locationScope: textEvidence(fields.locationScope, 'Delivery location not entered.'),
    paymentContext: enumEvidence<PaymentContext>(
      fields.paymentContext,
      ['standard', 'cod', 'specified_card'],
      'Payment context not entered.',
    ),
  };
}

function warrantyFromFields(fields: OfferFormFields, issues: FormIssue[]): Evidence<Warranty> {
  if (fields.warrantyMode !== 'details') return unknown('Warranty provider not entered.');
  const provider = required(fields, 'warrantyProvider', 'the warranty provider', issues);
  const months = parseInteger(fields.warrantyMonths, 'warrantyMonths', 'warranty months', issues);
  if (provider.length === 0 || months === null) return unknown('Warranty details are incomplete.');
  return known({
    provider,
    kind: fields.warrantyKind === 'seller' ? 'seller' : 'manufacturer',
    months,
    scope: textEvidence(fields.warrantyScope, 'Warranty scope not entered.'),
    termsRef: null,
  });
}

function identityFingerprint(product: Product, variant: Variant): string {
  return JSON.stringify([
    product.brand,
    product.modelFamily,
    variant.model,
    variant.mpn,
    variant.gtin,
    variant.size,
    variant.handedness,
    variant.color,
    variant.region,
    variant.receiverOrPack,
  ]);
}

function contextFingerprint(retailer: Retailer, seller: Seller, offer: Offer): string {
  return JSON.stringify([
    retailer.label,
    retailer.canonicalHost,
    seller.label,
    offer.canonicalUrl,
    offer.condition,
    offer.warranty,
    offer.eligibility,
    offer.eligibilityDetails,
  ]);
}

function fieldForPath(path: string): OfferFormFieldName {
  const mappings: ReadonlyArray<readonly [string, OfferFormFieldName]> = [
    ['product.brand', 'brand'],
    ['product.modelFamily', 'model'],
    ['variant.model', 'model'],
    ['variant.mpn', 'mpn'],
    ['variant.size', 'size'],
    ['variant.handedness', 'handedness'],
    ['variant.color', 'color'],
    ['variant.region', 'region'],
    ['variant.receiverOrPack', 'receiverOrPack'],
    ['retailer.label', 'retailer'],
    ['seller.label', 'seller'],
    ['canonicalUrl', 'url'],
    ['offer.condition', 'condition'],
    ['offer.warranty', 'warrantyProvider'],
    ['price.item', 'itemPrice'],
    ['price.shipping', 'shippingAmount'],
    ['price.tax', 'taxAmount'],
    ['price.mandatoryFees', 'codFeeAmount'],
    ['price.additionalDiscount', 'discountAmount'],
    ['price.locationScope', 'locationScope'],
    ['price.paymentContext', 'paymentContext'],
  ];
  return mappings.find(([prefix]) => path.includes(prefix))?.[1] ?? 'model';
}

function validationIssues(error: unknown): FormIssue[] {
  if (error instanceof ValidationError) {
    return error.issues.map(issue => ({ field: fieldForPath(issue.path), message: issue.message }));
  }
  return [{ field: 'model', message: 'The offer could not be validated.' }];
}

export function buildManualOffer(
  rawFields: Readonly<Record<string, string>>,
  options: ManualOfferBuildOptions,
): ManualOfferBuildResult {
  const fields = normalizeOfferFormFields(rawFields);
  const issues: FormIssue[] = [];
  const brand = required(fields, 'brand', 'the brand', issues);
  const model = required(fields, 'model', 'the model', issues);
  const retailerLabel = required(fields, 'retailer', 'the shop or marketplace', issues);
  required(fields, 'url', 'a public HTTPS product link', issues);
  const itemText = required(fields, 'itemPrice', 'the item price', issues);
  const item = itemText.length === 0 ? null : parseAmount(itemText, 'itemPrice', issues, true);
  const warranty = warrantyFromFields(fields, issues);
  if ((fields.eligibility === 'conditional' || fields.eligibility === 'personalized')
    && fields.eligibilityDetails.trim().length === 0) {
    issues.push({ field: 'eligibilityDetails', message: 'Describe the price condition.' });
  }
  if (issues.length > 0 || item === null) return { ok: false, issues };

  const ids = options.existing === undefined
    ? {
      product: options.createId(),
      variant: options.createId(),
      retailer: options.createId(),
      seller: options.createId(),
      offer: options.newOfferId ?? options.createId(),
      access: options.createId(),
    }
    : {
      product: options.existing.product.id,
      variant: options.existing.variant.id,
      retailer: options.existing.retailer.id,
      seller: options.existing.seller.id,
      offer: options.existing.offer.id,
      access: options.existing.access.id,
    };

  try {
    const productDraft: Product = {
      id: ids.product,
      category: 'wireless_mouse',
      brand,
      modelFamily: model,
    };
    const variantDraft: Variant = {
      id: ids.variant,
      productId: ids.product,
      model,
      mpn: fields.mpnMode === 'known'
        ? textEvidence(fields.mpn, 'Manufacturer part number not entered.')
        : unknown('Manufacturer part number not entered.'),
      gtin: unknown('GTIN not entered.'),
      size: enumEvidence<MouseSize>(fields.size, ['small_medium', 'large'], 'Mouse size not entered.'),
      handedness: enumEvidence<Handedness>(
        fields.handedness,
        ['right', 'left', 'ambidextrous'],
        'Handedness not entered.',
      ),
      color: textEvidence(fields.color, 'Color not entered.'),
      region: textEvidence(fields.region, 'Region not entered.'),
      receiverOrPack: textEvidence(fields.receiverOrPack, 'Receiver or pack not entered.'),
      identityStatus: 'user_entered',
      identityRevision: options.existing?.variant.identityRevision ?? 1,
    };
    const provisionalProduct = validateProduct(productDraft);
    const provisionalVariant = validateVariant(variantDraft);
    if (options.existing !== undefined
      && identityFingerprint(provisionalProduct, provisionalVariant)
        !== identityFingerprint(options.existing.product, options.existing.variant)) {
      variantDraft.identityRevision += 1;
    }

    const sanitizedUrl = validateOffer({
      id: ids.offer,
      retailerId: ids.retailer,
      sellerId: ids.seller,
      variantId: ids.variant,
      retailerListingId: null,
      retailerSku: null,
      selectedOptionIds: {},
      canonicalUrl: fields.url,
      condition: enumEvidence<Condition>(fields.condition, ['new', 'refurbished', 'used'], 'Condition not entered.'),
      warranty,
      eligibility: (['public', 'conditional', 'personalized', 'unknown'] as const).includes(fields.eligibility as Eligibility)
        ? fields.eligibility as Eligibility
        : 'unknown',
      eligibilityDetails: fields.eligibilityDetails.trim().length === 0 ? [] : [fields.eligibilityDetails.trim()],
      contextRevision: options.existing?.offer.contextRevision ?? 1,
    }).canonicalUrl;

    const retailerDraft: Retailer = {
      id: ids.retailer,
      label: retailerLabel,
      canonicalHost: new URL(sanitizedUrl).hostname,
    };
    const sellerDraft: Seller = {
      id: ids.seller,
      retailerId: ids.retailer,
      label: fields.sellerMode === 'known' ? textEvidence(fields.seller, 'Seller not entered.') : unknown('Seller not entered.'),
      retailerSellerId: null,
    };
    const offerDraft: Offer = {
      id: ids.offer,
      retailerId: ids.retailer,
      sellerId: ids.seller,
      variantId: ids.variant,
      retailerListingId: null,
      retailerSku: null,
      selectedOptionIds: {},
      canonicalUrl: sanitizedUrl,
      condition: enumEvidence<Condition>(fields.condition, ['new', 'refurbished', 'used'], 'Condition not entered.'),
      warranty,
      eligibility: (['public', 'conditional', 'personalized', 'unknown'] as const).includes(fields.eligibility as Eligibility)
        ? fields.eligibility as Eligibility
        : 'unknown',
      eligibilityDetails: fields.eligibilityDetails.trim().length === 0 ? [] : [fields.eligibilityDetails.trim()],
      contextRevision: options.existing?.offer.contextRevision ?? 1,
    };

    const product = validateProduct(productDraft);
    const variant = validateVariant(variantDraft);
    const retailer = validateRetailer(retailerDraft);
    const seller = validateSeller(sellerDraft);
    if (options.existing !== undefined
      && (identityFingerprint(product, variant) !== identityFingerprint(options.existing.product, options.existing.variant)
        || contextFingerprint(retailer, seller, offerDraft)
          !== contextFingerprint(options.existing.retailer, options.existing.seller, options.existing.offer))) {
      offerDraft.contextRevision += 1;
    }
    const offer = validateOffer(offerDraft);
    const access = validateAccessRecord(
      options.existing?.access ?? createLocalAccessRecord(ids.access, 'personal_manual'),
    );
    const price = priceFromFields(fields, item, issues);
    if (price === null || issues.length > 0) return { ok: false, issues };
    const validatedPrice = validatePriceComponents(price);
    const observedAt = options.now().toISOString();
    const operationId = options.operationId ?? options.createId();
    const observation = validateObservationAgainstAccess({
      id: options.createId(),
      operationId,
      offerId: offer.id,
      variantRevision: variant.identityRevision,
      offerContextRevision: offer.contextRevision,
      productSnapshot: product,
      identitySnapshot: variant,
      retailerSnapshot: retailer,
      sellerSnapshot: seller,
      offerContextSnapshot: offer,
      sourceKind: 'manual',
      accessRecordId: access.id,
      observedAt,
      receivedAt: observedAt,
      checkedAt: null,
      sourceGeneratedAt: null,
      timeBasis: 'manual_entry',
      sourceRevision: null,
      parserVersion: null,
      price: validatedPrice,
      stock: (['in_stock', 'out_of_stock', 'preorder', 'unknown'] as const).includes(fields.stock as Stock)
        ? fields.stock as Stock
        : 'unknown',
      status: 'accepted',
      replacesObservationId: null,
    }, access);

    const summary = summarizePriceComponents(validatedPrice);
    const needsDetails = variant.mpn.state === 'unknown'
      || variant.size.state === 'unknown'
      || variant.handedness.state === 'unknown'
      || variant.color.state === 'unknown'
      || variant.region.state === 'unknown'
      || variant.receiverOrPack.state === 'unknown'
      || seller.label.state === 'unknown'
      || (offer.warranty.state === 'known' && offer.warranty.value.scope.state === 'unknown')
      || offer.condition.state === 'unknown'
      || offer.warranty.state === 'unknown'
      || offer.eligibility === 'unknown'
      || summary.deliveredTotal === null
      || observation.stock === 'unknown';

    fields.url = offer.canonicalUrl;
    return {
      ok: true,
      confirmed: { product, variant, retailer, seller, offer, access },
      observation,
      sanitizedFields: fields,
      needsDetails,
    };
  } catch (error) {
    return { ok: false, issues: validationIssues(error) };
  }
}

export function formFieldsFromConfirmed(confirmed: ConfirmedManualOffer, observation: Observation): OfferFormFields {
  const fields = emptyOfferForm();
  fields.brand = confirmed.product.brand;
  fields.model = confirmed.variant.model;
  fields.mpnMode = confirmed.variant.mpn.state;
  fields.mpn = confirmed.variant.mpn.state === 'known' ? confirmed.variant.mpn.value : '';
  fields.size = confirmed.variant.size.state === 'known' ? confirmed.variant.size.value : 'unknown';
  fields.handedness = confirmed.variant.handedness.state === 'known' ? confirmed.variant.handedness.value : 'unknown';
  fields.color = confirmed.variant.color.state === 'known' ? confirmed.variant.color.value : '';
  fields.region = confirmed.variant.region.state === 'known' ? confirmed.variant.region.value : '';
  fields.receiverOrPack = confirmed.variant.receiverOrPack.state === 'known' ? confirmed.variant.receiverOrPack.value : '';
  fields.retailer = confirmed.retailer.label;
  fields.sellerMode = confirmed.seller.label.state;
  fields.seller = confirmed.seller.label.state === 'known' ? confirmed.seller.label.value : '';
  fields.url = confirmed.offer.canonicalUrl;
  fields.itemPrice = (observation.price.item.amountMinor / 100).toFixed(2);
  fields.condition = confirmed.offer.condition.state === 'known' ? confirmed.offer.condition.value : 'unknown';
  if (confirmed.offer.warranty.state === 'known') {
    fields.warrantyMode = 'details';
    fields.warrantyProvider = confirmed.offer.warranty.value.provider;
    fields.warrantyKind = confirmed.offer.warranty.value.kind;
    fields.warrantyMonths = String(confirmed.offer.warranty.value.months);
    fields.warrantyScope = confirmed.offer.warranty.value.scope.state === 'known'
      ? confirmed.offer.warranty.value.scope.value
      : '';
  }
  if (observation.price.shipping.state === 'known') {
    fields.shippingMode = observation.price.shipping.value.amountMinor === 0 ? 'free' : 'amount';
    fields.shippingAmount = (observation.price.shipping.value.amountMinor / 100).toFixed(2);
  }
  if (observation.price.tax.state === 'known') {
    fields.taxMode = observation.price.tax.value.includedInItem ? 'included' : 'additional';
    fields.taxAmount = (observation.price.tax.value.additional.amountMinor / 100).toFixed(2);
  }
  if (observation.price.mandatoryFees.state === 'known') {
    const fees = observation.price.mandatoryFees.value;
    const cod = fees.items.filter(fee => fee.kind === 'cod');
    fields.feesComplete = fees.complete ? 'yes' : '';
    if (cod.length > 0) {
      fields.codFeeMode = 'amount';
      fields.codFeeAmount = (cod.reduce((sum, fee) => sum + fee.amount.amountMinor, 0) / 100).toFixed(2);
    } else {
      fields.codFeeMode = 'none';
    }
  }
  if (observation.price.additionalDiscount.state === 'known'
  ) {
    const discount = observation.price.additionalDiscount.value;
    fields.discountMode = discount.amount.amountMinor === 0 && discount.conditions.length === 0 ? 'none' : 'amount';
    fields.discountAmount = (discount.amount.amountMinor / 100).toFixed(2);
    fields.discountConditions = discount.conditions.join('; ');
  }
  fields.locationScope = observation.price.locationScope.state === 'known' ? observation.price.locationScope.value : '';
  fields.paymentContext = observation.price.paymentContext.state === 'known' ? observation.price.paymentContext.value : 'unknown';
  fields.eligibility = confirmed.offer.eligibility;
  fields.eligibilityDetails = confirmed.offer.eligibilityDetails.join('; ');
  fields.stock = observation.stock;
  return fields;
}

export function formatPkr(money: Money): string {
  const amount = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: money.amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(money.amountMinor / 100);
  return `PKR ${amount}`;
}

export function describeKnownPrice(price: PriceComponents): string {
  const summary = summarizePriceComponents(price);
  if (summary.deliveredTotal !== null) return `${formatPkr(summary.deliveredTotal)} delivered under entered conditions`;
  const item = summary.item === null ? 'Item price invalid' : formatPkr(summary.item);
  const labels: Record<string, string> = {
    shipping: 'delivery',
    tax: 'tax',
    mandatory_fees: 'mandatory fees',
    additional_discount: 'additional discount',
    location_scope: 'delivery area',
    payment_context: 'payment method',
    item: 'item price',
  };
  const missing = summary.missing.map(entry => labels[entry] ?? entry).join(', ');
  return `${item} + ${missing || 'details'} not entered`;
}

/** Live review text for the form; it never creates records and reports field problems instead. */
export function previewPriceText(rawFields: Readonly<Record<string, string>>): string {
  const fields = normalizeOfferFormFields(rawFields);
  const issues: FormIssue[] = [];
  if (fields.itemPrice.trim().length === 0) return 'Enter an item price to review the known amount and missing components.';
  const item = parseAmount(fields.itemPrice, 'itemPrice', issues, true);
  if (item === null) return issues[0]?.message ?? 'Enter a valid item price.';
  const price = priceFromFields(fields, item, issues);
  if (price === null) return issues[0]?.message ?? 'Check the price details.';
  try {
    return describeKnownPrice(validatePriceComponents(price));
  } catch {
    return 'Check the price details.';
  }
}
