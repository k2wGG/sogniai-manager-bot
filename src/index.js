// src/index.js
import inquirer from 'inquirer';
import chalk from 'chalk';
import { multiCheckAndClaim } from './dailyClaim.js';
import { generateImagesMulti } from './imageGenerationMulti.js';
import { addAccountData, addCustomPrompt, addTokens, addProxies } from './addData.js';
import { updateDelayConfig } from './addConfig.js';

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
		type: 'rawlist',
		name: 'choice',
		message: 'Выберите действие:',
		pageSize: 10, // здесь указываем нужное количество строк, например, 10
		choices: [
		  { name: 'Ежедневный клейм (Daily Claim)', value: 'claim' },
		  { name: 'Генерация изображений (мультиаккаунт)', value: 'generate' },
		  { name: 'Добавить данные (login|password|uuid)', value: 'addAccount' },
		  { name: 'Добавить новые промты', value: 'addPrompt' },
		  { name: 'Добавить токены (ежедневный клейм)', value: 'addTokens' },
		  { name: 'Добавить прокси', value: 'addProxies' },
		  { name: 'Обновить конфигурацию задержек', value: 'updateDelay' },
		  { name: 'Выход', value: 'exit' }
		]
	  }
	]);


    switch (choice) {
      case 'claim':
        console.log(chalk.green('Запуск режима ежедневного клейма...'));
        multiCheckAndClaim();
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
      case 'updateDelay':
        await updateDelayConfig();
        break;
      case 'exit':
        console.log(chalk.green('Выход из программы.'));
        process.exit(0);
      default:
        console.log(chalk.red('Неверный пункт меню.'));
    }

    await inquirer.prompt([
      { type: 'input', name: 'continue', message: 'Нажмите Enter для возврата в меню...' }
    ]);
    showBanner();
  }
}

mainMenu().catch(error => {
  console.error(chalk.red('Критическая ошибка:'), error);
});