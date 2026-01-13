const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Purchase = require('../models/Purchase');

// @desc    Get dashboard stats
// @route   GET /api/analytics/dashboard
const getDashboardStats = async (req, res) => {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    try {
        // Sales Stats (filtered)
        const salesStats = await Sale.aggregate([
            { $match: dateFilter },
            { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$_id",
                    totalAmount: { $first: "$totalAmount" },
                    cost: { $sum: { $multiply: [{ $ifNull: ["$items.costPrice", 0] }, { $ifNull: ["$items.quantity", 0] }] } }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalProfit: { $sum: { $subtract: ["$totalAmount", "$cost"] } },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Purchase Stats (filtered)
        const purchaseStats = await Purchase.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        // Expense Stats (filtered)
        const expenseStats = await Expense.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        // Global Inventory Stats (not filtered by date)
        const inventorySummary = await Product.aggregate([
            { $group: { _id: null, totalCost: { $sum: { $multiply: ["$costPrice", "$totalStock"] } }, totalItems: { $sum: "$totalStock" } } }
        ]);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Trend aggregation (Sales & Profit)
        const salesTrend = await Sale.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: {
                        id: "$_id",
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    totalAmount: { $first: "$totalAmount" },
                    cost: { $sum: { $multiply: [{ $ifNull: ["$items.costPrice", 0] }, { $ifNull: ["$items.quantity", 0] }] } }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    sales: { $sum: "$totalAmount" },
                    profit: { $sum: { $subtract: ["$totalAmount", "$cost"] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Trend aggregation (Purchases)
        const purchaseTrend = await Purchase.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    purchases: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Merge trends
        const trend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - i);
            const ds = d.toISOString().split('T')[0];

            const sT = salesTrend.find(t => t._id === ds) || { sales: 0, profit: 0 };
            const pT = purchaseTrend.find(t => t._id === ds) || { purchases: 0 };

            trend.push({
                date: ds,
                sales: sT.sales || 0,
                profit: sT.profit || 0,
                purchases: pT.purchases || 0
            });
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const todayData = trend.find(t => t.date === todayStr) || { sales: 0, profit: 0 };

        res.json({
            totalSales: salesStats[0]?.totalRevenue || 0,
            saleCount: salesStats[0]?.count || 0,
            totalProfit: salesStats[0]?.totalProfit || 0,
            todaySales: todayData.sales,
            todayProfit: todayData.profit,
            totalPurchases: purchaseStats[0]?.total || 0,
            totalExpenses: expenseStats[0]?.total || 0,
            totalInventoryItems: inventorySummary[0]?.totalItems || 0,
            totalInventoryCost: inventorySummary[0]?.totalCost || 0,
            trend,
            monthlyProfitTrend: []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get Sales Report
// @route   GET /api/analytics/sales-report
const getSalesReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    try {
        const sales = await Sale.find(dateFilter)
            .populate('salesman', 'name')
            .populate('store', 'name')
            .sort({ createdAt: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get Top Selling Products
// @route   GET /api/analytics/top-selling
const getTopSelling = async (req, res) => {
    try {
        const topProducts = await Sale.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    totalQty: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.total" }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
            { $unwind: "$productInfo" }
        ]);
        res.json(topProducts);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getDashboardStats, getSalesReport, getTopSelling };
