// src/index.js
import inquirer from 'inquirer';
import chalk from 'chalk';
import { multiCheckAndClaim } from './dailyClaim.js';
import { generateImagesMulti } from './imageGenerationMulti.js';
import { addAccountData, addCustomPrompt, addTokens, addProxies } from './addData.js';

function showBanner() {
  console.clear();
  console.log(chalk.yellow(`
        _   _           _  _____      
       | \\ | |         | ||____ |     
       |  \\| | ___   __| |    / /_ __ 
       | . \` |/ _ \\ / _\` |    \\ \\ '__|
       | |\\  | (_) | (_| |.___/ / |   
       \\_| \\_/\\___/ \\__,_|\\____/|_|   
                                     
      SongoAI Manager Bot — скрипт для автоматики 
      TG: @Nod3r
  `));
}

async function mainMenu() {
  showBanner();
  while (true) {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Выберите действие:',
        choices: [
          { name: '1) Ежедневный клейм (Daily Claim)', value: 'claim' },
          { name: '2) Генерация изображений (мультиаккаунт)', value: 'generate' },
          { name: '3) Добавить данные (login|password|uuid)', value: 'addAccount' },
          { name: '4) Добавить новые промты', value: 'addPrompt' },
          { name: '5) Добавить токены (ежедневный клейм)', value: 'addTokens' },
          { name: '6) Добавить прокси', value: 'addProxies' },
          { name: '0) Выход', value: 'exit' }
        ]
      }
    ]);

    switch (choice) {
      case 'claim':
        console.log(chalk.green('Запуск режима ежедневного клейма...'));
        // Если этот режим является бесконечным, меню не вернётся, поэтому можно сообщить пользователю
        multiCheckAndClaim();
        // Если вы хотите одноразовую проверку, замените на соответствующую функцию
        break;
      case 'generate':
        console.log(chalk.green('Запуск мультиаккаунтной генерации изображений...'));
        await generateImagesMulti();
        break;
      case 'addAccount':
        await addAccountData();
        break;
      case 'addPrompt':
        await addCustomPrompt();
        break;
      case 'addTokens':
        await addTokens();
        break;
      case 'addProxies':
        await addProxies();
        break;
      case 'exit':
        console.log(chalk.green('Выход из программы.'));
        process.exit(0);
      default:
        console.log(chalk.red('Неверный пункт меню.'));
    }

    // После выполнения выбранного действия ждем подтверждения, чтобы пользователь видел результат, и затем возвращаемся в меню
    await inquirer.prompt([
      { type: 'input', name: 'continue', message: 'Нажмите Enter для возврата в меню...' }
    ]);
    showBanner();
  }
}

mainMenu().catch(error => {
  console.error(chalk.red('Критическая ошибка:'), error);
});