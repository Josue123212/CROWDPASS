const request = require("supertest");
const app = require("../src/app");

describe("App base", () => {
  it("responde health check", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("responde 404 para rutas inexistentes", async () => {
    const response = await request(app).get("/ruta-inexistente");

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
