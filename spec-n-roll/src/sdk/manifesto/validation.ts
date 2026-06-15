/**
 * Result of validating manifesto content before save.
 */
export interface ManifestoValidationResult {
  /**
   * Whether the manifesto body passes all validation rules.
   */
  valid: boolean;
  /**
   * Human-readable validation failures when `valid` is false.
   */
  errors: string[];
  /**
   * Constitution or governance conflicts surfaced for user resolution before save.
   */
  conflicts?: string[];
}

/**
 * Project-relative path to the Spec Kit constitution file.
 */
export const CONSTITUTION_RELATIVE_PATH = '.specify/memory/constitution.md';

/**
 * Matches unresolved bracket placeholders such as `[MANIFESTO_TITLE]`.
 */
const MANIFESTO_PLACEHOLDER_PATTERN = /\[[A-Z][A-Z0-9_]*\]/g;

/**
 * Validates manifesto markdown before persisting to disk.
 *
 * @param content - Raw manifesto body text to validate.
 * @param scope - Manifesto scope determining which rules apply.
 * @returns Validation outcome with any blocking error messages.
 */
export function validateManifestoContent(
  content: string,
  scope: 'global' | 'step',
): ManifestoValidationResult {
  const errors: string[] = [];
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    errors.push('Manifesto body must not be empty.');
  }

  const placeholders = content.match(MANIFESTO_PLACEHOLDER_PATTERN);
  if (placeholders != null && placeholders.length > 0) {
    const uniquePlaceholders = [...new Set(placeholders)];
    errors.push(`Unresolved placeholders remain: ${uniquePlaceholders.join(', ')}`);
  }

  if (scope === 'step' && !/^##\s+/m.test(trimmed)) {
    errors.push('Step manifesto must include at least one section heading for scope clarity.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Options for manifesto draft validation including governance checks.
 */
export interface ValidateManifestoDraftOptions {
  /**
   * Constitution markdown used to detect governance conflicts; skipped when null or absent.
   */
  constitutionContent?: string | null;
}

/**
 * Normalizes a governance rule phrase for lowercase substring comparison.
 *
 * @param text - Raw rule fragment extracted from the constitution.
 * @returns Lowercase phrase with collapsed whitespace.
 */
function normalizeGovernancePhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Escapes regular expression metacharacters in a literal search phrase.
 *
 * @param value - Literal phrase to escape.
 * @returns Regex-safe string for inclusion in a pattern.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns true when manifesto text affirms an action forbidden by the constitution.
 *
 * @param manifestoDraft - Draft manifesto markdown body.
 * @param forbiddenPhrase - Normalized phrase extracted from a MUST NOT rule.
 * @returns True when the draft encourages the forbidden action without nearby negation.
 */
function manifestoAffirmsForbiddenAction(manifestoDraft: string, forbiddenPhrase: string): boolean {
  if (forbiddenPhrase.length < 8) {
    return false;
  }

  const lowerDraft = manifestoDraft.toLowerCase();
  let searchFrom = 0;

  while (searchFrom < lowerDraft.length) {
    const index = lowerDraft.indexOf(forbiddenPhrase, searchFrom);
    if (index < 0) {
      return false;
    }

    const prefix = lowerDraft.slice(Math.max(0, index - 24), index);
    if (!/\b(do not|don't|never|not|avoid|without)\b/.test(prefix)) {
      return true;
    }

    searchFrom = index + forbiddenPhrase.length;
  }

  return false;
}

/**
 * Returns true when manifesto text negates a constitution MUST requirement.
 *
 * @param manifestoDraft - Draft manifesto markdown body.
 * @param requiredPhrase - Normalized phrase extracted from a MUST rule.
 * @returns True when the draft instructs skipping or bypassing the requirement.
 */
function manifestoNegatesRequiredAction(manifestoDraft: string, requiredPhrase: string): boolean {
  const significantTerms = requiredPhrase
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9-]/g, ''))
    .filter((term) => term.length >= 5);

  if (significantTerms.length === 0) {
    return false;
  }

  const lowerDraft = manifestoDraft.toLowerCase();
  const negationPattern = /\b(skip|ignore|omit|avoid|bypass|waive|defer|without)\b/gi;

  for (const match of lowerDraft.matchAll(negationPattern)) {
    const window = lowerDraft.slice(match.index ?? 0, (match.index ?? 0) + 60);
    const hits = significantTerms.filter((term) => window.includes(term));
    const requiredHits = Math.min(2, significantTerms.length);

    if (hits.length >= requiredHits) {
      return true;
    }

    if (hits.some((term) => term.length >= 8)) {
      return true;
    }
  }

  const directPattern = new RegExp(
    `\\b(skip|ignore|omit|avoid|bypass|waive|defer)\\b[^.\\n]{0,40}${escapeRegExp(requiredPhrase)}`,
    'i',
  );
  return directPattern.test(manifestoDraft);
}

