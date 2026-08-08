import { chatWithAgent } from "../services/agent.service.js";

// POST /api/v1/agent/chat
// body: { message: string, history?: Array<{role, content}> }
export const agentChat = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    const { reply, history: updatedHistory } = await chatWithAgent({
      message,
      history,
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