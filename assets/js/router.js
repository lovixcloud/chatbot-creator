/**
 * Client-Side Hash Router
 */

export class Router {
  constructor(routes = {}) {
    this.routes = routes;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init() {
    this.handleRoute();
  }

  navigate(path) {
    window.location.hash = path.startsWith('#') ? path : `#${path}`;
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    // Match route handler
    const matched = this.routes[path] || this.routes['/'] || (() => {});
    matched(params);
  }
}
