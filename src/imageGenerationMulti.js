// src/imageGenerationMulti.js
import { SogniClient } from '@sogni-ai/sogni-client';
import fs from 'fs';
import chalk from 'chalk';

/**
 * Списки для генерации случайных prompt'ов.
 */
const subjects = [
  'dragon', 'cyborg', 'pirate queen', 'ghostly samurai', 
  'dark angel', 'robot assassin', 'shaman warrior', 
  'time traveler', 'shadow elf', 'demon slayer'
];

const actions = [
  'casting ancient magic', 'riding a futuristic motorcycle', 
  'fighting with dual swords', 'playing a mystical flute', 
  'hacking a security system', 'flying through the sky', 
  'meditating under a cherry blossom tree', 'escaping from a burning city', 
  'exploring ancient ruins', 'leading an army of undead'
];

const environments = [
  'in a neon-lit cyber city', 'deep in an enchanted forest', 
  'on a stormy ocean', 'inside a forgotten temple', 
  'on a floating sky island', 'in a post-apocalyptic wasteland', 
  'inside a magical library', 'on a snowy mountain peak', 
  'in an alien spaceship', 'in a medieval battlefield'
];

const moods = [
  'with surreal dream-like aesthetics', 'with vibrant, glowing colors', 
  'in a dark, eerie atmosphere', 'with hyper-realistic details', 
  'in a psychedelic art style', 'with soft, pastel tones', 
  'in a gritty noir setting', 'in a steampunk vibe', 
  'with cinematic lighting', 'with vintage watercolor style'
];

const styles = [
  'anime', 'cyberpunk', 'realistic', 'pixel art', 
  'watercolor painting', '3D render', 'vintage illustration', 'fantasy art'
];

/**
 * Функция для выбора случайного элемента массива.
 */
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Считываем кастомные промты (если есть) из prompts.txt и выбираем случайный.
 * С вероятностью 50% используем кастомный промт, иначе собираем случайный prompt из списков.
 */
function getRandomPrompt() {
  let customPrompts = [];
  try {
    if (fs.existsSync('prompts.txt')) {
      const data = fs.readFileSync('prompts.txt', 'utf-8');
      customPrompts = data.split('\n').map(line => line.trim()).filter(Boolean);
    }
  } catch (error) {
    console.error(chalk.red('Ошибка при чтении prompts.txt:'), error);
  }
  if (customPrompts.length && Math.random() < 0.5) {
    return getRandomElement(customPrompts);
  } else {
    const subject = getRandomElement(subjects);
    const action = getRandomElement(actions);
    const environment = getRandomElement(environments);
    const mood = getRandomElement(moods);
    return `${subject} ${action} ${environment} ${mood}`;
  }
}

/**
 * Функция задержки.
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Генерация одного изображения, используя УЖЕ авторизованный клиент.
 * - Не создаём клиента заново
 * - Не делаем login() заново
 */
async function generateOnceUsingClient(client, accountIndex, iteration) {
  // Ждём, пока библиотека соберёт список доступных моделей
  await client.projects.waitForModels();
  const availableModels = client.projects.availableModels;
  if (!availableModels || availableModels.length === 0) {
    throw new Error('No available models found');
  }

  // Выбираем модель с наибольшим workerCount
  const mostPopularModel = availableModels.reduce((a, b) =>
    a.workerCount > b.workerCount ? a : b
  );

  // Формируем случайный prompt
  const randomPrompt = getRandomPrompt();
  const randomStyle = getRandomElement(styles);

  console.log(chalk.blue(
    `(Акк #${accountIndex}) 🚀 Генерация №${iteration}: "${randomPrompt}" (стиль: "${randomStyle}")`
  ));

  // Создаём проект генерации
  const project = await client.projects.create({
    modelId: mostPopularModel.id,
    disableNSFWFilter: true,
    positivePrompt: randomPrompt,
    negativePrompt: 'malformation, bad anatomy, low quality, jpeg artifacts, watermark',
    stylePrompt: randomStyle,
    steps: 20,
    guidance: 7.5,
    numberOfImages: 1,
  });

  // Логируем прогресс
  project.on('progress', (progress) => {
    console.log(chalk.yellow(`(Акк #${accountIndex}) 📊 Прогресс №${iteration}: ${progress}`));
  });

  // Ожидаем завершения
  const imageUrls = await project.waitForCompletion();
  console.log(chalk.green(
    `(Акк #${accountIndex}) ✅ Изображение №${iteration} готово! URL: ${JSON.stringify(imageUrls)}`
  ));
}

