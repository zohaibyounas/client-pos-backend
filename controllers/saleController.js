const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');

// Helper to get active store
const getActiveStore = (req) => {
    return req.user.store || req.headers['x-store-id'];
};


// @desc    Create new sale / quotation
// @route   POST /api/sales
const createSale = async (req, res) => {
    const {
        store, salesman, items, subtotal,
        invoiceDiscount, totalAmount, paidAmount,
        type = 'invoice', // invoice, quotation, estimate
        customer, // customerId
        customerName, customerPhone, customerAddress,
        referenceNo, remarks, dueDate
    } = req.body;

    try {
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in sale' });
        }

        const prefix = type === 'quotation' ? 'QUT-' : (type === 'estimate' ? 'EST-' : 'INV-');
        const invoiceId = `${prefix}${Date.now()}`;

        // Enrich items with current costPrice and check stock
        const enrichedItems = [];
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ message: `Product ${item.product} not found` });
            }

            // ONLY check stock for INVOICE type
            if (type === 'invoice' && product.totalStock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for product: ${product.name}. Available: ${product.totalStock}, Requested: ${item.quantity}`
                });
            }

            enrichedItems.push({
                product: item.product,
                quantity: item.quantity,
                costPrice: product.costPrice,
                price: item.price,
                total: item.total
            });
        }

        const sale = new Sale({
            store,
            salesman,
            items: enrichedItems,
            subtotal,
            invoiceDiscount,
            totalAmount,
            paidAmount,
            invoiceId,
            paymentStatus: paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid'),
            type,
            customer,
            customerName,
            customerPhone,
            customerAddress,
            referenceNo,
            remarks,
            dueDate
        });

        const createdSale = await sale.save();

        // ONLY Update Stock & Customer Balance if it's an INVOICE
        if (type === 'invoice') {
            // Update Stock
            for (const item of enrichedItems) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.totalStock -= item.quantity;
                    await product.save();

                    const inventory = await Inventory.findOne({ product: item.product });
                    if (inventory) {
                        inventory.quantity -= item.quantity;
                        await inventory.save();
                    }
                }
            }

            // Update Customer Balance if linked
            if (customer) {
                const cust = await Customer.findById(customer);
                if (cust) {
                    // Calculate amount owed (Total - Paid)
                    const amountOwed = totalAmount - paidAmount;

                    // Add transaction for the sale (Debit)
                    cust.balance += totalAmount;
                    cust.transactions.push({
                        type: 'sale',
                        amount: totalAmount,
                        sale: createdSale._id,
                        description: `Invoice ${invoiceId}`
                    });

                    // Add transaction for payment if any (Credit)
                    if (paidAmount > 0) {
                        cust.balance -= paidAmount;
                        cust.transactions.push({
                            type: 'payment',
                            amount: paidAmount,
                            sale: createdSale._id,
                            description: `Payment for ${invoiceId}`
                        });
                    }

                    await cust.save();
                }
            }
        }

        const populatedSale = await Sale.findById(createdSale._id)
            .populate('items.product', 'name barcode')
            .populate('store', 'name')
            .populate('customer', 'name phone');

        res.status(201).json(populatedSale);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all sales
// @route   GET /api/sales
// @desc    Get all sales
// @route   GET /api/sales
const getSales = async (req, res) => {
    try {
        const storeId = getActiveStore(req);
        if (!storeId) return res.status(400).json({ message: 'Store context required' });

        const { startDate, endDate } = req.query;
        let query = { store: storeId };

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const sales = await Sale.find(query)
            .populate('items.product')
            .populate('salesman', 'name')
            .populate('store', 'name')
            .sort({ createdAt: -1 });

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a sale (Void)
// @route   DELETE /api/sales/:id
const deleteSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        if (sale) {
            // Revert Stock
            for (const item of sale.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.totalStock += item.quantity;
                    await product.save();
                }
            }
            await sale.deleteOne();
            res.json({ message: 'Sale removed and stock reverted' });
        } else {
            res.status(404).json({ message: 'Sale not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Convert Quotation to Invoice
// @route   PUT /api/sales/:id/convert
const convertQuoteToInvoice = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        if (!sale) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        if (sale.type === 'invoice') {
            return res.status(400).json({ message: 'Already an invoice' });
        }

        // Change type and generate new Invoice ID
        sale.type = 'invoice';
        sale.invoiceId = `INV-${Date.now()}`;

        // Update Stock
        for (const item of sale.items) {
            const product = await Product.findById(item.product);
            if (product) {
                product.totalStock -= item.quantity;
                await product.save();

                const inventory = await Inventory.findOne({ product: item.product });
                if (inventory) {
                    inventory.quantity -= item.quantity;
                    await inventory.save();
                }
            }
        }

        // Update Customer Balance if linked
        if (sale.customer) {
            const cust = await Customer.findById(sale.customer);
            if (cust) {
                cust.balance += sale.totalAmount;
                cust.transactions.push({
                    type: 'sale',
                    amount: sale.totalAmount,
                    sale: sale._id,
                    description: `Converted from ${sale.type} to Invoice ${sale.invoiceId}`
                });

                // Check if there was any paid amount (usually quotes are unpaid, but just in case)
                if (sale.paidAmount > 0) {
                    cust.balance -= sale.paidAmount;
                    cust.transactions.push({
                        type: 'payment',
                        amount: sale.paidAmount,
                        sale: sale._id,
                        description: `Payment for ${sale.invoiceId}`
                    });
                }

                await cust.save();
            }
        }

        const updatedSale = await sale.save();
        res.json(updatedSale);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { createSale, getSales, deleteSale, convertQuoteToInvoice };
