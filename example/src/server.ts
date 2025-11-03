import { Elysia } from "elysia";

const PORT = Number(process.env.PORT) || 3000;

const app = new Elysia()
	.get("/app.js", () => {
		const file = Bun.file("./public/app.js");
		return new Response(file, {
			headers: {
				"Content-Type": "application/javascript; charset=utf-8",
				"Cache-Control": "public, max-age=3600",
			},
		});
	})
	.get("/", () => {
		const file = Bun.file("./src/templates/index.html");
		const headers: Record<string, string> = {
			"Content-Type": "text/html",
		};

		// Add caching in production
		if (process.env.NODE_ENV === "production") {
			headers["Cache-Control"] = "public, max-age=3600";
		}

		return new Response(file, { headers });
	})
	.listen(PORT);

console.log(
	`🚀 MiniReact Showcase running at http://${app.server?.hostname}:${app.server?.port}`,
);