/**
 * Цикл генерации для одного аккаунта:
 * 1) Один раз создаём клиента SogniClient
 * 2) Авторизуемся (login) один раз
 * 3) В бесконечном цикле генерируем изображения, с retry при Timeout
 */
async function generateLoopForAccount(username, password, uuid, accountIndex, proxyUrl) {
  let client;
  // Создаём клиента и авторизуемся один раз
  try {
    if (proxyUrl) {
      process.env.HTTP_PROXY = proxyUrl;
      process.env.HTTPS_PROXY = proxyUrl;
      console.log(chalk.green(`(Акк #${accountIndex}) Используется прокси: ${proxyUrl}`));
    }

    const options = { appId: uuid, network: 'fast' };
    client = await SogniClient.createInstance(options);

    // Авторизация
    await client.account.login(username, password);
    console.log(chalk.green(`(Акк #${accountIndex}) ✅ Авторизация успешна (однократно)!`));

    // Сбрасываем прокси, чтобы не влияло дальше
    if (proxyUrl) {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
    }

  } catch (authError) {
    console.error(chalk.red(`(Акк #${accountIndex}) ❌ Ошибка авторизации: ${authError.message}`));
    return; // Прерываем, если не удалось авторизоваться
  }

  let iteration = 1;
  while (true) {
    let success = false;
    let attempts = 0;
    const maxAttempts = 3;
    while (!success && attempts < maxAttempts) {
      try {
        await generateOnceUsingClient(client, accountIndex, iteration);
        success = true;
      } catch (error) {
        attempts++;
        // Если ошибка - "Timeout waiting for models", делаем retry
        if (error.message.includes('Timeout waiting for models')) {
          console.error(chalk.red(
            `(Акк #${accountIndex}) ❌ Попытка ${attempts} (итерация ${iteration}): Timeout. Повтор через 10 секунд...`
          ));
          await delay(10000);
        } else {
          console.error(chalk.red(
            `(Акк #${accountIndex}) ❌ Ошибка при генерации (итерация ${iteration}): ${error.message}`
          ));
          break;
        }
      }
    }
    if (!success) {
      console.error(chalk.red(
        `(Акк #${accountIndex}) ❌ Превышено число попыток для итерации ${iteration}.`
      ));
    }

    // Случайная задержка между 30 сек и 2 минут
    const randomDelay = Math.floor(Math.random() * (120000 - 30000 + 1)) + 30000;
    console.log(chalk.magenta(
      `(Акк #${accountIndex}) ⏳ Ожидание ${Math.round(randomDelay / 1000)} секунд...`
    ));
    await delay(randomDelay);
    iteration++;
  }
}

/**
 * Основная функция мультиаккаунтной генерации.
 * data.txt: login|password|uuid
 * proxy.txt: прокси по одной на строке (соответственно аккаунтам)
 * Начальная задержка (0..15 сек) для каждого аккаунта, чтобы не стартовать всех сразу.
 */
export async function generateImagesMulti() {
  console.log(chalk.cyan(`\n=== Мультиаккаунтный режим генерации изображений ===\n`));

  let accountLines;
  try {
    const rawData = fs.readFileSync('data.txt', 'utf-8');
    accountLines = rawData.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.log(chalk.red('Ошибка: файл data.txt пуст или не найден.'));
    return;
  }

  let proxies = [];
  try {
    const rawProxies = fs.readFileSync('proxy.txt', 'utf-8');
    proxies = rawProxies.trim().split('\n').map(line => line.trim()).filter(Boolean);
    if (proxies.length) {
      console.log(chalk.green(`Найдено ${proxies.length} прокси.`));
    } else {
      console.log(chalk.yellow('Прокси не найдены, используется прямое соединение.'));
    }
  } catch (error) {
    console.log(chalk.yellow('Файл proxy.txt не найден, используется прямое соединение.'));
  }

  const promises = accountLines.map(async (line, index) => {
    const [username, password, uuid] = line.trim().split('|');
    if (!username || !password || !uuid) {
      console.log(chalk.red(`Строка #${index + 1} неверный формат: ${line}`));
      return;
    }

    const proxyUrl = proxies[index] || null;
    // Случайная задержка 0..15 сек, чтобы не стартовать всех разом
    const initialDelay = Math.floor(Math.random() * 15000);
    console.log(chalk.magenta(
      `(Акк #${index + 1}) Начальная задержка: ${(initialDelay / 1000).toFixed(2)} сек.`
    ));
    await delay(initialDelay);

    // Запускаем бесконечную генерацию с одним клиентом (и одной авторизацией)
    return generateLoopForAccount(username, password, uuid, index + 1, proxyUrl);
  });

  await Promise.all(promises);
}
