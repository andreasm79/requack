function normalize(value) {
  if (!value) return '';
  let text = String(value);
  try {
    text = decodeURIComponent(text);
  } catch (err) {
    text = String(value);
  }
  return text.replace(/\s+/g, ' ');
}

module.exports = { normalize };
