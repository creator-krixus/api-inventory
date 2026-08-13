import { chatWithAgent } from "../services/agent.service.js";

// POST /api/v1/agent/chat
// body: {
//   message: string,
//   history?: Array<{role, content}>,
//   attachment?: { kind: "image"|"document", mediaType: string, data: string (base64) }
// }
export const agentChat = async (req, res, next) => {
  try {
    const { message, history, attachment } = req.body;

    const { reply, history: updatedHistory } = await chatWithAgent({
      message,
      history,
      attachment,
      organizationId: req.user.organizationId,
      userId: req.user.id,
    });

    res.status(200).json({
      reply,
      history: updatedHistory,
    });
  } catch (error) {
    next(error);
  }
};