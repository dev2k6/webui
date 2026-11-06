/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import i18n from '@/i18n';

export function tSchema(text: string | null | undefined, fallback?: string): string {
  if (!text) return fallback ?? '';
  if (i18n.exists(`schema.${text}`)) {
    return i18n.t(`schema.${text}`);
  }
  if (i18n.exists(text)) {
    return i18n.t(text);
  }
  const lower = text.toLowerCase();
  if (i18n.exists(`schema.${lower}`)) {
    return i18n.t(`schema.${lower}`);
  }
  // TitleCase: Capitalize first letter (e.g. "overview" -> "Overview", "STORAGE" -> "Storage")
  const title = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  if (i18n.exists(`schema.${title}`)) {
    return i18n.t(`schema.${title}`);
  }
  // Word TitleCase: Capitalize each word (e.g. "spam samples" -> "Spam Samples")
  if (text.includes(' ')) {
    const titleWords = text
      .split(' ')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');
    if (i18n.exists(`schema.${titleWords}`)) {
      return i18n.t(`schema.${titleWords}`);
    }
  }
  // Uppercase technical acronym (e.g. "tls" -> "TLS", "mta" -> "MTA")
  const upper = text.toUpperCase();
  if (i18n.exists(`schema.${upper}`)) {
    return i18n.t(`schema.${upper}`);
  }
  return fallback ?? text;
}
