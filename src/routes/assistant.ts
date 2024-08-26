import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fs from "fs";
import path from "path";
import { __dirname } from "../utils/utils";

import {
  addMessageToThread,
  createAssistant,
  createThread,
  createVector,
  streamRun,
  uploadFilesToVectorStore,
  uploadJsonTrainingData,
  updateAssistantWithVectorStore,
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
        const { name } = request.body as { name: string; files: any };
        const result = await createVector(name);

        reply.send({ message: "Vetor criado com sucesso", result });
      } catch (err) {
        reply.status(500).send({ error: "Erro ao criar vetor" });
      }
    }
  );

  fastify.post("/upload-files", async (request, reply) => {
    try {
      const { name, files } = request.body as { name: string; files: string[] };

      if (!files || !Array.isArray(files)) {
        return reply.status(400).send({
          error: "Arquivos devem ser obrigatórios e ser um array de arquivos",
        });
      }

      const vectorStore = await uploadFilesToVectorStore(name, files);

      return reply.send({
        message: "Arquivos enviados com sucesso",
        vectorStore,
      });
    } catch (error) {
      console.error("Erro ao subir arquivos", error);
      return reply
        .status(500)
        .send({ error: "Ocorreu um erro ao enviar arquivos." });
    }
  });

  fastify.post("/create-all-assistant", async (request, reply) => {
    try {
      const { name, instructions } = request.body as {
        name: string;
        instructions: string;
      };

      const files = request.body.files;

      if (!files || Object.keys(files).length === 0) {
        return reply.status(400).send({ error: "Nenhum arquivo foi enviado" });
      }

      const filePaths = [];
      if (Array.isArray(files)) {
        for (const fileKey in files) {
          const file = files[fileKey];
          const filePath = path.join(__dirname, "../uploads", file.filename);
          const fileBuffer = await file.toBuffer();
          await fs.promises.writeFile(filePath, fileBuffer);
          filePaths.push(filePath);
        }
      } else {
        const file = files;
        const filePath = path.join(__dirname, "../uploads", file.filename);
        const fileBuffer = await file.toBuffer();
        await fs.promises.writeFile(filePath, fileBuffer);
        filePaths.push(filePath);
      }

      const assistant = await createAssistant(name.value, instructions.value);
      if (!assistant.id) {
        return reply.status(500).send({ error: "Erro ao criar assistente" });
      }

      const vectorStore = await uploadFilesToVectorStore(
        `${name.value}-vector-store`,
        filePaths
      );
      if (!vectorStore.id) {
        return reply.status(500).send({ error: "Falha ao criar o vetor" });
      }

      const updatedAssistant = await updateAssistantWithVectorStore(
        assistant.id,
        vectorStore.id
      );
      if (!updatedAssistant.id) {
        return reply.status(500).send({
          error: "Falha ao atualizar o assistente com armazenamento de vetores",
        });
      }

      return reply.status(200).send({
        message: "Assistente criado e atualizado com sucesso",
        assistant: updatedAssistant,
      });
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Erro ao criar assistente com os vetores: ${err}` });
    }
  });
}

export default assistantRoutes;
