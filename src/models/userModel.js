const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const schema = mongoose.Schema;

const userSchema = new schema(
  {
    userName: {   //full name
      type: String,
    },
    userEmail: {   //email
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => /^\S+@\S+\.\S+$/.test(v),
        message: "Invalid email format",
      },
    },
    password: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ["USER", "TEACHER", "ADMIN"],
      required: true,
    },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
    refferalCode: { type: String },
    refferUserId: { type: schema.Types.ObjectId, ref: "user" },
    joinUser: [{ type: schema.Types.ObjectId, ref: "user" }],
    fullName: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    language: { type: String },
    image: { type: String },
    gender: { type: String },
    dob: { type: String },
    phone: { type: String },
    alternatePhone: { type: String },
    school: { type: String },
    class: { type: String },
    rollNo: { type: String },
    address1: { type: String },
    address2: { type: String },
    panCard: { type: String },
    aadharCard: { type: String },
    otherDocument: { type: String },
    otherImage: { type: String },
    documentVerification: { type: Boolean, default: false },
    country: { type: String },
    state: { type: String },
    district: { type: String },
    pincode: { type: Number },
    otp: { type: String },
    otpExpiration: { type: String },
    accountVerification: { type: Boolean, default: false },
    completeProfile: { type: Boolean, default: false },
    currentLocation: {
      type: {
        type: String,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    averageRating: { type: Number, default: 0 },
    wallet: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Pre-save hook to hash passwords
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    // Changed from password to password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Set userName as firstName + lastName if not already set
  if (!this.userName && this.firstName && this.lastName) {
    this.userName = `${this.firstName} ${this.lastName}`;
  }

  next();
});

userSchema.index({ _id: 1, userType: 1 }); // useful for distinguishing by role
userSchema.index({ userEmail: 1, userType: 1 });
userSchema.index({ userEmail: 1 }, { unique: true });
userSchema.index({ userType: 1 });

module.exports = mongoose.model("User", userSchema);
