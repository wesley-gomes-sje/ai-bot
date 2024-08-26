import Fastify from "fastify";
import fastifyMultipart from "@fastify/multipart";
import assistantRoutes from "./routes/assistant";

const fastify = Fastify({ logger: true });

fastify.register(fastifyMultipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 1000000,
  },
});

fastify.register(assistantRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log("🔥 Server is listening on http://localhost:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
