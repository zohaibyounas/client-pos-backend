const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB for Seeding');

        const adminEmail = 'zohaiby737@gmail.com';
        const adminPass = '123456789';

        // Check if admin exists
        const userExists = await User.findOne({ email: adminEmail });
        if (userExists) {
            console.log('Admin user already exists');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPass, salt);

        const adminUser = new User({
            name: 'Admin',
            email: adminEmail,
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user seeded successfully');
        process.exit();
    }).catch((err) => {
        console.error('Error seeding admin:', err);
        process.exit(1);
    });
