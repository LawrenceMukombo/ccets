const { AsyncLocalStorage } = require('async_hooks');

// Create a singleton instance of AsyncLocalStorage
const tenantStore = new AsyncLocalStorage();

module.exports = tenantStore;
