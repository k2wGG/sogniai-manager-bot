// src/imageGenerationMulti.js
import { SogniClient } from '@sogni-ai/sogni-client';
import fs from 'fs';
import chalk from 'chalk';

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

/** Выбор случайного элемента */
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Генерация случайного prompt */
function getRandomPrompt() {
  let customPrompts = [];
  try {
    if (fs.existsSync('prompts.txt')) {
      const data = fs.readFileSync('prompts.txt', 'utf-8');
      customPrompts = data.split('\n').map(line => line.trim()).filter(line => line);
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

/** Функция задержки */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Генерация изображения для одного аккаунта, с учётом прокси (если указано).
 */
async function generateOnce(username, password, uuid, accountIndex, iteration, proxyUrl = null) {
  if (proxyUrl) {
    process.env.HTTP_PROXY = proxyUrl;
    process.env.HTTPS_PROXY = proxyUrl;
    console.log(chalk.green(`(Акк #${accountIndex}) Используется прокси: ${proxyUrl}`));
  }

  const options = { appId: uuid, network: 'fast' };
  const client = await SogniClient.createInstance(options);
  await client.account.login(username, password);
  console.log(chalk.green(`(Акк #${accountIndex}) ✅ Авторизация успешна! (итерация ${iteration})`));

  await client.projects.waitForModels();
  const mostPopularModel = client.projects.availableModels.reduce((a, b) =>
    a.workerCount > b.workerCount ? a : b
  );

  const randomPrompt = getRandomPrompt();
  const randomStyle = getRandomElement(styles);
  console.log(chalk.blue(`(Акк #${accountIndex}) 🚀 Генерация №${iteration}: "${randomPrompt}" (стиль: "${randomStyle}")`));

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

  project.on('progress', (progress) => {
    console.log(chalk.yellow(`(Акк #${accountIndex}) 📊 Прогресс №${iteration}: ${progress}`));
  });

  const imageUrls = await project.waitForCompletion();
  console.log(chalk.green(`(Акк #${accountIndex}) ✅ Изображение №${iteration} готово! URL: ${JSON.stringify(imageUrls)}`));

  // Удаляем/комментируем метод, которого нет в библиотеке
  // client.disconnect();

  // Сбрасываем прокси
  if (proxyUrl) {
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
  }
}

/**
 * Бесконечный цикл генерации изображений для одного аккаунта.
 */
async function generateLoopForAccount(username, password, uuid, accountIndex, proxyUrl = null) {
  let iteration = 1;
  while (true) {
    try {
      await generateOnce(username, password, uuid, accountIndex, iteration, proxyUrl);
    } catch (error) {
      console.error(chalk.red(`(Акк #${accountIndex}) ❌ Ошибка при генерации (итерация ${iteration}): ${error.message}`));
    }
    const randomDelay = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
    console.log(chalk.magenta(`(Акк #${accountIndex}) ⏳ Ожидание ${Math.round(randomDelay / 1000)} секунд перед следующей генерацией...`));
    await delay(randomDelay);
    iteration++;
  }
}

/**
 * Основная функция мультиаккаунтной генерации изображений.
 * Каждая строка data.txt: login|password|uuid
 * Если в proxy.txt есть строки, каждая соответствует аккаунту.
 */
export async function generateImagesMulti() {
  console.log(chalk.cyan(`\n=== Мультиаккаунтный режим генерации изображений ===\n`));

  // Читаем аккаунты из data.txt
  const rawData = fs.readFileSync('data.txt', 'utf-8');
  const accountLines = rawData.trim().split('\n');
  if (!accountLines.length) {
    console.log(chalk.red('Ошибка: файл data.txt пуст или не найден.'));
    return;
  }

  // Читаем прокси (если есть)
  let proxies = [];
  try {
    const rawProxies = fs.readFileSync('proxy.txt', 'utf-8');
    proxies = rawProxies.trim().split('\n').map(line => line.trim()).filter(line => line);
    if (proxies.length) {
      console.log(chalk.green(`Найдено ${proxies.length} прокси.`));
    } else {
      console.log(chalk.yellow('Прокси не найдены, используется прямое соединение.'));
    }
  } catch (error) {
    console.log(chalk.yellow('Файл proxy.txt не найден, используется прямое соединение.'));
  }

  const promises = accountLines.map((line, index) => {
    const [username, password, uuid] = line.trim().split('|');
    if (!username || !password || !uuid) {
      console.log(chalk.red(`Строка #${index + 1} имеет неверный формат: ${line}`));
      return Promise.resolve();
    }
    // Если для данного аккаунта есть прокси, используем его
    const proxyUrl = proxies[index] ? proxies[index] : null;
    return generateLoopForAccount(username, password, uuid, index + 1, proxyUrl);
  });

  await Promise.all(promises);
}