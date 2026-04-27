"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PageSystem {
  constructor({ data, maxItemPerPage = 24 }) {
    this.data = data;
    this.maxItemPerPage = maxItemPerPage;
    this.totalPages = Math.ceil(data.length / maxItemPerPage);
  }
  getPage(page) {
    const start = (page - 1) * this.maxItemPerPage;
    const end = start + this.maxItemPerPage;
    return this.data.slice(start, end);
  }
}
exports.default = PageSystem;
