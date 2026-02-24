import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  problemTitle: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    required: true,
    enum: ["easy", "medium", "hard"],
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open",
  },
  callId: {
    type: String,
    default: "",
  },
});

const Session = mongoose.model("Session", sessionSchema);
export default Session;
