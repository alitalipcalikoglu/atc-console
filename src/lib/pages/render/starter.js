/** First version of a new template: a small, valid layout to edit from. */
export const STARTER_LAYOUT = Object.freeze({
  page: { size: 'A4', orientation: 'portrait' },
  footer: { text: '{{page}} / {{pages}}', align: 'center' },
  blocks: [
    { type: 'heading', level: 1, text: '{{title}}' },
    { type: 'text', text: 'Hello **{{name}}**.' },
  ],
});

export const STARTER_DATA = Object.freeze({ title: 'Document', name: 'Ada' });

/** Sample data per `sid/template` for this signed-in session only; cleared by a reload or when the signed-in area unmounts (sign-out). @type {Map<string, string>} */
export const SAMPLES = new Map();
