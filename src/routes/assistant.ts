import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import path from "path";
import fs from "fs";
import { __dirname } from "../utils/utils";

import {
  addMessageToThread,
  createAssistant,
  createThread,
  createVector,
  streamRun,
  uploadJsonTrainingData,
} from "../services/openai";

async function assistantRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.post(
    "/create-assistant",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, instructions } = request.body as {
        name: string;
        instructions: string;
      };
      try {
        const assistant = await createAssistant(name, instructions);
        reply.send({ assistant });
      } catch (error) {
        reply.status(500).send({ error: "Erro ao criar assistente" });
      }
    }
  );

  fastify.post(
    "/create-thread",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const thread = await createThread();
        reply.send({ thread });
      } catch (error) {
        reply.status(500).send({ error: "Failed to create thread" });
      }
    }
  );

  fastify.post(
    "/add-message",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { threadId, content } = request.body as {
        threadId: string;
        content: string;
      };
      try {
        const message = await addMessageToThread(threadId, content);
        reply.send({ message });
      } catch (error) {
        reply.status(500).send({ error: "Failed to add message to thread" });
      }
    }
  );

  fastify.post(
    "/stream-run",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { threadId, assistantId } = request.body as {
        threadId: string;
        assistantId: string;
      };
      try {
        await streamRun(threadId, assistantId);
        reply.send({ message: "Streaming started" });
      } catch (error) {
        reply.status(500).send({ error: "Failed to start streaming" });
      }
    }
  );

  // fastify.post(
  //   "/train-model",
  //   async (request: FastifyRequest, reply: FastifyReply) => {
  //     try {
  //       const parts = request.files();
  //       console.log("parts do arq", parts);

  //       for await (const part of parts) {
  //         if (part.file) {
  //           console.log("processando file:", part.filename);
  //           const filePath = path.join(__dirname, part.filename);

  //           await fs.promises.writeFile(filePath, await part.toBuffer());

  //           const result = await uploadJsonTrainingData(filePath);
  //           reply.send({ message: "Arquivo enviado com sucesso", result });

  //           fs.unlinkSync(filePath);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Erro ao processar o upload:", error);
  //       reply.status(500).send({ error: "Erro ao processar o upload" });
  //     }
  //   }
  // );

  fastify.post(
    "/train-model",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { fileName, data } = request.body as {
          fileName: string;
          data: string;
        };

        if (fileName && data) {
          const filePath = path.join(__dirname, fileName);

          await fs.promises.writeFile(filePath, data);

          const result = await uploadJsonTrainingData(filePath);
          reply.send({ message: "Arquivo enviado com sucesso", result });

          fs.unlinkSync(filePath);
        } else {
          reply
            .status(400)
            .send({ error: "Dados inválidos no corpo da requisição" });
        }
      } catch (error) {
        console.error("Erro ao processar o upload:", error);
        reply.status(500).send({ error: "Erro ao processar o upload" });
      }
    }
  );

  fastify.post(
    "/create-vector",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { name } = request.body as { name: string };

        const result = await createVector(name);
        reply.send({ message: "Vetor criado com sucesso", result });
      } catch (err) {
        console.log("Erro ao criar o vetor:", err);
        reply.status(500).send({ error: "Erro ao criar vetor" });
      }
    }
  );
}

export default assistantRoutes;
