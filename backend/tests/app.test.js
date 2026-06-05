const request = require("supertest");
const app = require("../src/app");

describe("App base", () => {
  it("responde health check", async () => {
    const response = await request(app).get("/api/health");

    expect([200, 503]).toContain(response.statusCode);

    if (response.statusCode === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("ok");
      return;
    }

    expect(response.body.success).toBe(false);
  });

  it("responde 404 para rutas inexistentes", async () => {
    const response = await request(app).get("/ruta-inexistente");

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
