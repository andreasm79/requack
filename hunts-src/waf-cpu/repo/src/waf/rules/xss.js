module.exports = [
  { id: 'xss-300', enabled: true, action: 'block', pattern: /<script\b[^>]*>/i },
  { id: 'xss-301', enabled: true, action: 'block', pattern: /\bon(error|load|click)\s*=/i },
  {
    id: 'xss-302',
    enabled: true,
    action: 'simulate',
!!    pattern: /(?:["'\]}\\\d`+-]|true|false|null|undefined)+\)*;?(?:\s|-|~|!)*.*(?:.*=.*)/i,
  },
];
