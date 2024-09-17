const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20
    },
    userEmail: {
        type: String,
        required: true,
        unique: true,  // Ensures email is unique
        validate: {
            validator: (v) => /^\S+@\S+\.\S+$/.test(v),
            message: 'Invalid email format'
        }
    },
    userPassword: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: true
    }
});

// Compound index for quick queries combining email and role
userSchema.index({ userEmail: 1, userRole: 1 });

// Unique index on email for quick lookups
userSchema.index({ userEmail: 1 }, { unique: true });

// Optional: Add index on userRole if querying by role is common
userSchema.index({ userRole: 1 });

// Pre-save hook to hash passwords
userSchema.pre('save', async function (next) {
    if (this.isModified('userPassword')) {
        const salt = await bcrypt.genSalt(10);
        this.userPassword = await bcrypt.hash(this.userPassword, salt);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
