const axios = require('axios');

/**
 * Sends a receipt to an IoT printer.
 * @param {Object} store The store object containing printerEndpoint.
 * @param {Object} sale The full sale object.
 * @param {Array} items Items belonging specifically to this store.
 */
const sendToPrinter = async (store, sale, items) => {
    if (!store.printerEnabled || !store.printerEndpoint) {
        console.log(`Printing skipped for store ${store.name}: Printer not configured.`);
        return;
    }

    try {
        const payload = {
            invoiceId: sale.invoiceId,
            customerName: sale.customerName || 'Walk-in Customer',
            customerPhone: sale.customerPhone || '',
            date: sale.createdAt,
            storeName: store.name,
            items: items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total
            })),
            storeTotal: items.reduce((sum, item) => sum + item.total, 0)
        };

        console.log(`Sending print request to ${store.printerEndpoint} for store ${store.name}`);
        const response = await axios.post(store.printerEndpoint, payload, { timeout: 5000 });
        console.log(`Printer response for ${store.name}:`, response.status);
    } catch (error) {
        console.error(`Failed to print for store ${store.name}:`, error.message);
    }
};

module.exports = { sendToPrinter };
