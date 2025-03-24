import { promises as fs } from 'fs';
import inquirer from 'inquirer';
import chalk from 'chalk';

const CONFIG_FILE = 'src/config.json';

/**
 * Функция для настройки задержек через интерфейс.
 * Позволяет задать минимальную и максимальную задержки между итерациями
 * и максимальную начальную задержку для аккаунта.
 */
export async function updateDelayConfig() {
  try {
    // Читаем текущую конфигурацию
    let config;
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      config = JSON.parse(data);
    } catch (e) {
      config = { minDelay: 30000, maxDelay: 120000, initialDelayMax: 50000};
    }
    // Запрашиваем у пользователя новые значения
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'minDelay',
        message: 'Введите минимальную задержку между итерациями (в миллисекундах):',
        default: config.minDelay
      },
      {
        type: 'input',
        name: 'maxDelay',
        message: 'Введите максимальную задержку между итерациями (в миллисекундах):',
        default: config.maxDelay
      },
      {
        type: 'input',
        name: 'initialDelayMax',
        message: 'Введите максимальную начальную задержку (в миллисекундах):',
        default: config.initialDelayMax
      }
    ]);
    // Сохраняем конфигурацию
    const newConfig = {
      minDelay: parseInt(answers.minDelay),
      maxDelay: parseInt(answers.maxDelay),
      initialDelayMax: parseInt(answers.initialDelayMax)
    };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    console.log(chalk.green('Конфигурация задержек успешно обновлена.'));
  } catch (error) {
    console.error(chalk.red('Ошибка обновления конфигурации:'), error.message);
  }
}