import { chatClient, upsertStreamUser } from "../utils/stream.js";

export async function getStreamToken(req, res) {
  try {
    await upsertStreamUser({
      id: req.user.clerkId.toString(),
      name: req.user.name,
      image: req.user.profileImage,
    });

    const token = chatClient.createToken(req.user.clerkId);

    res.status(200).json({
      token,
      userId: req.user.clerkId,
      userName: req.user.name,
      userImage: req.user.profileImage,
    });
  } catch (error) {
    console.error("Error in getStream controller:", error.message);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}
