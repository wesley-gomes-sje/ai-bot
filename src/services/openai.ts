import OpenAI from "openai";
import fs from "fs";

import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function createAssistant(name: string, instructions: string) {
  try {
    const assistant = await openai.beta.assistants.create({
      name,
      instructions,
      tools: [{ type: "file_search" }],
      model: "gpt-4o",
    });
    return assistant;
  } catch (error) {
    return `Erro ao criar o assistente: ${error}`;
  }
}

export async function uploadFilesToVectorStore(
  nameVector: string,
  filePaths: string[]
) {
  const fileStreams = filePaths.map((filePath: string) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.createReadStream(filePath);
  });

  let vectorStore = await openai.beta.vectorStores.create({
    name: nameVector,
  });

  await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, {
    files: fileStreams,
  });

  return vectorStore;
}

export async function updateAssistantWithVectorStore(
  assistantId: string,
  vectorStoreId: string
) {
  try {
    const assistant = await openai.beta.assistants.update(assistantId, {
      tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
    });

    return assistant;
  } catch (error) {
    return `Erro ao atualizar o assistente: ${error}`;
  }
}

export async function handleUserMessageWithAttachment(
  filePath: string,
  message: string
) {
  try {
    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: "assistants",
    });

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: message,
          attachments: [
            {
              file_id: uploadedFile.id,
              tools: [{ type: "file_search" }],
            },
          ],
        },
      ],
    });

    return thread;
  } catch (err) {
    return `Erro ao lidar com a mensagem do usuário: ${err}`;
  }
}

export async function streamRun(threadId: string, assistantId: string) {
  try {
    const stream = openai.beta.threads.runs
      .stream(threadId, {
        assistant_id: assistantId,
      })
      .on("textCreated", () => console.log("assistant >"))
      .on("toolCallCreated", (event) => console.log("assistant " + event.type))
      .on("messageDone", async (event) => {
        if (event.content[0].type === "text") {
          const { text } = event.content[0];
          const { annotations } = text;
          const citations: string[] = [];

          let index = 0;
          for (let annotation of annotations) {
            text.value = text.value.replace(annotation.text, "[" + index + "]");
            const { file_citation } = annotation;
            if (file_citation) {
              const citedFile = await openai.files.retrieve(
                file_citation.file_id
              );
              citations.push("[" + index + "]" + citedFile.filename);
            }
            index++;
          }

          console.log(text.value);
          console.log(citations.join("\n"));
        }
      });

    return stream;
  } catch (err) {
    return `Erro ao executar o stream: ${err}`;
  }
}

export async function uploadJsonTrainingData(filePath: string) {
  try {
    const fileStream = fs.createReadStream(filePath);

    const file = await openai.files.create({
      file: fileStream,
      purpose: "assistants",
    });

    return file;
  } catch (err) {
    return `Erro ao enviar o arquivo JSON:: ${err}`;
  }
}

export async function createThread() {
  try {
    const thread = await openai.beta.threads.create();
    return thread;
  } catch (error) {
    return `Erro ao criar o tópico: ${error}`;
  }
}

export async function addMessageToThread(threadId: string, content: string) {
  try {
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: content,
    });
    return message;
  } catch (error) {
    return `Erro ao adicionar mensagem ao tópico: ${error}`;
  }
}

export async function createVector(nameVector: string) {
  try {
    const vector = await openai.beta.vectorStores.create({
      name: nameVector,
    });

    return vector;
  } catch (err) {
    return `Erro ao criar o vetor: ${err}`;
  }
}
