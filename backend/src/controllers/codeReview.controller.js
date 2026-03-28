import codeReviewService from "../service/code-review.service.js";

export async function getReview(req, res) {
  try {
    const code = req.body.code;

    if (!code) {
      return res.status(400).send("Prompt is required");
    }

    const response = await codeReviewService(code);

    res.send(response);
  } catch (err) {
    console.error("getReview error:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).send(message);
  }
};
