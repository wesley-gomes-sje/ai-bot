import OpenAI from "openai";
import fs from "fs";

import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function createAssistant(name: string, instructions: string) {
  try {
    // const file = await openai.files.create({
    //   file: fs.createReadStream("./src/utils/file.json"),
    //   purpose: "assistants",
    // });

    const assistant = await openai.beta.assistants.create({
      name,
      instructions,
      tools: [{ type: "file_search" }],
      // tools: [{ type: "code_interpreter" }],
      // tool_resources: {
      //   code_interpreter: {
      //     file_ids: [file.id],
      //   },
      // },
      tool_resources: {
        file_search: {
          vector_store_ids: ["vs_iLVbZBcdEillPUpYHUrskX9U"],
        },
      },
      model: "gpt-4o",
    });

    return assistant;
  } catch (error) {
    console.error("Erro ao criar o assistente:", error);
  }
}

export async function createThread() {
  try {
    const thread = await openai.beta.threads.create();
    return thread;
  } catch (error) {
    console.error("Erro ao criar o tópico:", error);
  }
}

export async function addMessageToThread(threadId: string, content: string) {
  console.log("threadId", threadId);
  console.log("content", content);

  try {
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: content,
    });
    return message;
  } catch (error) {
    console.error("Erro ao adicionar a mensagem ao tópico:", error);
  }
}

export async function streamRun(threadId: string, assistantId: string) {
  try {
    const run = openai.beta.threads.runs
      .stream(threadId, {
        assistant_id: assistantId,
      })
      .on("textCreated", (text) => process.stdout.write("\nassistant > "))
      .on("textDelta", (textDelta, snapshot) =>
        process.stdout.write(textDelta.value)
      )
      .on("toolCallCreated", (toolCall) =>
        process.stdout.write(`\nassistant > ${toolCall.type}\n\n`)
      )
      .on("toolCallDelta", (toolCallDelta, snapshot) => {
        if (toolCallDelta.type === "code_interpreter") {
          if (toolCallDelta.code_interpreter.input) {
            process.stdout.write(toolCallDelta.code_interpreter.input);
          }
          if (toolCallDelta.code_interpreter.outputs) {
            process.stdout.write("\noutput >\n");
            toolCallDelta.code_interpreter.outputs.forEach((output) => {
              if (output.type === "logs") {
                process.stdout.write(`\n${output.logs}\n`);
              }
            });
          }
        }
      });

    return run;
  } catch (error) {
    console.error("Erro ao executar o streaming:", error);
    throw new Error("Falha ao executar o streaming");
  }
}

export async function uploadJsonTrainingData(filePath: string) {
  console.log("filePath", filePath);

  try {
    const fileStream = fs.createReadStream(filePath);

    const file = await openai.files.create({
      file: fileStream,
      purpose: "assistants",
    });

    console.log("Arquivo JSON enviado com sucesso:", file);

    // const newVector = await openai.beta.vectorStores.create({
    //   name: "Suporte Vetor Teste IA com arquivo JSON",
    //   file_ids: [file.id],
    // });

    return file;
  } catch (err) {
    console.error("Erro ao enviar o arquivo JSON:", err);
  }
}

export async function createVector(nameVector: string) {
  try {
    const vector = await openai.beta.vectorStores.create({
      name: nameVector,
    });
    return vector;
  } catch (err) {
    console.error("Erro ao criar o vetor:", err);
  }
}
