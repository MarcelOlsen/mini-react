import { Elysia } from "elysia";

const PORT = Number(process.env.PORT) || 3000;

const app = new Elysia()
	.get("/app.js", async () => {
		const file = Bun.file("./public/app.js");
		return new Response(file, {
			headers: {
				"Content-Type": "application/javascript; charset=utf-8",
				"Cache-Control": "public, max-age=3600",
			},
		});
	})
	.get("/", async () => {
		const file = Bun.file("./src/templates/index.html");
		return new Response(file, {
			headers: {
				"Content-Type": "text/html",
			},
		});
	})
	.listen(PORT);

console.log(
	`🚀 MiniReact Showcase running at http://${app.server?.hostname}:${app.server?.port}`,
);
