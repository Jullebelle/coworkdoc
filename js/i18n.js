/**
 * ============================================================
 *  COWORKDOC — Internationalisation (i18n)
 *  js/i18n.js
 *
 *  Handles EN / ES language switching across all pages.
 *
 *  HOW IT WORKS:
 *  1. On page load, detects saved language preference (localStorage)
 *     or falls back to browser language, defaulting to 'en'.
 *  2. Fetches the correct translations JSON file.
 *  3. Applies translations to every element with a data-i18n attribute.
 *  4. The EN/ES toggle in the nav calls setLanguage() directly.
 *
 *  HOW TO USE IN HTML:
 *  Add data-i18n="key.path" to any element whose text should be translated.
 *  The key path uses dots to navigate the JSON structure.
 *
 *  Examples:
 *    <span data-i18n="nav.ent">ENT</span>
 *    <h1 data-i18n="hero.title">Your surgical support</h1>
 *    <p data-i18n="hero.sub">We develop surgical devices...</p>
 *
 *  For placeholders (inputs):
 *    <input data-i18n-placeholder="contact.form.name_placeholder">
 *
 *  For aria-labels:
 *    <button data-i18n-aria="nav.menu_open">
 * ============================================================
 */

const I18n = (() => {

  // Current language — 'en' or 'es'
  let currentLang = 'es';

  // Cached translation objects
  const cache = {};

  /**
   * Resolve a dot-notation key path against a translations object.
   * e.g. getNestedValue({ nav: { ent: 'ENT' } }, 'nav.ent') → 'ENT'
   */
  function getNestedValue(obj, keyPath) {
    return keyPath.split('.').reduce((acc, key) => {
      return acc && acc[key] !== undefined ? acc[key] : null;
    }, obj);
  }

  /**
   * Fetch translations for a given language.
   * Returns a promise that resolves to the translations object.
   * Results are cached so we only fetch once per language per session.
   */
  async function fetchTranslations(lang) {
    if (cache[lang]) return cache[lang];

    try {
      const response = await fetch(`translations/${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
      const data = await response.json();
      cache[lang] = data;
      return data;
    } catch (err) {
      console.warn(`[i18n] Could not load translations for "${lang}":`, err);
      // If Spanish fails to load, fall back to English
      if (lang !== 'en') {
        return fetchTranslations('en');
      }
      return {};
    }
  }

  /**
   * Apply a translations object to the current document.
   * Finds all elements with data-i18n, data-i18n-placeholder,
   * or data-i18n-aria attributes and updates their text.
   */
  function applyTranslations(translations) {

    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        // Preserve child elements (e.g. <em> inside headings)
        // Only update if the element has no meaningful child elements
        if (el.children.length === 0) {
          el.textContent = value;
        } else {
          // For elements with children, update only text nodes
          // This preserves <em>, <strong>, <a> etc. inside translated strings
          el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
              // Find the base key value (strip HTML) — just update text nodes
              node.textContent = value;
            }
          });
        }
      }
    });

    // Placeholder attributes (input fields)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        el.setAttribute('placeholder', value);
      }
    });

    // ARIA labels
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        el.setAttribute('aria-label', value);
      }
    });

    // Title attributes (tooltips)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        el.setAttribute('title', value);
      }
    });

    // Update the HTML lang attribute
    document.documentElement.setAttribute('lang', currentLang);
  }

  /**
   * Set the active language and update the UI.
   * Called by the nav toggle buttons and on page load.
   */
  async function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'es') lang = 'es';

    currentLang = lang;

    // Save preference
    try {
      localStorage.setItem('coworkdoc_lang', lang);
    } catch (e) {
      // localStorage not available — silent fail
    }

    // Update toggle button active states
    document.querySelectorAll('.lang-toggle button').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    // Fetch and apply translations
    const translations = await fetchTranslations(lang);
    applyTranslations(translations);
  }

  /**
   * Detect the preferred language on page load.
   * Priority: 1. localStorage  2. Browser language  3. Default 'en'
   */
  function detectLanguage() {
    // 1. Saved preference
    try {
      const saved = localStorage.getItem('coworkdoc_lang');
      if (saved === 'en' || saved === 'es') return saved;
    } catch (e) {
      // silent
    }

    // 2. Browser language
    const browserLang = (navigator.language || navigator.userLanguage || 'en')
      .toLowerCase()
      .slice(0, 2);

    if (browserLang === 'es') return 'es';

    // 3. Default
    return 'es';
  }

  /**
   * Initialise i18n on page load.
   * Call this once per page, after DOM is ready.
   */
  async function init() {
    const lang = detectLanguage();
    await setLanguage(lang);
  }

  // Public API
  return {
    init,
    setLanguage,
    getCurrentLang: () => currentLang,
  };

})();


/* ============================================================
 *  AUTO-INIT
 *  Runs when the DOM is ready.
 * ============================================================ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18n.init());
} else {
  I18n.init();
}
