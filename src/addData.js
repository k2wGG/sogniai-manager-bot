// src/addData.js
import fs from 'fs/promises';
import inquirer from 'inquirer';
import chalk from 'chalk';

const DATA_FILE = 'data.txt';
const PROMPTS_FILE = 'prompts.txt';
const TOKEN_FILE = 'token.txt';
const PROXY_FILE = 'proxy.txt';

/**
 * Добавление новых данных для генерации изображений (login|password|uuid)
 */
export async function addAccountData() {
  const { login, password, uuid } = await inquirer.prompt([
    { type: 'input', name: 'login', message: 'Введите логин (например, user@example.com):' },
    { type: 'password', name: 'password', message: 'Введите пароль:' },
    { type: 'input', name: 'uuid', message: 'Введите UUID:' }
  ]);

  // Используем \r\n для корректного переноса строк в Windows
  const line = `${login.trim()}|${password.trim()}|${uuid.trim()}\r\n`;
  try {
    await fs.appendFile(DATA_FILE, line);
    console.log(chalk.green('Новые данные для генерации изображений успешно добавлены.'));
  } catch (error) {
    console.error(chalk.red('Ошибка записи в файл data.txt:'), error);
  }
}

/**
 * Добавление нового кастомного промта в prompts.txt.
 */
export async function addCustomPrompt() {
  const { promptText } = await inquirer.prompt([
    { type: 'input', name: 'promptText', message: 'Введите новый промт:' }
  ]);
  const line = promptText.trim() + '\r\n';
  try {
    await fs.appendFile(PROMPTS_FILE, line);
    console.log(chalk.green('Новый промт успешно добавлен.'));
  } catch (error) {
    console.error(chalk.red('Ошибка записи в файл prompts.txt:'), error);
  }
}

/**
 * Добавление новых токенов для ежедневного клейма.
 * Новые токены вводятся через запятую, затем записываются в token.txt,
 * каждый токен – на отдельной строке.
 */
export async function addTokens() {
  const { tokens } = await inquirer.prompt([
    { type: 'input', name: 'tokens', message: 'Введите новые токены (через запятую):' }
  ]);
  const tokensArray = tokens.split(',').map(t => t.trim()).filter(t => t);
  // Создаем строку с переводами строк для каждого токена
  const newTokensText = tokensArray.join('\r\n') + '\r\n';
  
  try {
    // Читаем текущие данные из TOKEN_FILE, если файл существует
    let currentData = '';
    try {
      currentData = await fs.readFile(TOKEN_FILE, 'utf-8');
    } catch (readError) {
      // Если файла нет, будем его создавать
    }
    // Если файл не пуст и не заканчивается на перевод строки, добавляем его
    if (currentData && !currentData.endsWith('\n') && !currentData.endsWith('\r\n')) {
      currentData += '\r\n';
    }
    // Записываем обратно существующие данные + новые токены
    await fs.writeFile(TOKEN_FILE, currentData + newTokensText, 'utf-8');
    console.log(chalk.green('Новые токены успешно добавлены.'));
  } catch (error) {
    console.error(chalk.red('Ошибка записи в файл token.txt:'), error);
  }
}

/**
 * Добавление новых прокси.
 */
export async function addProxies() {
  const { proxies } = await inquirer.prompt([
    { type: 'input', name: 'proxies', message: 'Введите новые прокси (через запятую):' }
  ]);
  const proxiesArray = proxies.split(',').map(p => p.trim()).filter(p => p);
  const text = proxiesArray.join('\r\n') + '\r\n';
  try {
    await fs.appendFile(PROXY_FILE, text);
    console.log(chalk.green('Новые прокси успешно добавлены.'));
  } catch (error) {
    console.error(chalk.red('Ошибка записи в файл proxy.txt:'), error);
  }
}