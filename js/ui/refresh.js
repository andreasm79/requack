let handler = () => {};

export function onRefresh(fn) {
  handler = fn;
}

export function refresh() {
  handler();
}
