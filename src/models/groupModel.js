const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    groupName: { 
      type: String, 
      required: true,
      unique: true
    },
    members: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "user" }],
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true }
);

groupSchema.index({ members: 1 });
groupSchema.index({ admin: 1 });


module.exports = mongoose.model("Group", groupSchema);
