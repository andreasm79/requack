module.exports = [
  { id: 'sqli-100', enabled: true, action: 'block', pattern: /\bunion\b[\s\S]{0,40}\bselect\b/i },
  { id: 'sqli-101', enabled: true, action: 'block', pattern: /'\s*or\s+'?\d+'?\s*=\s*'?\d+/i },
  { id: 'sqli-102', enabled: true, action: 'block', pattern: /;\s*(drop|truncate)\s+table\b/i },
];
