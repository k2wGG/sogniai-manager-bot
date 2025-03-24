// src/dailyClaim.js
import { promises as fs } from 'fs';
import axios from 'axios';
import chalk from 'chalk';

const TOKEN_FILE = 'token.txt';
const CLAIM_ENDPOINT = 'https://api.sogni.ai/v2/account/reward/claim';
const REWARD_ENDPOINT = 'https://api.sogni.ai/v2/account/rewards';
const DAILY_BOOST_ID = '2';
const CHECK_INTERVAL_MINUTES = 60;
const CHECK_INTERVAL_MS = CHECK_INTERVAL_MINUTES * 60 * 1000;

/**
 * Чтение всех токенов из файла token.txt.
 * Каждая строка должна содержать один токен.
 */
async function getAllTokens() {
  try {
    const data = await fs.readFile(TOKEN_FILE, 'utf8');
    const tokens = data.split('\n').map(line => line.trim()).filter(Boolean);
    return tokens;
  } catch (error) {
    console.error(chalk.red('Ошибка чтения файла с токенами:'), error.message);
    process.exit(1);
  }
}

/**
 * Проверка статуса ежедневного бонуса для одного токена.
 */
async function checkRewardStatus(token) {
  try {
    const response = await axios.get(REWARD_ENDPOINT, {
      headers: {
        'accept': '*/*',
        'authorization': token,
        'content-type': 'application/json',
        'Referer': 'https://app.sogni.ai/',
      }
    });

    if (response.data.status === 'success') {
      const rewards = response.data.data.rewards;
      const dailyBoost = rewards.find(reward => reward.id === DAILY_BOOST_ID);
      
      if (dailyBoost && dailyBoost.canClaim === 1) {
        return true;
      }
      
      if (dailyBoost && dailyBoost.lastClaimTimestamp && dailyBoost.claimResetFrequencySec) {
        const nextAvailableTime = (dailyBoost.lastClaimTimestamp + dailyBoost.claimResetFrequencySec) * 1000;
        const timeUntilAvailable = nextAvailableTime - Date.now();
        
        if (timeUntilAvailable > 0) {
          const hours = Math.floor(timeUntilAvailable / (60 * 60 * 1000));
          const minutes = Math.floor((timeUntilAvailable % (60 * 60 * 1000)) / (60 * 1000));
          console.log(`[${new Date().toISOString()}] Токен (****${token.slice(-6)}) — следующий бонус через ${hours} ч ${minutes} м`);
        }
      }
    }
    return false;
  } catch (error) {
    console.error(chalk.red(`[${new Date().toISOString()}] Ошибка проверки бонуса (токен: ****${token.slice(-6)}):`), error.message);
    if (error.response) {
      console.error(chalk.red('Статус ответа:'), error.response.status);
      console.error(chalk.red('Данные ответа:'), error.response.data);
    }
    return false;
  }
}

/**
 * Получение ежедневного бонуса для одного токена.
 */
async function claimDailyBoost(token) {
  try {
    const response = await axios.post(
      CLAIM_ENDPOINT, 
      { claims: [DAILY_BOOST_ID] },
      {
        headers: {
          'accept': '*/*',
          'authorization': token,
          'content-type': 'application/json',
          'Referer': 'https://app.sogni.ai/',
        }
      }
    );

    if (response.data.status === 'success') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Токен (****${token.slice(-6)}) — бонус успешно получен!`);
      return true;
    } else {
      console.error(`[${new Date().toISOString()}] Токен (****${token.slice(-6)}) — не удалось получить бонус:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ошибка при получении бонуса (токен: ****${token.slice(-6)}):`, error.message);
    if (error.response) {
      console.error(chalk.red('Статус ответа:'), error.response.status);
      console.error(chalk.red('Данные ответа:'), error.response.data);
    }
    return false;
  }
}

/**
 * Мультиаккаунтная функция: для каждого токена из token.txt проверяет, доступен ли бонус,
 * и если доступен – выполняет клейм. После обработки всех токенов функция запускается повторно через CHECK_INTERVAL_MS.
 */
export async function multiCheckAndClaim() {
  const tokens = await getAllTokens();
  if (!tokens.length) {
    console.log(chalk.red('Нет доступных токенов.'));
    return;
  }

  for (const token of tokens) {
    const isClaimable = await checkRewardStatus(token);
    if (isClaimable) {
      await claimDailyBoost(token);
    } else {
      console.log(`[${new Date().toISOString()}] Токен (****${token.slice(-6)}) — бонус пока недоступен.`);
    }
  }

  // Запускаем повторную проверку через CHECK_INTERVAL_MS
  setTimeout(multiCheckAndClaim, CHECK_INTERVAL_MS);
}