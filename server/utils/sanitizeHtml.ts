import sanitize from 'sanitize-html';

// Strip scripts, event handlers, and dangerous URLs from inbound/outbound HTML
// bodies. The reading pane additionally renders inside a script-less sandboxed
// iframe, so this is defence in depth.
export function cleanMailHtml(dirty: string): string {
  return sanitize(dirty, {
    allowedTags: sanitize.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'span', 'figure', 'figcaption', 'u', 's', 'sub', 'sup',
    ]),
    allowedAttributes: {
      '*': ['style', 'align', 'dir', 'width', 'height'],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    // no <script>, <style>, <iframe>, <object>, <form>, on* handlers, javascript: URLs
    transformTags: {
      a: sanitize.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
    },
  });
}
