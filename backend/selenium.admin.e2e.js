const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const HEADLESS = process.env.HEADLESS !== "false";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function buildChromeOptions() {
  const options = new chrome.Options();
  if (HEADLESS) {
    options.addArguments("--headless=new");
  }
  options.addArguments("--window-size=1280,900");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-gpu");
  options.addArguments("--no-first-run");
  options.addArguments("--no-default-browser-check");
  options.addArguments("--disable-background-networking");
  options.addArguments("--disable-sync");
  options.addArguments("--disable-default-apps");
  return options;
}

async function waitVisible(driver, locator, timeoutMs = 20000) {
  const element = await driver.wait(until.elementLocated(locator), timeoutMs);
  await driver.wait(until.elementIsVisible(element), timeoutMs);
  return element;
}

async function setInputValue(driver, locator, value, timeoutMs = 20000) {
  const input = await waitVisible(driver, locator, timeoutMs);
  await input.click();
  await input.sendKeys(Key.chord(Key.CONTROL, "a"));
  await input.sendKeys(Key.BACK_SPACE);
  await input.sendKeys(String(value));
}

async function clickByButtonText(driver, text, timeoutMs = 20000) {
  const locator = By.xpath(`//button[normalize-space(.)='${text}']`);
  const element = await waitVisible(driver, locator, timeoutMs);
  await driver.wait(until.elementIsEnabled(element), Math.min(timeoutMs, 8000));
  await element.click();
}

async function loginAsAdmin(driver) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Faltan credenciales: define ADMIN_EMAIL y ADMIN_PASSWORD para ejecutar la prueba de admin.");
  }

  await driver.get(`${FRONTEND_URL}/login`);
  await driver.wait(until.urlContains("/login"), 25000);
  await waitVisible(driver, By.css("input[name='email']"), 25000);
  await setInputValue(driver, By.css("input[name='email']"), ADMIN_EMAIL);
  await setInputValue(driver, By.css("input[name='password']"), ADMIN_PASSWORD);
  await clickByButtonText(driver, "Ingresar", 45000);
  await driver.wait(async () => {
    const url = await driver.getCurrentUrl().catch(() => "");
    return !url.includes("/login");
  }, 45000);
  await driver.wait(until.urlContains("/admin/"), 45000);
}

async function run() {
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(buildChromeOptions()).build();

  try {
    await loginAsAdmin(driver);

    await driver.get(`${FRONTEND_URL}/admin/events`);
    await waitVisible(driver, By.xpath("//h2[normalize-space(.)='Gestion de eventos']"), 30000);

    await driver.get(`${FRONTEND_URL}/admin/users`);
    await waitVisible(driver, By.xpath("//h2[normalize-space(.)='Gestion de usuarios y aprobaciones']"), 30000);

    await driver.get(`${FRONTEND_URL}/admin/events/catalog`);
    await waitVisible(driver, By.xpath("//h2[normalize-space(.)='Catalogo de eventos']"), 30000);

    process.stdout.write("Selenium E2E (admin) completado OK.\n");
  } finally {
    await driver.quit();
  }
}

run().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exit(1);
});