/**
 * Extracts normalized MUST NOT rule phrases from constitution markdown.
 *
 * @param constitutionContent - Full constitution markdown body.
 * @returns Distinct normalized forbidden-action phrases.
 */
function extractMustNotPhrases(constitutionContent: string): string[] {
  const phrases = new Set<string>();
  const pattern = /\bMUST NOT\b([^.\n]+)/gi;

  for (const match of constitutionContent.matchAll(pattern)) {
    const phrase = normalizeGovernancePhrase(match[1] ?? '');
    if (phrase.length >= 8) {
      phrases.add(phrase);
    }
  }

  return [...phrases];
}

/**
 * Extracts normalized MUST rule phrases from constitution markdown.
 *
 * @param constitutionContent - Full constitution markdown body.
 * @returns Distinct normalized required-action phrases.
 */
function extractMustPhrases(constitutionContent: string): string[] {
  const phrases = new Set<string>();
  const pattern = /\bMUST\b(?!\s+NOT)\b([^.\n]+)/gi;

  for (const match of constitutionContent.matchAll(pattern)) {
    const phrase = normalizeGovernancePhrase(match[1] ?? '');
    if (phrase.length >= 8) {
      phrases.add(phrase);
    }
  }

  return [...phrases];
}

/**
 * Detects manifesto draft phrases that contradict constitution MUST and MUST NOT rules.
 *
 * @param manifestoDraft - Draft manifesto markdown body under review.
 * @param constitutionContent - Project constitution markdown used for governance comparison.
 * @returns Human-readable conflict descriptions for user resolution before save.
 */
export function detectManifestoConstitutionConflicts(
  manifestoDraft: string,
  constitutionContent: string,
): string[] {
  const conflicts: string[] = [];

  for (const forbiddenPhrase of extractMustNotPhrases(constitutionContent)) {
    if (manifestoAffirmsForbiddenAction(manifestoDraft, forbiddenPhrase)) {
      conflicts.push(
        `Manifesto affirms "${forbiddenPhrase}" which the constitution forbids (MUST NOT).`,
      );
    }
  }

  for (const requiredPhrase of extractMustPhrases(constitutionContent)) {
    if (manifestoNegatesRequiredAction(manifestoDraft, requiredPhrase)) {
      conflicts.push(
        `Manifesto negates "${requiredPhrase}" which the constitution requires (MUST).`,
      );
    }
  }

  return conflicts;
}

/**
 * Validates manifesto markdown including optional constitution conflict detection.
 *
 * @param content - Raw manifesto body text to validate.
 * @param scope - Manifesto scope determining which structural rules apply.
 * @param options - Optional constitution content for governance conflict checks.
 * @returns Validation outcome with structural errors and governance conflicts.
 */
export function validateManifestoDraft(
  content: string,
  scope: 'global' | 'step',
  options: ValidateManifestoDraftOptions = {},
): ManifestoValidationResult {
  const base = validateManifestoContent(content, scope);
  const constitutionContent = options.constitutionContent;

  if (constitutionContent == null || constitutionContent.trim().length === 0) {
    return base;
  }

  const conflicts = detectManifestoConstitutionConflicts(content, constitutionContent);
  if (conflicts.length === 0) {
    return base;
  }

  return {
    valid: false,
    errors: [...base.errors, ...conflicts],
    conflicts,
  };
}
