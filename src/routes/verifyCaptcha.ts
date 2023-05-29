import axios from "axios";
import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  const { recaptcha } = req.body;

  if (!recaptcha) return res.sendStatus(401);

  try {
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptcha,
        },
      }
    );
    const { success } = response.data;

    if (success) {
      // CAPTCHA verification successful
      return res.json({ success: true });
    } else {
      // CAPTCHA verification failed
      return res.json({ success: false });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "CAPTCHA verification failed" });
  }
});

export default router;
