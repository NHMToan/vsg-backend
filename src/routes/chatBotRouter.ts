import express from "express";
import { Configuration, OpenAIApi } from "openai";
const router = express.Router();

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);
router.post("/", async (req, res) => {
  try {
    const prompt: string = await req.body.prompt;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `${prompt}`,
      temperature: 1,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: "\n\n\n",
    });
    return res.json({
      message: response.data.choices[0].text,
    });
  } catch (error) {
    console.log("ERROR TO FETCH OPEN API", error);
    return res.sendStatus(403);
  }
});

export default router;
